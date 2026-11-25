<?php

namespace App\Console\Commands;

use App\Mail\TicketSlaVencidoMail;
use App\Models\TicketConsulta;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class CheckTicketsSLA extends Command
{
    /**
     * Nombre del comando para ejecutarlo por consola o programador.
     */
    protected $signature = 'tickets:check-sla';

    /**
     * Descripción del comando.
     */
    protected $description = 'Verifica tickets abiertos con más de 48 horas y notifica al administrador asignado o a la bandeja general.';

    public function handle(): int
    {
        $limite48Horas = now()->subHours(48);

        // Buscamos tickets que NO estén Resueltos ni Cerrados, creados hace más de 48 hs y sin alerta previa
        $ticketsVencidos = TicketConsulta::with(['colaborador', 'adminAsignado'])
            ->whereIn('estado_ticket', ['Abierto', 'En Curso'])
            ->where('alerta_demora_enviada', false)
            ->where('created_at', '<=', $limite48Horas)
            ->get();

        if ($ticketsVencidos->isEmpty()) {
            $this->info('No hay tickets fuera de SLA (>48 hs).');
            return self::SUCCESS;
        }

        // Correos de respaldo del equipo administrativo en caso de que el ticket no tenga dueño
        $adminsEquipo = User::whereIn('rol', ['SuperAdmin', 'Lic_RRHH', 'Lic_HyS'])
            ->where('estado_operativo', 'Activo')
            ->get();

        foreach ($ticketsVencidos as $ticket) {
            $horasTranscurridas = (int) $ticket->created_at->diffInHours(now());

            $datosBase = [
                'id_ticket'       => $ticket->id_ticket,
                'asunto'          => $ticket->asunto_resumen,
                'categoria'       => $ticket->categoria_consulta,
                'operario_nombre' => $ticket->colaborador?->nombre_completo ?? 'Colaborador',
                'operario_legajo' => $ticket->colaborador?->legajo ?? '-',
                'nodo'            => $ticket->colaborador?->zona_geografica_establecimient ?? 'Las Lajitas',
                'horas_abierto'   => $horasTranscurridas,
                'estado'          => $ticket->estado_ticket,
            ];

            if ($ticket->adminAsignado && !empty($ticket->adminAsignado->email)) {
                // CASO A: Tiene dueño asignado -> Notificamos directamente a ese administrador
                Mail::to($ticket->adminAsignado->email)->send(new TicketSlaVencidoMail(array_merge($datosBase, [
                    'destinatario_nombre' => $ticket->adminAsignado->nombre_completo,
                    'mensaje_contexto'    => 'Tienes un ticket de consulta asignado a tu bandeja que lleva más de 48 horas sin ser marcado como Resuelto:',
                ])));
            } else {
                // CASO B: No tiene dueño (sigue huérfano en Bandeja General) -> Notificamos a los administradores activos
                $correosEquipo = $adminsEquipo->pluck('email')->filter()->toArray();
                if (!empty($correosEquipo)) {
                    Mail::to($correosEquipo)->send(new TicketSlaVencidoMail(array_merge($datosBase, [
                        'destinatario_nombre' => 'Equipo de Administración (RRHH / HyS)',
                        'mensaje_contexto'    => 'Hay una consulta sin dueño en la Bandeja General que ha superado el límite de 48 horas sin ser tomada:',
                    ])));
                }
            }

            // Marcamos el booleano en true para no enviar spam en las siguientes revisiones horarias
            $ticket->update([
                'alerta_demora_enviada' => true,
            ]);
        }

        $this->info("Se procesaron y notificaron {$ticketsVencidos->count()} tickets vencidos.");
        return self::SUCCESS;
    }
}