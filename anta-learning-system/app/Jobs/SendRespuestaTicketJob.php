<?php

namespace App\Jobs;

use App\Models\MensajeTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendRespuestaTicketJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $idMensaje;

    /**
     * Recibimos el ID del mensaje (no el modelo entero) para verificar si sigue existiendo tras los 30s.
     */
    public function __construct(int $idMensaje)
    {
        $this->idMensaje = $idMensaje;
    }

    public function handle(): void
    {
        // 1. Buscamos el mensaje pasados los 30 segundos
        $mensaje = MensajeTicket::with(['ticket.colaborador'])->find($this->idMensaje);

        // 2. Si el administrador presionó "Deshacer", el mensaje fue borrado y cortamos la ejecución aquí
        if (!$mensaje || $mensaje->es_nota_interna) {
            return;
        }

        $colaborador = $mensaje->ticket?->colaborador;

        // 3. Verificamos que el operario esté Activo (Freeze de notificaciones si está de vacaciones/lesionado)
        if (!$colaborador || $colaborador->estado_operativo !== 'Activo') {
            return;
        }

        // 4. Disparo de la Notificación Push vía FCM (Anónimo: firmado siempre como "Recursos Humanos")
        if (!empty($colaborador->fcm_token)) {
            Log::info("Push FCM enviado a {$colaborador->nombre_completo} (Token: {$colaborador->fcm_token}): Nueva respuesta de Recursos Humanos en Ticket #{$mensaje->id_ticket}");
            
            // Cuando integres kreait/laravel-firebase, aquí va el envío al $colaborador->fcm_token
        }
    }
}