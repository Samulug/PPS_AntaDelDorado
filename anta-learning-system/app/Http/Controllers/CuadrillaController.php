<?php

namespace App\Http\Controllers;

use App\Models\Cuadrilla;
use App\Models\Curso;
use App\Models\ProgresoCurso;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CuadrillaController extends Controller
{
    /**
     * Renderiza la página dedicada exclusivamente a Cuadrillas de Entrenamiento.
     */
    public function index(): Response
    {
        $cuadrillas = Cuadrilla::with([
            'colaboradores:id,nombre_completo,dni,legajo,rol,zona_geografica_establecimient,centro_costo,estado_operativo',
            'progresosCursos.curso:id_curso,nombre',
        ])->orderByDesc('updated_at')->get();

        $users = User::whereIn('rol', ['Operario', 'Supervisor'])
            ->where('estado_operativo', 'Activo')
            ->orderBy('nombre_completo')
            ->get([
                'id',
                'nombre_completo',
                'dni',
                'legajo',
                'rol',
                'zona_geografica_establecimient',
                'centro_costo',
                'estado_operativo',
            ]);

        $cursosDisponibles = Curso::where('estado_curso', 'Activo')
            ->orderBy('nombre')
            ->get(['id_curso', 'nombre', 'descripcion', 'tiempo_vigencia']);

        return Inertia::render('Cuadrillas/Index', [
            'cuadrillas'        => $cuadrillas,
            'users'             => $users,
            'cursosDisponibles' => $cursosDisponibles,
        ]);
    }

    /**
     * Autoguarda o actualiza una cuadrilla en estado "Borrador" mientras se navega entre los pasos.
     */
    public function saveDraft(Request $request)
    {
        $validated = $request->validate([
            'id_cuadrilla'     => 'nullable|exists:cuadrilla,id_cuadrilla',
            'nombre_cuadrilla' => 'required|string|max:255',
            'labor_asociada'   => 'nullable|string|max:255',
            'colaboradores'    => 'nullable|array',
            'colaboradores.*'  => 'exists:users,id',
            'cursos'           => 'nullable|array',
            'cursos.*'         => 'exists:curso,id_curso',
        ]);

        return DB::transaction(function () use ($validated) {
            if (!empty($validated['id_cuadrilla'])) {
                $cuadrilla = Cuadrilla::findOrFail($validated['id_cuadrilla']);
                $cuadrilla->update([
                    'nombre_cuadrilla'     => $validated['nombre_cuadrilla'],
                    'labor_asociada'       => $validated['labor_asociada'] ?? '',
                    'estado'               => 'Borrador',
                    'cursos_borrador_json' => $validated['cursos'] ?? [],
                ]);
            } else {
                // Evita duplicar borradores con el mismo nombre si hubo microcorte de red
                $cuadrilla = Cuadrilla::updateOrCreate(
                    [
                        'nombre_cuadrilla' => $validated['nombre_cuadrilla'],
                        'estado'           => 'Borrador',
                    ],
                    [
                        'labor_asociada'       => $validated['labor_asociada'] ?? '',
                        'fecha_creacion'       => now()->toDateString(),
                        'cursos_borrador_json' => $validated['cursos'] ?? [],
                    ]
                );
            }

            if (isset($validated['colaboradores'])) {
                $syncData = [];
                foreach ($validated['colaboradores'] as $userId) {
                    $syncData[$userId] = ['fecha_asignacion' => now()->toDateString()];
                }
                $cuadrilla->colaboradores()->sync($syncData);
            }

            return response()->json([
                'id_cuadrilla' => $cuadrilla->id_cuadrilla,
                'estado'       => 'Borrador',
                'updated_at'   => now()->format('H:i:s'),
            ]);
        });
    }

    /**
     * Finaliza la creación (o activación desde un borrador) de la cuadrilla y asigna los cursos.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_cuadrilla'     => 'nullable|exists:cuadrilla,id_cuadrilla',
            'nombre_cuadrilla' => 'required|string|max:255',
            'labor_asociada'   => 'required|string|max:255',
            'estado'           => 'required|in:Activa,Inactiva,Borrador',
            'colaboradores'    => 'required|array|min:1',
            'colaboradores.*'  => 'exists:users,id',
            'cursos'           => 'nullable|array',
            'cursos.*'         => 'exists:curso,id_curso',
        ]);

        DB::transaction(function () use ($validated) {
            if (!empty($validated['id_cuadrilla'])) {
                $cuadrilla = Cuadrilla::findOrFail($validated['id_cuadrilla']);
                $cuadrilla->update([
                    'nombre_cuadrilla'     => $validated['nombre_cuadrilla'],
                    'labor_asociada'       => $validated['labor_asociada'],
                    'estado'               => $validated['estado'],
                    'cursos_borrador_json' => $validated['cursos'] ?? [],
                ]);
            } else {
                $cuadrilla = Cuadrilla::create([
                    'nombre_cuadrilla'     => $validated['nombre_cuadrilla'],
                    'labor_asociada'       => $validated['labor_asociada'],
                    'fecha_creacion'       => now()->toDateString(),
                    'estado'               => $validated['estado'],
                    'cursos_borrador_json' => $validated['cursos'] ?? [],
                ]);
            }

            $syncData = [];
            foreach ($validated['colaboradores'] as $userId) {
                $syncData[$userId] = ['fecha_asignacion' => now()->toDateString()];
            }
            $cuadrilla->colaboradores()->sync($syncData);

            // Si la cuadrilla pasa a Activa, generamos las inscripciones en progreso_curso
            if ($validated['estado'] === 'Activa' && !empty($validated['cursos'])) {
                foreach ($validated['colaboradores'] as $userId) {
                    foreach ($validated['cursos'] as $cursoId) {
                        ProgresoCurso::firstOrCreate(
                            [
                                'id_usuario'   => $userId,
                                'id_curso'     => $cursoId,
                                'id_cuadrilla' => $cuadrilla->id_cuadrilla,
                            ],
                            [
                                'fecha_inicio'      => now()->toDateString(),
                                'porcentaje_avance' => 0,
                                'estado'            => 'Pendiente',
                            ]
                        );
                    }
                }
            }
        });

        return redirect()->route('cuadrillas.index')
            ->with('success', 'Cuadrilla guardada y activada correctamente.');
    }

    /**
     * Actualiza una cuadrilla existente.
     */
    public function update(Request $request, Cuadrilla $cuadrilla)
    {
        $request->merge(['id_cuadrilla' => $cuadrilla->id_cuadrilla]);
        return $this->store($request);
    }

    /**
     * Elimina una cuadrilla (Borrador, Activa o Inactiva).
     */
    public function destroy(Cuadrilla $cuadrilla)
    {
        $cuadrilla->delete();

        return redirect()->route('cuadrillas.index')
            ->with('success', 'Cuadrilla eliminada permanentemente.');
    }

    public function create(): Response
    {
        $users = User::whereIn('rol', ['Operario', 'Supervisor'])
            ->where('estado_operativo', 'Activo')
            ->orderBy('nombre_completo')
            ->get([
                'id',
                'nombre_completo',
                'dni',
                'legajo',
                'rol',
                'zona_geografica_establecimient',
            ]);

        $cursosDisponibles = Curso::where('estado_curso', 'Activo')
            ->orderBy('nombre')
            ->get(['id_curso', 'nombre', 'descripcion']);

        return Inertia::render('Cuadrillas/Create', [
            'users'             => $users,
            'cursosDisponibles' => $cursosDisponibles,
        ]);
    }

    /**
     * Renderiza la página del Wizard para Editar (o continuar un Borrador)
     */
    public function edit(Cuadrilla $cuadrilla): Response
    {
        // Cargamos las relaciones necesarias
        $cuadrilla->load([
            'colaboradores:id', 
            'progresosCursos:id_progreso,id_curso'
        ]);

        $users = User::whereIn('rol', ['Operario', 'Supervisor'])
            ->where('estado_operativo', 'Activo')
            ->orderBy('nombre_completo')
            ->get([
                'id',
                'nombre_completo',
                'dni',
                'legajo',
                'rol',
                'zona_geografica_establecimient',
            ]);

        $cursosDisponibles = Curso::where('estado_curso', 'Activo')
            ->orderBy('nombre')
            ->get(['id_curso', 'nombre', 'descripcion']);

        return Inertia::render('Cuadrillas/Update', [
            'cuadrillaEditable' => $cuadrilla,
            'users'             => $users,
            'cursosDisponibles' => $cursosDisponibles,
        ]);
    }
}