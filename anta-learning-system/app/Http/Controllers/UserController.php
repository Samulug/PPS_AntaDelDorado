<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\Auth;
use App\Models\AuditAdmin;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Attributes\Controllers\Middleware;
use Spatie\Permission\Models\Role;
use App\Exports\ColaboradoresExport;
use Maatwebsite\Excel\Facades\Excel;

class UserController extends Controller
{
    /**
     * Lista los colaboradores para el Dashboard web.
     */
    #[Middleware('permission:listar_colaboradores')]
    public function index(Request $request): Response
    {
        $query = User::with('roles:id,name')
            // Filtramos para no mostrar al SuperAdmin en la tabla operativa si es necesario
            ->select('id', 'nombre_completo', 'dni', 'legajo', 'email', 'rol', 'zona_geografica_establecimient','centro_costo' ,'estado_operativo')
            ->whereIn('rol', ['Operario', 'Supervisor']);

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('nombre_completo', 'ilike', "%{$search}%")
                  ->orWhere('dni', 'like', "%{$search}%")
                  ->orWhere('legajo', 'like', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('rol', 'ilike', "%{$search}%")
                  ->orWhere('zona_geografica_establecimient', 'ilike', "%{$search}%")
                  ->orWhere('centro_costo', 'ilike', "%{$search}%")
                  ->orWhere('estado_operativo', 'ilike', "%{$search}%");
            });
        }

        return Inertia::render('colaboradores/index', [
            'users' => $query->get(),
            'filters' => $request->only('search')
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('colaboradores/create');
    }

    /**
     * Da de alta un nuevo colaborador individualmente.
     */
    #[Middleware('permission:crear_colaborador')]
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nombre_completo' => 'required|string|max:255',
            'dni' => 'required|integer|unique:users,dni',
            'legajo' => 'required|integer|unique:users,legajo',
            'email' => 'required|string|email|max:255|unique:users,email', // Requerido por la BD
            'rol' => ['nullable', Rule::in(['Operario', 'Supervisor'])],
            'zona_geografica_establecimient' => 'required|string', // Nodo (ej. Las Lajitas)
            'centro_costo' => 'required|string', // Departamento (ej. Cosecha, Empaque)
        ]);

        $validated['rol'] = $validated['rol'] ?? 'Operario';
        $validated['password'] = Hash::make($validated['dni']);
        $validated['estado_operativo'] = 'Activo';
        $validated['fecha_ingreso'] = now();

        $user = User::create($validated);
        $user->assignRole($validated['rol']);

        if (Auth::id()) {
            AuditAdmin::create([
                'id_usuario'          => Auth::id(),
                'id_usuario_afectado' => $user->id,
                'accion'              => "Alta de usuario ({$user->rol})",
                'fecha_evento'        => now(),
                'estado_resultante'   => 'Activo',
            ]);
        }

        return redirect()->route('colaboradores.index')
            ->with('success', 'Colaborador dado de alta exitosamente. Su contraseña inicial es su DNI.');
    }

    #[Middleware('permission:listar_colaboradores')]
    public function show($id): Response
    {
        $colaborador = User::with([
            'progresos.curso:id_curso,nombre',
            'cuadrillas:id_cuadrilla,nombre_cuadrilla',
        ])->findOrFail($id);

        return Inertia::render('colaboradores/show', [
            'colaborador' => $colaborador,
        ]);
    }
    
    #[Middleware('permission:editar_colaborador')]
    public function edit($id): Response
    {
        $colaborador = User::findOrFail($id);

        return Inertia::render('colaboradores/update', [
            'colaborador' => $colaborador,
        ]);
    }

    /**
     * Actualiza y redirige de vuelta al Show con mensaje de confirmación.
     */
    #[Middleware('permission:editar_colaborador')]    
     public function update(Request $request, $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'nombre_completo'                => 'required|string|max:255',
            'dni'                            => ['required', 'integer', Rule::unique('users', 'dni')->ignore($user->id)],
            'legajo'                         => ['required', 'integer', Rule::unique('users', 'legajo')->ignore($user->id)],
            'email'                          => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'rol'                            => ['required', Rule::in(['Operario', 'Supervisor'])],
            'zona_geografica_establecimient' => 'required|string',
            'centro_costo'                   => 'required|string',
            'estado_operativo'               => ['required', Rule::in(['Activo', 'Inactivo', 'Suspendido', 'Vacaciones', 'Lesionado', 'Siniestrado'])],
        ]);

        $user->update($validated);
        $user->syncRoles([$validated['rol']]);

        if (Auth::id()) {
            AuditAdmin::create([
                'id_usuario'          => Auth::id(),
                'id_usuario_afectado' => $user->id,
                'accion'              => 'Actualización de ficha y datos de legajo',
                'fecha_evento'        => now(),
                'estado_resultante'   => $validated['estado_operativo'],
            ]);
        }

        return redirect()->route('colaboradores.show', $user->id)
            ->with('success', 'Datos del colaborador actualizados correctamente.');
    }

    #[Middleware('permission:suspender_colaborador')]
    public function updateStatus(Request $request, $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'estado_operativo' => ['required', Rule::in(['Activo', 'Inactivo', 'Suspendido', 'Vacaciones', 'Lesionado', 'Siniestrado'])],
        ]);

        $user->update(['estado_operativo' => $validated['estado_operativo']]);

        if (Auth::id()) {
            AuditAdmin::create([
                'id_usuario'          => Auth::id(),
                'id_usuario_afectado' => $user->id,
                'accion'              => "Cambio de estado operativo a {$validated['estado_operativo']}",
                'fecha_evento'        => now(),
                'estado_resultante'   => $validated['estado_operativo'],
            ]);
        }

        return redirect()->back()->with('success', "Estado actualizado a {$validated['estado_operativo']}.");
    }

    public function forcePasswordReset($id): RedirectResponse
    {
        $user = User::findOrFail($id);

        $user->update([
            'password'             => Hash::make($user->dni),
            'must_change_password' => true,
        ]);

        if (Auth::id()) {
            AuditAdmin::create([
                'id_usuario'          => Auth::id(),
                'id_usuario_afectado' => $user->id,
                'accion'              => 'Restablecimiento manual de contraseña al DNI',
                'fecha_evento'        => now(),
                'estado_resultante'   => $user->estado_operativo,
            ]);
        }

        return redirect()->back()->with('success', 'Contraseña restablecida al DNI.');
    }

    /**
     * Exporta la tabla de Colaboradores aplicando los mismos filtros y ordenamientos activos en React
     */
    public function export(Request $request)
    {
        $buscar = trim($request->input('buscar', ''));
        $rol = $request->input('rol', '');
        $zona = $request->input('zona', '');
        $estado = $request->input('estado', '');
        $orden = $request->input('orden', 'nombre_completo');
        $direccion = strtolower($request->input('direccion', 'asc'));

        $camposPermitidos = ['nombre_completo', 'legajo', 'dni', 'rol', 'estado_operativo'];
        if (!in_array($orden, $camposPermitidos, true)) {
            $orden = 'nombre_completo';
        }

        if (!in_array($direccion, ['asc', 'desc'], true)) {
            $direccion = 'asc';
        }

        $filtros = [
            'buscar'    => $buscar,
            'rol'       => $rol,
            'zona'      => $zona,
            'estado'    => $estado,
            'orden'     => $orden,
            'direccion' => $direccion,
        ];

        return Excel::download(
            new ColaboradoresExport($filtros),
            'directorio_colaboradores_' . now()->format('Ymd_His') . '.xlsx'
        );
    }
}