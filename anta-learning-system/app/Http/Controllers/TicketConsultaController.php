<?php

namespace App\Http\Controllers;

use App\Models\TicketConsulta;
use App\Models\MensajeTicket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TicketConsultaController extends Controller
{
    /**
     * Renderiza la Bandeja de Consultas estilo WhatsApp Web.
     */
    public function index()
    {
        $adminActual = Auth::user();

        // Cargamos todos los tickets con los datos del colaborador (DNI, Legajo, Email, Rol, Nodo),
        // el curso asociado, el administrador asignado y todo el hilo de mensajes auditado.
        $tickets = TicketConsulta::with([
            'colaborador:id,nombre_completo,dni,legajo,email,rol,zona_geografica_establecimient,centro_costo,estado_operativo,foto',
            'adminAsignado:id,nombre_completo,rol,email',
            'curso:id_curso,nombre',
            'mensajes.emisor:id,nombre_completo,rol,foto',
        ])
        ->orderByRaw("CASE 
            WHEN estado_ticket = 'Abierto' AND fecha_devolucion_cola IS NOT NULL THEN 1
            WHEN estado_ticket = 'Abierto' THEN 2
            WHEN estado_ticket = 'En Curso' THEN 3
            WHEN estado_ticket = 'Resuelto' THEN 4
            ELSE 5 END")
        ->orderBy('updated_at', 'desc')
        ->get();

        // Lista de administradores activos (RRHH, HyS, SuperAdmin, Supervisor) para poder derivar
        $administradores = User::whereIn('rol', ['SuperAdmin', 'Lic_RRHH', 'Lic_HyS', 'Supervisor'])
            ->where('estado_operativo', 'Activo')
            ->select('id', 'nombre_completo', 'rol', 'disponible_soporte', 'zona_geografica_establecimient')
            ->orderBy('nombre_completo')
            ->get();

        return Inertia::render('consultas/index', [
            'ticketsIniciales' => $tickets,
            'administradores'  => $administradores,
            'adminActual'      => [
                'id'                 => $adminActual->id,
                'nombre_completo'    => $adminActual->nombre_completo,
                'rol'                => $adminActual->rol,
                'disponible_soporte' => (bool) $adminActual->disponible_soporte,
            ],
        ]);
    }

    /**
     * Envía un mensaje al hilo del chat (o nota interna) con ventana de 30s para Deshacer.
     */
    public function responder(Request $request, $id_ticket)
    {
        $validated = $request->validate([
            'cuerpo_mensaje'  => 'required|string|max:2000',
            'es_nota_interna' => 'boolean',
        ]);

        $admin = Auth::user();
        $ticket = TicketConsulta::findOrFail($id_ticket);
        $esNotaInterna = $validated['es_nota_interna'] ?? false;

        // Prevención de colisiones: si otro admin ya es dueño, bloqueamos escritura externa
        if (
            !$esNotaInterna &&
            $ticket->id_admin_asignado !== null &&
            $ticket->id_admin_asignado !== $admin->id
        ) {
            return response()->json([
                'success' => false,
                'error'   => 'Este ticket ya está siendo atendido por otro administrador.',
            ], 403);
        }

        DB::beginTransaction();
        try {
            // Auto-asignación por primera respuesta si el ticket estaba libre en la Bandeja General
            if ($ticket->id_admin_asignado === null && !$esNotaInterna) {
                $ticket->id_admin_asignado = $admin->id;
                $ticket->estado_ticket = 'En Curso';
                $ticket->fecha_devolucion_cola = null;
            } elseif ($ticket->estado_ticket === 'Abierto' && !$esNotaInterna) {
                $ticket->estado_ticket = 'En Curso';
            }

            $ticket->touch();
            $ticket->save();

            $mensaje = MensajeTicket::create([
                'id_ticket'         => $ticket->id_ticket,
                'id_emisor_usuario' => $admin->id,
                'cuerpo_mensaje'    => $validated['cuerpo_mensaje'],
                'es_nota_interna'   => $esNotaInterna,
            ]);

            $mensaje->load('emisor:id,nombre_completo,rol,foto');

            DB::commit();

            // Si tienes configurado el Job para Push Notifications diferidas 30s:
             if (!$esNotaInterna) {
                 \App\Jobs\SendRespuestaTicketJob::dispatch($mensaje->id_mensaje)->delay(now()->addSeconds(30));
             }

            return response()->json([
                'success'     => true,
                'mensaje'     => $mensaje,
                'ticket'      => $ticket->fresh(['adminAsignado:id,nombre_completo,rol,email']),
                'deshacer_id' => $mensaje->id_mensaje,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'error'   => 'No se pudo registrar el mensaje.',
            ], 500);
        }
    }

    /**
     * Cancela el envío dentro de la ventana de 30 segundos y devuelve el texto para editarlo.
     */
    public function deshacerMensaje($id_mensaje)
    {
        $mensaje = MensajeTicket::where('id_mensaje', $id_mensaje)
            ->where('id_emisor_usuario', Auth::id())
            ->firstOrFail();

        // Margen de 35 segundos considerando latencia de red
        if ($mensaje->created_at->diffInSeconds(now()) <= 35) {
            $textoRecuperado = $mensaje->cuerpo_mensaje;
            $esNotaRecuperada = $mensaje->es_nota_interna;
            $mensaje->delete();

            return response()->json([
                'success'          => true,
                'texto_recuperado' => $textoRecuperado,
                'es_nota_interna'  => $esNotaRecuperada,
            ]);
        }

        return response()->json([
            'success' => false,
            'error'   => 'El tiempo de 30 segundos para cancelar el envío ya expiró.',
        ], 422);
    }

    /**
     * Deriva manualmente un ticket a otro administrador (ej. de RRHH a HyS) o permite tomarlo.
     */
    public function derivar(Request $request, $id_ticket)
    {
        $validated = $request->validate([
            'id_admin_destino' => 'required|exists:users,id',
            'motivo_nota'      => 'nullable|string|max:500',
        ]);

        /** @var \App\Models\User $adminActual */
        $adminActual = Auth::user();
        $adminDestino = User::findOrFail($validated['id_admin_destino']);
        $ticket = TicketConsulta::findOrFail($id_ticket);

        $esTicketDeOtroAdmin = $ticket->id_admin_asignado !== null
            && $ticket->id_admin_asignado !== $adminActual->id;

        $puedeReasignarAjenos = $adminActual->rol === 'SuperAdmin'
            || $adminActual->can('reasignar_tickets_ajenos');

        // Si el ticket ya tiene dueño y no soy yo, solo SuperAdmin o quien tenga 'reasignar_tickets_ajenos' puede tocarlo
        if ($esTicketDeOtroAdmin && !$puedeReasignarAjenos) {
            abort(403, 'No tienes permisos para tomar ni derivar un ticket que está siendo atendido por otro administrador.');
        }

        // Si el ticket es mío o está libre, verificamos que tenga permiso básico de derivar
        if (!$esTicketDeOtroAdmin && $adminActual->rol !== 'SuperAdmin' && !$adminActual->can('derivar_tickets')) {
            abort(403, 'No tienes permisos para derivar tickets.');
        }

        $ticket->update([
            'id_admin_asignado'     => $adminDestino->id,
            'estado_ticket'         => 'En Curso',
            'fecha_devolucion_cola' => null,
        ]);

        $accionTexto = ($adminDestino->id === $adminActual->id && $esTicketDeOtroAdmin)
            ? "Ticket tomado por intervención de {$adminActual->nombre_completo} ({$adminActual->rol})"
            : "Ticket derivado a {$adminDestino->nombre_completo} ({$adminDestino->rol}) por {$adminActual->nombre_completo}";

        $textoNota = !empty($validated['motivo_nota'])
            ? "{$accionTexto}: {$validated['motivo_nota']}"
            : "{$accionTexto}.";

        MensajeTicket::create([
            'id_ticket'         => $ticket->id_ticket,
            'id_emisor_usuario' => $adminActual->id,
            'cuerpo_mensaje'    => $textoNota,
            'es_nota_interna'   => true,
        ]);

        return back()->with('success', "Ticket asignado a {$adminDestino->nombre_completo}.");
    }

    /**
     * Suelta un ticket individual devolviéndolo a la Bandeja General con prioridad de cola.
     */
    public function devolverACola($id_ticket)
    {
        $adminActual = Auth::user();
        $ticket = TicketConsulta::findOrFail($id_ticket);

        // Si hay otro administrador disponible en turno, el algoritmo lo reasigna de inmediato
        $otroAdminDisponible = User::whereIn('rol', ['SuperAdmin', 'Lic_RRHH', 'Lic_HyS', 'Supervisor'])
            ->where('estado_operativo', 'Activo')
            ->where('disponible_soporte', true)
            ->where('id', '!=', $adminActual->id)
            ->withCount(['ticketsAsignados as carga_activa' => function ($q) {
                $q->whereIn('estado_ticket', ['Abierto', 'En Curso']);
            }])
            ->orderBy('carga_activa', 'asc')
            ->first();

        $ticket->update([
            'id_admin_asignado'     => $otroAdminDisponible ? $otroAdminDisponible->id : null,
            'estado_ticket'         => $otroAdminDisponible ? 'En Curso' : 'Abierto',
            'fecha_devolucion_cola' => now(),
        ]);

        MensajeTicket::create([
            'id_ticket'         => $ticket->id_ticket,
            'id_emisor_usuario' => $adminActual->id,
            'cuerpo_mensaje'    => $otroAdminDisponible
                ? "Ticket liberado por {$adminActual->nombre_completo} y reasignado automáticamente a {$otroAdminDisponible->nombre_completo}."
                : "Ticket devuelto a la Bandeja General por {$adminActual->nombre_completo}.",
            'es_nota_interna'   => true,
        ]);

        return back()->with('success', 'El ticket fue devuelto a la cola general.');
    }

    /**
     * Cambia el estado del ticket (En Curso, Resuelto, Cerrado).
     */
    public function cambiarEstado(Request $request, $id_ticket)
    {
        $validated = $request->validate([
            'estado_ticket' => 'required|in:Abierto,En Curso,Resuelto,Cerrado',
        ]);

        $ticket = TicketConsulta::findOrFail($id_ticket);

        if ($ticket->id_admin_asignado === null && in_array($validated['estado_ticket'], ['En Curso', 'Resuelto', 'Cerrado'])) {
            $ticket->id_admin_asignado = Auth::id();
        }

        $ticket->estado_ticket = $validated['estado_ticket'];
        $ticket->save();

        return back()->with('success', "Estado del ticket actualizado a {$validated['estado_ticket']}.");
    }

    /**
     * Interruptor de Turno (Iniciar Turno / Fin de Turno con liberación opcional de tickets).
     */
    public function toggleDisponibilidadTurno(Request $request)
    {
        
        $admin = Auth::user();
        $nuevoEstado = !$admin->disponible_soporte;
        $soltarPendientes = $request->boolean('soltar_pendientes', true);

        $admin->disponible_soporte = $nuevoEstado;
        
        $admin->save();

        if ($nuevoEstado) {
            // ENTRADA EN TURNO: Asignar tickets huérfanos priorizando los que tienen fecha_devolucion_cola más antigua
            $ticketsHuerfanos = TicketConsulta::whereNull('id_admin_asignado')
                ->whereIn('estado_ticket', ['Abierto', 'En Curso'])
                ->orderByRaw('CASE WHEN fecha_devolucion_cola IS NOT NULL THEN 0 ELSE 1 END')
                ->orderBy('fecha_devolucion_cola', 'asc')
                ->orderBy('created_at', 'asc')
                ->get();

            foreach ($ticketsHuerfanos as $t) {
                $t->update([
                    'id_admin_asignado' => $admin->id,
                    'estado_ticket'     => 'En Curso',
                ]);
            }

            $cant = $ticketsHuerfanos->count();
            return back()->with('success', $cant > 0
                ? "Turno activo. Se te asignaron automáticamente {$cant} tickets pendientes en cola."
                : "Turno de soporte activado. Recibirás las nuevas consultas entrantes.");
        } else {
            // FIN DE TURNO: Liberar tickets abiertos/en curso para el siguiente turno
            if ($soltarPendientes) {
                $misTicketsAbiertos = TicketConsulta::where('id_admin_asignado', $admin->id)
                    ->whereIn('estado_ticket', ['Abierto', 'En Curso'])
                    ->get();

                foreach ($misTicketsAbiertos as $t) {
                    $t->update([
                        'id_admin_asignado'     => null,
                        'estado_ticket'         => 'Abierto',
                        'fecha_devolucion_cola' => now(),
                    ]);
                }
            }

            return back()->with('success', 'Has finalizado tu turno de soporte. Tus tickets abiertos pasaron a la cola prioritaria.');
        }
    }
}