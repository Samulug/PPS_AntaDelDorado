<?php

namespace App\Http\Controllers;

use App\Models\AuditAdmin;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Attributes\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    /**
     * Muestra el panel de Roles, Permisos Granulares y Administradores del sistema.
     */
    #[Middleware('permission:listar_roles_admins')]
    public function index(): Response
    {
        // Excluimos los roles móviles (Operario/Supervisor) de la matriz de administración web
        $roles = Role::with('permissions:id,name')
            ->whereNotIn('name', ['Operario', 'Supervisor'])
            ->orderBy('id')
            ->get()
            ->map(fn ($role) => [
                'id'          => $role->id,
                'name'        => $role->name,
                'permissions' => $role->permissions->pluck('name')->toArray(),
                'is_system'   => in_array($role->name, ['SuperAdmin', 'Lic_RRHH', 'Lic_HyS']),
            ]);

        // Todos los permisos atómicos disponibles en la base de datos
        $permissions = Permission::orderBy('id')->pluck('name')->toArray();

        // Listado de usuarios con roles administrativos
        $administradores = User::with('roles:id,name')
            ->whereNotIn('rol', ['Operario', 'Supervisor'])
            ->orderBy('id')
            ->get([
                'id',
                'nombre_completo',
                'dni',
                'legajo',
                'email',
                'rol',
                'zona_geografica_establecimient',
                'centro_costo',
                'estado_operativo',
                'id_microsoft_entra',
                'fecha_ingreso',
            ])
            ->map(fn ($admin) => [
                'id'                             => $admin->id,
                'nombre_completo'                => $admin->nombre_completo,
                'dni'                            => $admin->dni,
                'legajo'                         => $admin->legajo,
                'email'                          => $admin->email,
                'rol'                            => $admin->rol,
                'zona_geografica_establecimient' => $admin->zona_geografica_establecimient,
                'centro_costo'                   => $admin->centro_costo,
                'estado_operativo'               => $admin->estado_operativo,
                'sso_sincronizado'               => !is_null($admin->id_microsoft_entra),
                'es_desarrollador'               => $admin->email === 'dev@antadeldorado.com' || (int) $admin->legajo === 1,
            ]);

        return Inertia::render('roles/index', [
            'roles'           => $roles,
            'allPermissions'  => $permissions,
            'administradores' => $administradores,
        ]);
    }

    /**
     * Crea un nuevo Rol personalizado (ej. "Auditor") usando únicamente permisos existentes.
     */

    #[Middleware('permission:crear_rol')]
    public function createRole(): Response
    {
        return Inertia::render('roles/create', [
            'allPermissions' => Permission::orderBy('id')->pluck('name')->toArray()
        ]);
    }

    #[Middleware('permission:crear_rol')]
    public function storeRole(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:100', 'unique:roles,name', Rule::notIn(['Operario', 'Supervisor'])],
            'permissions'   => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create([
            'name'       => trim($validated['name']),
            'guard_name' => 'web',
        ]);

        $role->syncPermissions($validated['permissions'] ?? []);

        // Limpiar caché de Spatie inmediatamente
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->route('roles.index')->with('success', "Rol '{$role->name}' creado correctamente.");    
    }

    /**
     * Actualiza los permisos granulares de un Rol existente.
     */
    #[Middleware('permission:asignar_permisos')]
    public function updateRolePermissions(Request $request, Role $role): RedirectResponse
    {
        // Regla crítica: El rol SuperAdmin siempre conserva todos los permisos del sistema
        if ($role->name === 'SuperAdmin') {
            return redirect()->back()->withErrors([
                'permissions' => 'Por seguridad, los permisos del rol SuperAdmin no pueden ser restringidos.',
            ]);
        }

        $validated = $request->validate([
            'permissions'   => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role->syncPermissions($validated['permissions'] ?? []);

        // Limpiar caché de Spatie para impactar en tiempo real en las sesiones activas
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->back()->with('success', "Permisos del rol '{$role->name}' actualizados en tiempo real.");
    }

    /**
     * Elimina un rol personalizado (protegiendo los roles base del sistema).
     */
    #[Middleware('permission:editar_rol')]
    public function destroyRole(Role $role): RedirectResponse
    {
        if (in_array($role->name, ['SuperAdmin', 'Lic_RRHH', 'Lic_HyS', 'Operario', 'Supervisor'])) {
            return redirect()->back()->withErrors([
                'role' => 'No se pueden eliminar los roles estructurales del sistema.',
            ]);
        }

        if ($role->users()->count() > 0) {
            return redirect()->back()->withErrors([
                'role' => 'No puedes eliminar este rol porque tiene administradores asignados.',
            ]);
        }

        $nombreRol = $role->name;
        $role->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        return redirect()->back()->with('success', "Rol '{$nombreRol}' eliminado.");
    }

    /**
     * Da de alta a un nuevo Administrador (RRHH, HyS o SuperAdmin) listo para Microsoft SSO.
     */

    #[Middleware('permission:asignar_permisos')]
    public function createAdmin(): Response
    {
        $rolesPermitidos = Role::whereNotIn('name', ['Operario', 'Supervisor'])
                               ->pluck('name')
                               ->toArray();

        return Inertia::render('administradores/create', [
            'rolesDisponibles' => $rolesPermitidos
        ]);
    }

    #[Middleware('permission:asignar_permisos')]
    public function storeAdmin(Request $request): RedirectResponse
    {
        $rolesPermitidos = Role::whereNotIn('name', ['Operario', 'Supervisor'])->pluck('name')->toArray();

        $validated = $request->validate([
            'nombre_completo'                => 'required|string|max:255',
            'dni'                            => 'required|integer|unique:users,dni',
            'legajo'                         => 'required|integer|unique:users,legajo',
            'email'                          => 'required|string|email|max:255|unique:users,email',
            'rol'                            => ['required', 'string', Rule::in($rolesPermitidos)],
            'zona_geografica_establecimient' => 'required|string',
            'centro_costo'                   => 'required|string',
        ]);

        // Contraseña interna placeholder para cumplir con NOT NULL (El login real es por Microsoft SSO)
        $admin = User::create([
            'nombre_completo'                => $validated['nombre_completo'],
            'dni'                            => $validated['dni'],
            'legajo'                         => $validated['legajo'],
            'email'                          => strtolower(trim($validated['email'])),
            'password'                       => Hash::make((string) $validated['dni']),
            'rol'                            => $validated['rol'],
            'zona_geografica_establecimient' => $validated['zona_geografica_establecimient'],
            'centro_costo'                   => $validated['centro_costo'],
            'estado_operativo'               => 'Activo',
            'fecha_ingreso'                  => now(),
        ]);

        $admin->syncRoles([$validated['rol']]);

        // Registrar en Historial de Administradores (Trazabilidad en Mi Perfil)
        if (Auth::id()) {
            AuditAdmin::create([
                'id_usuario'          => Auth::id(),
                'id_usuario_afectado' => $admin->id,
                'accion'              => "Alta de Administrador ({$admin->rol}) habilitado para SSO",
                'fecha_evento'        => now(),
                'estado_resultante'   => 'Activo',
            ]);
        }

        return redirect()->route('roles.index')->with('success', "Administrador {$admin->nombre_completo} habilitado para Acceso.");    
        }

    /**
     * Actualiza el rol o el estado operativo de un Administrador respetando la UserPolicy.
     */
    #[Middleware('permission:asignar_permisos')]
    public function updateAdmin(Request $request, User $user): RedirectResponse
    {
        // 1. Verificar UserPolicy (Bloquea si intentan tocar al Desarrollador)
        Gate::authorize('updateAdmin', $user);

        $rolesPermitidos = Role::whereNotIn('name', ['Operario', 'Supervisor'])->pluck('name')->toArray();

        $validated = $request->validate([
            'rol'              => ['required', 'string', Rule::in($rolesPermitidos)],
            'estado_operativo' => ['required', Rule::in(['Activo', 'Inactivo', 'Suspendido'])],
        ]);

        // 2. REGLA ANTI-SUICIDIO DE ROL: Un SuperAdmin no puede quitarse el rol SuperAdmin a sí mismo
        if ($request->user()->id === $user->id && $user->hasRole('SuperAdmin') && $validated['rol'] !== 'SuperAdmin') {
            return redirect()->back()->withErrors([
                'rol' => 'No puedes quitarte a ti mismo el rol de SuperAdmin.',
            ]);
        }

        // 3. REGLA ANTI-SUICIDIO DE ESTADO: Nadie puede suspender su propia cuenta
        if ($request->user()->id === $user->id && $validated['estado_operativo'] !== 'Activo') {
            Gate::authorize('deleteOrSuspendAdmin', $user); // Lanzará 403 o podemos retornar error amigable
        }

        $user->update([
            'rol'              => $validated['rol'],
            'estado_operativo' => $validated['estado_operativo'],
        ]);

        $user->syncRoles([$validated['rol']]);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        if (Auth::id()) {
            AuditAdmin::create([
                'id_usuario'          => Auth::id(),
                'id_usuario_afectado' => $user->id,
                'accion'              => "Actualización de privilegios administrativos a Rol: {$validated['rol']}",
                'fecha_evento'        => now(),
                'estado_resultante'   => $validated['estado_operativo'],
            ]);
        }

        return redirect()->back()->with('success', "Privilegios de {$user->nombre_completo} actualizados.");
    }
}