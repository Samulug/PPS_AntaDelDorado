<?php

namespace App\Services;

use App\Models\NotificacionDestinatario;
use App\Models\NotificacionEmitida;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;

class NotificacionService
{
    /**
     * Crea y despacha (o programa) una notificación manual o automática.
     */
    public function emitir(array $datos, Collection $usuariosObjetivo): NotificacionEmitida
    {
        // 1. Filtrar estrictamente colaboradores activos (excluir Vacaciones, Lesionados, etc.)
        $activos = $usuariosObjetivo->where('estado_operativo', 'Activo')->unique('id');

        $esProgramada = !empty($datos['fecha_programada']) && now()->lt($datos['fecha_programada']);

        // 2. Registrar cabecera en notificacion_emitida
        $notificacion = NotificacionEmitida::create([
            'id_usuario'          => $datos['id_usuario'] ?? null,
            'tipo_origen'         => $datos['tipo_origen'] ?? 'Manual',
            'evento_disparador'   => $datos['evento_disparador'] ?? 'manual',
            'titulo'              => $datos['titulo'],
            'mensaje'             => $datos['mensaje'],
            'fecha_publicacion'   => now()->toDateString(),
            'fecha_programada'    => $datos['fecha_programada'] ?? null,
            'enviado_push'        => $datos['enviado_push'] ?? true,
            'enviado_email'       => $datos['enviado_email'] ?? false,
            'segmento_destino'    => $datos['segmento_destino'],
            'filtros_json'        => $datos['filtros_json'] ?? null,
            'estado'              => $esProgramada ? 'Programada' : 'Enviada',
            'total_destinatarios' => $activos->count(),
        ]);

        // Si está programada a futuro, el Cron Job resolverá y ejecutará el envío en su fecha
        if ($esProgramada) {
            return $notificacion;
        }

        $this->ejecutarDespacho($notificacion, $activos, $datos['deep_link'] ?? null);

        return $notificacion;
    }

    public function ejecutarDespacho(NotificacionEmitida $notificacion, Collection $usuarios, ?string $deepLink = null): void
    {
        foreach ($usuarios as $user) {
            $pushOk = false;
            $emailOk = false;

            // 1. Envío Push vía Firebase (FCM) si el usuario tiene token registrado
            if ($notificacion->enviado_push && !empty($user->fcm_token)) {
                // Aquí invocas tu wrapper de kreait/laravel-firebase
                // app(FirebaseService::class)->enviarPush($user->fcm_token, $notificacion->titulo, $notificacion->mensaje, ['route' => $deepLink]);
                $pushOk = true;
            }

            // 2. Envío de Correo de Respaldo (solo si es alerta crítica o asignación obligatoria)
            if ($notificacion->enviado_email && !empty($user->email)) {
                // Mail::to($user->email)->queue(new AlertaCorporativaMail($notificacion, $user));
                $emailOk = true;
            }

            NotificacionDestinatario::create([
                'id_notificacion' => $notificacion->id_notificacion,
                'id_usuario'      => $user->id,
                'push_enviado'    => $pushOk,
                'email_enviado'   => $emailOk,
                'deep_link'       => $deepLink,
            ]);
        }

        $notificacion->update([
            'estado'              => 'Enviada',
            'fecha_envio_real'    => now(),
            'total_destinatarios' => $usuarios->count(),
        ]);
    }
}