<?php

namespace App\Http\Controllers;

use App\Models\Cuadrilla;
use App\Models\NotificacionEmitida;
use App\Models\User;
use App\Services\NotificacionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificacionController extends Controller
{
    public function __construct(private NotificacionService $notificacionService) {}

    public function index()
    {
        $user = Auth::user();

        $notificaciones = NotificacionEmitida::with([
            'administrador:id,nombre_completo,rol',
            'canceladaPor:id,nombre_completo',
        ])
            ->withCount([
                'destinatarios as leidos_count' => fn ($q) => $q->whereNotNull('leido_en'),
            ])
            ->orderByDesc('created_at')
            ->take(100)
            ->get();

        // Catálogos para los selectores de segmentación
        $nodos = User::whereNotNull('zona_geografica_establecimient')
            ->where('zona_geografica_establecimient', '!=', '')
            ->distinct()
            ->pluck('zona_geografica_establecimient')
            ->values();

        $roles = User::whereIn('rol', ['Operario', 'Supervisor'])
            ->distinct()
            ->pluck('rol')
            ->values();

        $cuadrillas = Cuadrilla::select('id_cuadrilla', 'nombre_cuadrilla', 'labor_asociada')
            ->where('estado', '!=', 'Borrador')
            ->orderBy('nombre_cuadrilla')
            ->get();

        $colaboradores = User::whereIn('rol', ['Operario', 'Supervisor'])
            ->select('id', 'nombre_completo', 'legajo', 'dni', 'zona_geografica_establecimient', 'estado_operativo')
            ->orderBy('nombre_completo')
            ->get();

        return Inertia::render('notificaciones/index', [
            'notificacionesIniciales' => $notificaciones,
            'catalogos' => [
                'nodos' => $nodos,
                'roles' => $roles,
                'cuadrillas' => $cuadrillas,
                'colaboradores' => $colaboradores,
            ],
            'adminActual' => [
                'id' => $user->id,
                'nombre_completo' => $user->nombre_completo,
                'rol' => $user->rol,
            ],
        ]);
    }

    /**
     * Endpoint en vivo para el contador de alcance antes de enviar/programar.
     */
    public function previewAlcance(Request $request)
    {
        $filtros = $request->validate([
            'tipo_segmento'   => 'required|in:todos,nodo,rol,cuadrilla,estado,especificos',
            'nodo'            => 'nullable|string',
            'rol'             => 'nullable|string',
            'cuadrilla_id'    => 'nullable|integer',
            'estado_curso'    => 'nullable|in:bloqueados,atrasados',
            'usuarios_ids'    => 'nullable|array',
            'usuarios_ids.*'  => 'integer',
        ]);

        $resultado = self::resolverDestinatarios($filtros);

        return response()->json([
            'activos'        => $resultado['activos']->count(),
            'excluidos'      => $resultado['excluidos_count'],
            'sin_fcm_token'  => $resultado['activos']->whereNull('fcm_token')->count(),
            'etiqueta'       => $resultado['etiqueta'],
        ]);
    }

    /**
     * Registra y despacha (o programa) una nueva notificación manual.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'titulo'           => 'required|string|max:80',
            'mensaje'          => 'required|string|max:500',
            'tipo_segmento'    => 'required|in:todos,nodo,rol,cuadrilla,estado,especificos',
            'nodo'             => 'nullable|string',
            'rol'              => 'nullable|string',
            'cuadrilla_id'     => 'nullable|integer',
            'estado_curso'     => 'nullable|in:bloqueados,atrasados',
            'usuarios_ids'     => 'nullable|array',
            'usuarios_ids.*'   => 'integer',
            'es_critica'       => 'boolean',
            'modo_envio'       => 'required|in:ahora,programar',
            'fecha_programada' => 'nullable|required_if:modo_envio,programar|date|after:now',
        ]);

        // Verificación de permiso para Alerta Crítica (Push + Email de respaldo)
        $esCritica = (bool) ($validated['es_critica'] ?? false);
        if ($esCritica && $user->rol !== 'SuperAdmin' && !$user->can('enviar_notificacion_critica')) {
            return back()->withErrors([
                'es_critica' => 'No tienes permiso para emitir alertas críticas con correo de respaldo.',
            ]);
        }

        $filtros = [
            'tipo_segmento' => $validated['tipo_segmento'],
            'nodo'          => $validated['nodo'] ?? null,
            'rol'           => $validated['rol'] ?? null,
            'cuadrilla_id'  => $validated['cuadrilla_id'] ?? null,
            'estado_curso'  => $validated['estado_curso'] ?? null,
            'usuarios_ids'  => $validated['usuarios_ids'] ?? [],
        ];

        $alcance = self::resolverDestinatarios($filtros);

        if ($validated['modo_envio'] === 'ahora' && $alcance['activos']->isEmpty()) {
            return back()->withErrors([
                'tipo_segmento' => 'No hay colaboradores activos que coincidan con este segmento.',
            ]);
        }

        $fechaProgramada = $validated['modo_envio'] === 'programar'
            ? Carbon::parse($validated['fecha_programada'])
            : null;

        $this->notificacionService->emitir([
            'id_usuario'        => $user->id,
            'tipo_origen'       => 'Manual',
            'evento_disparador' => 'manual',
            'titulo'            => $validated['titulo'],
            'mensaje'           => $validated['mensaje'],
            'fecha_programada'  => $fechaProgramada,
            'enviado_push'      => true,
            'enviado_email'     => $esCritica,
            'segmento_destino'  => $alcance['etiqueta'],
            'filtros_json'      => $filtros,
        ], $alcance['activos']);

        $mensajeExito = $fechaProgramada
            ? "Notificación programada para el {$fechaProgramada->format('d/m/Y H:i')} hs."
            : "Notificación enviada a {$alcance['activos']->count()} colaborador(es) activo(s).";

        return redirect()->route('notificaciones.index')->with('success', $mensajeExito);
    }

    /**
     * Cancela una notificación que todavía está en estado Programada.
     */
    public function cancelar($id_notificacion)
    {
        $user = Auth::user();
        $notificacion = NotificacionEmitida::findOrFail($id_notificacion);

        if ($notificacion->estado !== 'Programada') {
            return back()->withErrors([
                'cancelar' => 'Solo se pueden cancelar notificaciones que estén pendientes de envío.',
            ]);
        }

        // SuperAdmin y RRHH pueden cancelar cualquiera; otros roles solo las propias
        $puedeCancelarAjena = in_array($user->rol, ['SuperAdmin', 'Lic_RRHH'], true);
        if (!$puedeCancelarAjena && $notificacion->id_usuario !== $user->id) {
            abort(403, 'Solo puedes cancelar notificaciones programadas por ti.');
        }

        $notificacion->update([
            'estado'            => 'Cancelada',
            'cancelada_por'     => $user->id,
            'fecha_cancelacion' => now(),
        ]);

        return back()->with('success', "El envío programado \"{$notificacion->titulo}\" fue cancelado.");
    }

    /**
     * Resuelve los destinatarios de forma dinámica según los filtros guardados.
     * Reutilizado tanto en el preview en vivo como en el Cron Job de envíos programados.
     */
    public static function resolverDestinatarios(array $filtros): array
    {
        $query = User::whereIn('rol', ['Operario', 'Supervisor']);
        $etiqueta = 'Todos los colaboradores activos';

        switch ($filtros['tipo_segmento'] ?? 'todos') {
            case 'nodo':
                $nodo = $filtros['nodo'] ?? '';
                $query->where('zona_geografica_establecimient', $nodo);
                $etiqueta = "Nodo: {$nodo}";
                break;

            case 'rol':
                $rol = $filtros['rol'] ?? '';
                $query->where('rol', $rol);
                $etiqueta = "Rol: {$rol}";
                break;

            case 'cuadrilla':
                $cuadrilla = Cuadrilla::find($filtros['cuadrilla_id'] ?? 0);
                if ($cuadrilla) {
                    $query->whereHas('cuadrillas', fn ($q) => $q->where('cuadrillas.id_cuadrilla', $cuadrilla->id_cuadrilla));
                    $etiqueta = "Cuadrilla: {$cuadrilla->nombre_cuadrilla}";
                } else {
                    $query->whereRaw('1 = 0');
                    $etiqueta = 'Cuadrilla no encontrada';
                }
                break;

            case 'estado':
                $estadoCurso = $filtros['estado_curso'] ?? 'bloqueados';
                if ($estadoCurso === 'bloqueados') {
                    // Operarios que agotaron sus 3 intentos en alguna evaluación
                    $query->whereHas('progresos', fn ($q) => $q->where('estado', 'Bloqueado'));
                    $etiqueta = 'Estado: Colaboradores bloqueados';
                } else {
                    // Operarios con cursos pendientes/en progreso sin actividad en los últimos 3 días
                    $query->whereHas('progresos', function ($q) {
                        $q->whereIn('estado', ['Pendiente', 'En Progreso', 'Vencido'])
                          ->where('updated_at', '<=', now()->subDays(3));
                    });
                    $etiqueta = 'Estado: Colaboradores atrasados (+3 días)';
                }
                break;

            case 'especificos':
                $ids = $filtros['usuarios_ids'] ?? [];
                $query->whereIn('id', $ids);
                $cantidad = count($ids);
                $etiqueta = $cantidad === 1 ? '1 colaborador específico' : "{$cantidad} colaboradores específicos";
                break;
        }

        $todosCoincidentes = $query->get();
        $activos = $todosCoincidentes->where('estado_operativo', 'Activo')->values();

        return [
            'activos'         => $activos,
            'excluidos_count' => $todosCoincidentes->count() - $activos->count(),
            'etiqueta'        => $etiqueta,
        ];
    }
}