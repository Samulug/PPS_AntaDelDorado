<?php

namespace Database\Seeders;

use App\Models\Cuadrilla;
use App\Models\NotificacionDestinatario;
use App\Models\NotificacionEmitida;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class NotificacionesSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Limpiar caché de Spatie y registrar los 4 permisos granulares de Notificaciones
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permisosNotificaciones = [
            'listar_notificaciones',
            'crear_notificacion',
            'enviar_notificacion_critica',
            'cancelar_notificacion',
        ];

        foreach ($permisosNotificaciones as $permiso) {
            Permission::findOrCreate($permiso, 'web');
        }

        // Asignar sin borrar los permisos previos de cada rol (givePermissionTo en lugar de syncPermissions)
        Role::where('name', 'SuperAdmin')->first()?->givePermissionTo($permisosNotificaciones);
        Role::where('name', 'Lic_RRHH')->first()?->givePermissionTo($permisosNotificaciones);
        Role::where('name', 'Lic_HyS')->first()?->givePermissionTo([
            'listar_notificaciones',
            'crear_notificacion',
            'enviar_notificacion_critica',
            'cancelar_notificacion',
        ]);

        // 2. Recuperar actores existentes en tu base de datos
        $superAdmin = User::where('rol', 'SuperAdmin')->first();
        $rrhhAdmin  = User::where('rol', 'Lic_RRHH')->first() ?? $superAdmin;
        $hysAdmin   = User::where('rol', 'Lic_HyS')->first() ?? $superAdmin;

        if (!$superAdmin) {
            $this->command->warn('No se encontraron administradores en la tabla users. Ejecuta primero el seeder de usuarios.');
            return;
        }

        $operariosLajitas = User::where('rol', 'Operario')
            ->where('zona_geografica_establecimient', 'Las Lajitas')
            ->where('estado_operativo', 'Activo')
            ->take(8)
            ->get();

        $cuadrilla = Cuadrilla::first();

        // ---------------------------------------------------------------------
        // ESCENARIO 1: Notificación Crítica Manual ENVIADA (Push + Email)
        // ---------------------------------------------------------------------
        $notifCritica = NotificacionEmitida::create([
            'id_usuario'          => $rrhhAdmin->id,
            'tipo_origen'         => 'Manual',
            'evento_disparador'   => 'manual',
            'titulo'              => 'Alerta Climática: Suspensión temporal en lote externo',
            'mensaje'             => 'Por alerta de tormenta eléctrica y ráfagas en Las Lajitas, el personal de campo debe replegarse a la base cubierta.',
            'fecha_publicacion'   => now()->subDay()->toDateString(),
            'fecha_programada'    => null,
            'fecha_envio_real'    => now()->subDay()->setTime(9, 15),
            'enviado_push'        => true,
            'enviado_email'       => true,
            'segmento_destino'    => 'Nodo: Las Lajitas',
            'filtros_json'        => ['tipo_segmento' => 'nodo', 'nodo' => 'Las Lajitas'],
            'estado'              => 'Enviada',
            'total_destinatarios' => $operariosLajitas->count(),
        ]);

        foreach ($operariosLajitas as $index => $op) {
            NotificacionDestinatario::create([
                'id_notificacion' => $notifCritica->id_notificacion,
                'id_usuario'      => $op->id,
                'push_enviado'    => true,
                'email_enviado'   => true,
                'deep_link'       => '/notificaciones',
                // Simulamos que los primeros 5 ya abrieron la alerta en el celular
                'leido_en'        => $index < 5 ? now()->subHours(18 - $index) : null,
            ]);
        }

        // ---------------------------------------------------------------------
        // ESCENARIO 2: Notificación PROGRAMADA a futuro (Para probar "Cancelar envío")
        // ---------------------------------------------------------------------
        NotificacionEmitida::create([
            'id_usuario'          => $rrhhAdmin->id,
            'tipo_origen'         => 'Manual',
            'evento_disparador'   => 'manual',
            'titulo'              => 'Recordatorio: Cuestionarios pendientes de desbloqueo',
            'mensaje'             => 'Si agotaste tus intentos en una evaluación, solicitá la habilitación a Recursos Humanos desde la sección Consultas.',
            'fecha_publicacion'   => now()->toDateString(),
            'fecha_programada'    => now()->addDay()->setTime(8, 0),
            'fecha_envio_real'    => null,
            'enviado_push'        => true,
            'enviado_email'       => false,
            'segmento_destino'    => 'Estado: Colaboradores bloqueados',
            'filtros_json'        => ['tipo_segmento' => 'estado', 'estado_curso' => 'bloqueados'],
            'estado'              => 'Programada',
            'total_destinatarios' => 1,
        ]);

        // ---------------------------------------------------------------------
        // ESCENARIO 3: Segunda Notificación PROGRAMADA por HyS
        // ---------------------------------------------------------------------
        NotificacionEmitida::create([
            'id_usuario'          => $hysAdmin->id,
            'tipo_origen'         => 'Manual',
            'evento_disparador'   => 'manual',
            'titulo'              => 'Control obligatorio de EPP antes de cosecha',
            'mensaje'             => 'Recordamos revisar estado de gafas protectoras y guantes anticorte antes del inicio de turno del lunes.',
            'fecha_publicacion'   => now()->toDateString(),
            'fecha_programada'    => now()->addDays(2)->setTime(7, 30),
            'fecha_envio_real'    => null,
            'enviado_push'        => true,
            'enviado_email'       => true,
            'segmento_destino'    => 'Todos los colaboradores activos',
            'filtros_json'        => ['tipo_segmento' => 'todos'],
            'estado'              => 'Programada',
            'total_destinatarios' => User::where('estado_operativo', 'Activo')->count(),
        ]);

        // ---------------------------------------------------------------------
        // ESCENARIO 4: Notificación AUTOMÁTICA por Evento de Cuadrilla
        // ---------------------------------------------------------------------
        $miembrosCuadrilla = $cuadrilla
            ? $cuadrilla->colaboradores()->where('estado_operativo', 'Activo')->get()
            : $operariosLajitas->take(4);

        $notifAuto = NotificacionEmitida::create([
            'id_usuario'          => $hysAdmin->id,
            'tipo_origen'         => 'Automatica',
            'evento_disparador'   => 'asignacion_cuadrilla',
            'titulo'              => 'Asignación Preventiva: ' . ($cuadrilla->nombre_cuadrilla ?? 'Cuadrilla Poda Lote Norte'),
            'mensaje'             => 'Fuiste asignado a una cuadrilla preventiva. Completá las cápsulas obligatorias antes de ingresar al lote.',
            'fecha_publicacion'   => now()->subHours(5)->toDateString(),
            'fecha_programada'    => null,
            'fecha_envio_real'    => now()->subHours(5),
            'enviado_push'        => true,
            'enviado_email'       => true,
            'segmento_destino'    => 'Cuadrilla: ' . ($cuadrilla->nombre_cuadrilla ?? 'Cuadrilla 1'),
            'filtros_json'        => ['tipo_segmento' => 'cuadrilla', 'cuadrilla_id' => $cuadrilla?->id_cuadrilla],
            'estado'              => 'Enviada',
            'total_destinatarios' => $miembrosCuadrilla->count(),
        ]);

        foreach ($miembrosCuadrilla as $idx => $miembro) {
            NotificacionDestinatario::create([
                'id_notificacion' => $notifAuto->id_notificacion,
                'id_usuario'      => $miembro->id,
                'push_enviado'    => true,
                'email_enviado'   => true,
                'deep_link'       => '/cursos',
                'leido_en'        => $idx < 3 ? now()->subHours(2) : null,
            ]);
        }

        // ---------------------------------------------------------------------
        // ESCENARIO 5: Notificación Programada CANCELADA (Para validar auditoría)
        // ---------------------------------------------------------------------
        NotificacionEmitida::create([
            'id_usuario'          => $rrhhAdmin->id,
            'tipo_origen'         => 'Manual',
            'evento_disparador'   => 'manual',
            'titulo'              => 'Reunión general de inducción en oficina central',
            'mensaje'             => 'Se convoca al personal administrativo a las 14:00 hs en sala de reuniones.',
            'fecha_publicacion'   => now()->subDays(2)->toDateString(),
            'fecha_programada'    => now()->subDay()->setTime(13, 0),
            'fecha_envio_real'    => null,
            'enviado_push'        => true,
            'enviado_email'       => false,
            'segmento_destino'    => 'Rol: Supervisor',
            'filtros_json'        => ['tipo_segmento' => 'rol', 'rol' => 'Supervisor'],
            'estado'              => 'Cancelada',
            'total_destinatarios' => 1,
            'cancelada_por'       => $superAdmin->id,
            'fecha_cancelacion'   => now()->subDay()->setTime(10, 45),
        ]);

        $this->command->info('NotificacionesSeeder ejecutado: permisos actualizados y 5 notificaciones de prueba creadas.');
    }
}