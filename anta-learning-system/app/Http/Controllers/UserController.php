<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * Lista los colaboradores para el Dashboard web.
     */
    public function index(Request $request): Response
    {
        $query = User::with('roles:id,name')
            // Filtramos para no mostrar al SuperAdmin en la tabla operativa si es necesario
            ->select('id', 'nombre_completo', 'dni', 'legajo', 'email', 'rol', 'zona_geografica_establecimient', 'estado_operativo')
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

        $cuadrillas = \App\Models\Cuadrilla::with([
            'colaboradores:id,nombre_completo,dni,legajo,rol,zona_geografica_establecimient,estado_operativo'
        ])->orderBy('id_cuadrilla', 'desc')->get();

        $cursosDisponibles = \App\Models\Curso::where('estado_curso', 'Activo')
            ->get(['id_curso', 'nombre']);

        return Inertia::render('Colaboradores/Index', [
            'users' => $query->get(),
            'filters' => $request->only('search')
        ]);
    }

    /**
     * Da de alta un nuevo colaborador individualmente.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nombre_completo' => 'required|string|max:255',
            'dni' => 'required|integer|unique:users,dni',
            'legajo' => 'required|integer|unique:users,legajo',
            'email' => 'required|string|email|max:255|unique:users,email', // Requerido por la BD
            'rol' => ['required', Rule::in(['Operario', 'Supervisor'])],
            'zona_geografica_establecimient' => 'required|string', // Nodo (ej. Las Lajitas)
            'centro_costo' => 'required|string', // Departamento (ej. Cosecha, Empaque)
        ]);

        // Estrategia: Contraseña por defecto (DNI)
        $validated['password'] = Hash::make($validated['dni']);
        
        // Asignación de estados iniciales
        $validated['estado_operativo'] = 'Activo';
        $validated['fecha_ingreso'] = now();
        
        // Flag booleano para disparar la pantalla bloqueante en Flutter
        $validated['must_change_password'] = true; 

        $user = User::create($validated);
        $user->assignRole($validated['rol']);

        return redirect()->back()->with('success', 'Colaborador dado de alta exitosamente. Su contraseña inicial es su DNI.');
    }

    /**
     * Da de baja o suspende a un colaborador (Despido, renuncia, etc.)
     * Reemplaza el destroy() para mantener el historial de auditoría intacto.
     */
    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            // Estados basados en el prototipo y modelo de datos
            'estado_operativo' => ['required', Rule::in(['Activo', 'Inactivo', 'Suspendido', 'Vacaciones', 'Lesionado', 'Siniestrado'])]
        ]);

        $user->update(['estado_operativo' => $validated['estado_operativo']]);

        $mensaje = $validated['estado_operativo'] === 'Activo' 
            ? 'Colaborador reactivado correctamente.' 
            : 'Acceso del colaborador suspendido.';

        return redirect()->back()->with('success', $mensaje);
    }

    /**
     * Fuerza el restablecimiento de credenciales desde el panel de RRHH.
     */
    public function forcePasswordReset(User $user): RedirectResponse
    {
        $user->update([
            'password' => Hash::make($user->dni),
            'must_change_password' => true
        ]);

        return redirect()->back()->with('success', 'Contraseña restablecida al DNI. Se requerirá un cambio obligatorio en el próximo ingreso.');
    }
}