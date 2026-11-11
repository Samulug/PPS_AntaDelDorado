<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Limpiar la caché de permisos de Spatie
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 2. Diccionario de Permisos Granulares (Atómicos)
        $permisos = [
            // Módulo 1: Dashboard
            'ver_metricas',
            'exportar_reportes',

            // Módulo 2: Colaboradores (Sin reseteo de clave por MVP Microsoft SSO)
            'listar_colaboradores',
            'crear_colaborador',
            'editar_colaborador',
            'suspender_colaborador',

            // Módulo 3: Cuadrillas
            'listar_cuadrillas',
            'crear_cuadrilla',
            'editar_cuadrilla',
            'eliminar_cuadrilla',

            // Módulo 4: Catálogo de Cursos
            'listar_cursos',
            'crear_curso',
            'editar_curso',
            'eliminar_curso',
            'previsualizar_curso',

            // Módulo 5: Tickets (Soporte)
            'listar_tickets',
            'responder_tickets',

            // Módulo 6: Notificaciones Push / Email
            'listar_notificaciones',
            'enviar_notificacion_push',

            // Módulo 7: Seguridad y Roles
            'listar_roles_admins',
            'crear_rol',
            'editar_rol',
            'asignar_permisos',
        ];

        foreach ($permisos as $permiso) {
            Permission::findOrCreate($permiso, 'web');
        }

        // 3. Creación de Roles del Sistema
        $roleSuperAdmin = Role::findOrCreate('SuperAdmin', 'web');
        $roleRRHH       = Role::findOrCreate('Lic_RRHH', 'web');
        $roleHyS        = Role::findOrCreate('Lic_HyS', 'web');
        
        // Roles exclusivos para la App Móvil (Sin permisos web)
        Role::findOrCreate('Operario', 'web');
        Role::findOrCreate('Supervisor', 'web');

        // 4. Asignación de Permisos Granulares a cada Rol
        // SuperAdmin: Todos los permisos
        $roleSuperAdmin->syncPermissions(Permission::all());

        // Lic_RRHH: Dominio de personal, comunicación, métricas, cuadrillas y lectura de cursos
        $roleRRHH->syncPermissions([
            'ver_metricas',
            'exportar_reportes',
            'listar_colaboradores',
            'crear_colaborador',
            'editar_colaborador',
            'suspender_colaborador',
            'listar_cuadrillas',
            'crear_cuadrilla',
            'editar_cuadrilla',
            'listar_cursos', // Solo lectura en catálogo
            'listar_tickets',
            'responder_tickets',
            'listar_notificaciones',
            'enviar_notificacion_push',
        ]);

        // Lic_HyS: Dominio de cursos, cuadrillas preventivas, métricas y lectura de colaboradores
        $roleHyS->syncPermissions([
            'ver_metricas',
            'exportar_reportes',
            'listar_colaboradores', // Solo lectura para conocer al personal y armar cuadrillas
            'listar_cuadrillas',
            'crear_cuadrilla',
            'editar_cuadrilla',
            'listar_cursos',
            'crear_curso',
            'editar_curso',
            'eliminar_curso',
            'previsualizar_curso',
        ]);

        // 5. Creación de los 2 SuperAdmins (Desarrollador y Belec Gainza)
        $devAdmin = User::firstOrCreate(
            ['email' => 'dev@antadeldorado.com'], // Cambia por tu correo real de Microsoft
            [
                'nombre_completo'                => 'Administrador Desarrollador Samu',
                'dni'                            => 99999999,
                'legajo'                         => 1,
                'password'                       => Hash::make('dev_sso_placeholder'),
                'rol'                            => 'SuperAdmin',
                'zona_geografica_establecimient' => 'Las Lajitas',
                'centro_costo'                   => 'Sistemas',
                'estado_operativo'               => 'Activo',
                'fecha_ingreso'                  => now(),
            ]
        );
        $devAdmin->syncRoles([$roleSuperAdmin]);

        $belecAdmin = User::firstOrCreate(
            ['email' => 'bgainza@antadeldorado.com'], // Cambia por el correo corporativo de Belec
            [
                'nombre_completo'                => 'Belec Gainza',
                'dni'                            => 11111111,
                'legajo'                         => 2,
                'password'                       => Hash::make('belec_sso_placeholder'),
                'rol'                            => 'SuperAdmin',
                'zona_geografica_establecimient' => 'Las Lajitas',
                'centro_costo'                   => 'Recursos Humanos',
                'estado_operativo'               => 'Activo',
                'fecha_ingreso'                  => now(),
            ]
        );
        $belecAdmin->syncRoles([$roleSuperAdmin]);
    }
}