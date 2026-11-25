<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\AuditAdmin;
use App\Models\NotificacionEmitida;
use App\Models\TicketConsulta;
use App\Models\MensajeTicket;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

use App\Mail\CursoEstadoActualizadoMail;
use App\Mail\OperarioBloqueadoMail;
use Illuminate\Support\Facades\Mail;

class ProfileController extends Controller
{
    /**
     * Muestra el perfil integral del Administrador con toda su trazabilidad.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        // 1. Permisos asignados (Combina permisos de Spatie + permisos_json)
        $spatiePermissions = method_exists($user, 'getAllPermissions')
            ? $user->getAllPermissions()->pluck('name')->toArray()
            : [];
        $jsonPermissions = is_array($user->permisos_json)
            ? $user->permisos_json
            : (json_decode($user->permisos_json ?? '[]', true) ?: []);
        $permisosAsignados = array_values(array_unique(array_merge($spatiePermissions, $jsonPermissions)));

        // 2. Historial de Auditoría Extensiva (Cursos, Cuadrillas y Personal)
        $historialAuditoria = AuditAdmin::with([
            'curso:id_curso,nombre,version_trimestral',
            'cuadrilla:id_cuadrilla,nombre_cuadrilla,labor_asociada',
            'usuarioAfectado:id,nombre_completo,dni,legajo,rol,email,zona_geografica_establecimient,estado_operativo',
        ])
            ->where('id_usuario', $user->id)
            ->orderByDesc('fecha_evento')
            ->get();

        // 3. Historial específico de Administradores agregados/gestionados por este usuario
        $historialAdministradores = AuditAdmin::with([
            'usuarioAfectado:id,nombre_completo,dni,legajo,rol,email,zona_geografica_establecimient,estado_operativo,created_at',
        ])
            ->where('id_usuario', $user->id)
            ->whereNotNull('id_usuario_afectado')
            ->whereHas('usuarioAfectado', function ($q) {
                $q->whereIn('rol', ['SuperAdmin', 'Lic_RRHH', 'Lic_HyS']);
            })
            ->orderByDesc('fecha_evento')
            ->get();

        // 4. Métricas de Soporte (Tickets Auditados respondidos por este admin)
        $ticketsResueltosQuery = TicketConsulta::where('id_admin_asignado', $user->id)
            ->whereIn('estado_ticket', ['Resuelto', 'Cerrado']);

        $totalTicketsRespondidos = (clone $ticketsResueltosQuery)->count();
        $ticketsEnCurso = TicketConsulta::where('id_admin_asignado', $user->id)
            ->whereIn('estado_ticket', ['Abierto', 'En Curso'])
            ->count();

        $totalMensajesEnviados = MensajeTicket::where('id_emisor_usuario', $user->id)
            ->where('es_nota_interna', false)
            ->count();

        $calificacionPromedio = (clone $ticketsResueltosQuery)
            ->whereNotNull('calificacion_respuesta')
            ->avg('calificacion_respuesta');

        $ultimosTickets = TicketConsulta::with([
            'colaborador:id,nombre_completo,legajo,zona_geografica_establecimient',
            'curso:id_curso,nombre',
            'mensajes' => function ($q) {
                $q->where('es_nota_interna', false)
                  ->orderByDesc('created_at');
            },
        ])
            ->withCount(['mensajes as total_mensajes' => function ($q) {
                $q->where('es_nota_interna', false);
            }])
            ->where(function ($q) use ($user) {
                // Trae tickets asignados a este admin o en los que participó respondiendo
                $q->where('id_admin_asignado', $user->id)
                  ->orWhereHas('mensajes', function ($m) use ($user) {
                      $m->where('id_emisor_usuario', $user->id)
                        ->where('es_nota_interna', false);
                  });
            })
            ->orderByDesc('updated_at')
            ->take(10)
            ->get();

        // 5. Registro de Notificaciones Emitidas (Push + Email)
        $notificacionesEmitidas = NotificacionEmitida::where('id_usuario', $user->id)
            ->orderByDesc('fecha_publicacion')
            ->orderByDesc('created_at')
            ->get();

        // 6. Historial de Accesos (Log de Sesión desde la tabla nativa sessions)
        $sesiones = [];
        if (config('session.driver') === 'database') {
            $sesiones = DB::table('sessions')
                ->where('user_id', $user->id)
                ->orderByDesc('last_activity')
                ->get()
                ->map(function ($session) use ($request) {
                    return [
                        'id'                => $session->id,
                        'ip_address'        => $session->ip_address,
                        'user_agent'        => $this->parseUserAgent($session->user_agent),
                        'raw_agent'         => $session->user_agent,
                        'is_current_device' => $session->id === $request->session()->getId(),
                        'last_active'       => Carbon::createFromTimestamp($session->last_activity)->diffForHumans(),
                        'fecha_exacta'      => Carbon::createFromTimestamp($session->last_activity)->format('d/m/Y H:i'),
                    ];
                })
                ->toArray();
        }

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail'          => $user instanceof MustVerifyEmail,
            'status'                   => session('status'),
            'perfilAdmin'              => [
                'id'                             => $user->id,
                'nombre_completo'                => $user->nombre_completo ?? $user->name,
                'email'                          => $user->email,
                'dni'                            => $user->dni,
                'legajo'                         => $user->legajo,
                'rol'                            => $user->rol,
                'zona_geografica_establecimient' => $user->zona_geografica_establecimient,
                'centro_costo'                   => $user->centro_costo,
                'estado_operativo'               => $user->estado_operativo,
                'disponible_soporte'             => (bool) $user->disponible_soporte,
                'fecha_ingreso'                  => $user->fecha_ingreso ? Carbon::parse($user->fecha_ingreso)->format('d/m/Y') : '15/01/2026',
                'id_microsoft_entra'             => $user->id_microsoft_entra,
                'foto_url'                       => $user->foto ? Storage::url($user->foto) : null,
                'permisos'                       => $permisosAsignados,
            ],
            'historialAuditoria'       => $historialAuditoria,
            'historialAdministradores' => $historialAdministradores,
            'metricasSoporte'          => [
                'total_respondidos'     => $totalTicketsRespondidos,
                'tickets_en_curso'        => $ticketsEnCurso,   
                'total_mensajes_enviados' => $totalMensajesEnviados,
                'calificacion_promedio' => $calificacionPromedio ? round((float) $calificacionPromedio, 1) : null,
                'ultimos_tickets'       => $ultimosTickets,
            ],
            'notificacionesEmitidas'   => $notificacionesEmitidas,
            'sesionesActivas'          => $sesiones,
        ]);
    }

    /**
     * Actualiza la foto de perfil o datos permitidos del administrador.
     */
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'foto' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'], // Máx 3MB
        ]);

        if ($request->hasFile('foto')) {
            if ($user->foto && Storage::disk('public')->exists($user->foto)) {
                Storage::disk('public')->delete($user->foto);
            }
            $path = $request->file('foto')->store('perfiles', 'public');
            $user->foto = $path;
            $user->save();
        }

        return Redirect::route('profile.edit')->with('success', 'Foto de perfil actualizada correctamente.');
    }

    /**
     * Elimina la cuenta del usuario.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();
        Auth::logout();
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    /**
     * Formatea el User-Agent para mostrar navegador y sistema operativo de forma legible.
     */
    private function parseUserAgent(?string $userAgent): string
    {
        if (!$userAgent) {
            return 'Dispositivo desconocido';
        }

        $os = 'SO Desconocido';
        if (preg_match('/windows/i', $userAgent)) $os = 'Windows';
        elseif (preg_match('/macintosh|mac os x/i', $userAgent)) $os = 'macOS';
        elseif (preg_match('/linux/i', $userAgent)) $os = 'Linux';
        elseif (preg_match('/android/i', $userAgent)) $os = 'Android';
        elseif (preg_match('/iphone|ipad/i', $userAgent)) $os = 'iOS';

        $browser = 'Navegador';
        if (preg_match('/edg/i', $userAgent)) $browser = 'Microsoft Edge';
        elseif (preg_match('/chrome/i', $userAgent)) $browser = 'Google Chrome';
        elseif (preg_match('/firefox/i', $userAgent)) $browser = 'Mozilla Firefox';
        elseif (preg_match('/safari/i', $userAgent)) $browser = 'Safari';

        return "{$browser} en {$os}";
    }

    public function sendTestEmail(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email_destino' => ['required', 'email'],
            'tipo_prueba'   => ['required', 'in:curso,bloqueo,sla,ambos,todos'],
        ]);

        $admin = $request->user();
        $destino = $validated['email_destino'];
        $tipo = $validated['tipo_prueba'];

        if (in_array($tipo, ['curso', 'ambos', 'todos'], true)) {
            $dataCurso = [
                'creador_nombre'  => $admin->nombre_completo ?? 'Técnica en HyS',
                'curso_nombre'    => 'Seguridad en Maquinaria Agrícola y Uso de EPP',
                'nuevo_estado'    => 'Activo (Publicado)',
                'accion'          => 'Publicación en Catálogo',
                'ejecutor_nombre' => 'Belec Gainza',
                'ejecutor_rol'    => 'SuperAdmin',
                'fecha'           => now()->format('d/m/Y H:i'),
            ];
            Mail::to($destino)->send(new CursoEstadoActualizadoMail($dataCurso));
        }

        if (in_array($tipo, ['bloqueo', 'ambos', 'todos'], true)) {
            $dataBloqueo = [
                'operario_nombre' => 'Luis Alberto Salvatierra',
                'operario_legajo' => '1042',
                'nodo'            => $admin->zona_geografica_establecimient ?? 'Las Lajitas',
                'curso_nombre'    => 'Manejo Seguro de Agroquímicos',
                'intentos'        => 3,
                'ultima_nota'     => 40,
            ];
            Mail::to($destino)->send(new OperarioBloqueadoMail($dataBloqueo));
        }

        if (in_array($tipo, ['sla', 'todos'], true)) {
            $dataSla = [
                'destinatario_nombre' => $admin->nombre_completo ?? 'Equipo de Administración',
                'mensaje_contexto'    => 'Tienes un ticket de consulta asignado a tu bandeja que lleva más de 48 horas sin ser marcado como Resuelto:',
                'id_ticket'           => 104,
                'asunto'              => 'Bloqueo en cuestionario módulo 1',
                'categoria'           => 'Sistema / Cursos',
                'operario_nombre'     => 'Luis Alberto Salvatierra',
                'operario_legajo'     => '2005',
                'nodo'                => $admin->zona_geografica_establecimient ?? 'Las Lajitas',
                'horas_abierto'       => 52,
                'estado'              => 'En Curso',
            ];
            
        }

        return Redirect::route('profile.edit')->with(
            'success',
            "Correo(s) de prueba enviado(s) correctamente a {$destino}."
        );
    }
}