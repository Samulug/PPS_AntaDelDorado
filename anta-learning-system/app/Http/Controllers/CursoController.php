<?php

namespace App\Http\Controllers;
use Illuminate\Routing\Attributes\Controllers\Middleware;
use App\Services\MultimediaService;
use App\Models\AuditAdmin;
use App\Models\Cuestionario;
use App\Models\Curso;
use App\Models\Leccion;
use App\Models\Modulo;
use App\Models\Opcion;
use App\Models\Pregunta;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CursoController extends Controller
{
    /**
     * Listado principal de cursos para la tabla rápida.
     */
    #[Middleware('permission:listar_cursos')]
    public function index(): Response
    {
        $cursos = Curso::with([
            'cursoRequisito:id_curso,nombre',
        ])
        ->withCount('modulos')
        ->orderByDesc('updated_at')
        ->get();

        return Inertia::render('cursos/index', [
            'cursos' => $cursos,
        ]);
    }

    /**
     * Vista de creación procedimental (3 secciones) con soporte de borrador.
     */
    #[Middleware('permission:crear_curso')]
    public function create(MultimediaService $multimedia): Response
    {
        $cursosDisponibles = Curso::where('estado_curso', 'Activo')
            ->orderBy('nombre')
            ->get(['id_curso', 'nombre']);

        return Inertia::render('cursos/create', [
            'cursosDisponibles' => $cursosDisponibles,
            'repositorioSharepoint' => $multimedia->listarRepositorio(),
        ]);
    }

    /**
     * Autoguarda el curso en estado "Borrador" al avanzar de sección o salir.
     */
    #[Middleware('permission:crear_curso')]
    public function saveDraft(Request $request)
    {
        $validated = $request->validate([
            'id_curso'        => 'nullable|exists:curso,id_curso',
            'nombre'          => 'required|string|max:255',
            'descripcion'     => 'nullable|string',
            'tiempo_vigencia' => 'nullable|date',
            'id_curso_req'    => 'nullable|exists:curso,id_curso',
            'modulos'         => 'nullable|array',
            'cuestionario'    => 'nullable|array',
        ]);

        return DB::transaction(function () use ($validated) {
            if (!empty($validated['id_curso'])) {
                $curso = Curso::findOrFail($validated['id_curso']);
                $curso->update([
                    'nombre'          => $validated['nombre'],
                    'descripcion'     => $validated['descripcion'] ?? 'Borrador en progreso',
                    'tiempo_vigencia' => $validated['tiempo_vigencia'] ?? now()->addYear()->toDateString(),
                    'estado_curso'    => 'Borrador',
                    'id_curso_req'    => $validated['id_curso_req'] ?? null,
                ]);
            } else {
                $curso = Curso::updateOrCreate(
                    [
                        'nombre'       => $validated['nombre'],
                        'estado_curso' => 'Borrador',
                    ],
                    [
                        'descripcion'        => $validated['descripcion'] ?? 'Borrador en progreso',
                        'tiempo_vigencia'    => $validated['tiempo_vigencia'] ?? now()->addYear()->toDateString(),
                        'id_curso_req'       => $validated['id_curso_req'] ?? null,
                        'version_trimestral' => 1,
                    ]
                );
            }

            $this->syncEstructuraYExamen($curso, $validated['modulos'] ?? [], $validated['cuestionario'] ?? null);

            return response()->json([
                'id_curso'     => $curso->id_curso,
                'estado_curso' => 'Borrador',
                'updated_at'   => now()->format('H:i:s'),
            ]);
        });
    }

    /**
     * Guarda finalmente el curso desde el creador.
     */
    #[Middleware('permission:crear_curso')]
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'id_curso'        => 'nullable|exists:curso,id_curso',
            'nombre'          => 'required|string|max:255',
            'descripcion'     => 'nullable|string',
            'tiempo_vigencia' => 'required|date',
            'estado_curso'    => 'required|in:Activo,Borrador,Inactivo',
            'id_curso_req'    => 'nullable|exists:curso,id_curso',
            'modulos'         => 'required|array|min:1',
            'cuestionario'    => 'required|array',
        ]);

        $curso = DB::transaction(function () use ($validated) {
            if (!empty($validated['id_curso'])) {
                $curso = Curso::findOrFail($validated['id_curso']);
                $curso->update([
                    'nombre'          => $validated['nombre'],
                    'descripcion'     => $validated['descripcion'] ?? '',
                    'tiempo_vigencia' => $validated['tiempo_vigencia'],
                    'estado_curso'    => $validated['estado_curso'],
                    'id_curso_req'    => $validated['id_curso_req'] ?? null,
                ]);
            } else {
                $curso = Curso::create([
                    'nombre'             => $validated['nombre'],
                    'descripcion'        => $validated['descripcion'] ?? '',
                    'tiempo_vigencia'    => $validated['tiempo_vigencia'],
                    'estado_curso'       => $validated['estado_curso'],
                    'id_curso_req'       => $validated['id_curso_req'] ?? null,
                    'version_trimestral' => 1,
                ]);
            }

            $this->syncEstructuraYExamen($curso, $validated['modulos'], $validated['cuestionario']);

            if (Auth::id()) {
                AuditAdmin::create([
                    'id_usuario'        => Auth::id(),
                    'id_curso'          => $curso->id_curso,
                    'accion'            => 'Creación / Publicación de curso',
                    'fecha_evento'      => now(),
                    'estado_resultante' => $validated['estado_curso'],
                ]);
            }

            return $curso;
        });

        return redirect()->route('cursos.index')
            ->with('success', "Curso \"{$curso->nombre}\" guardado correctamente.");
    }

    /**
     * Ficha completa de un curso (Show).
     */

    #[Middleware('permission:listar_cursos')]
    public function show($id): Response
    {
        $curso = Curso::with([
            'cursoRequisito:id_curso,nombre',
            'modulos.lecciones.cuestionario.preguntas.opciones',
        ])->findOrFail($id);

        return Inertia::render('cursos/show', [
            'curso' => $curso,
        ]);
    }

    /**
     * Vista de edición con salto libre entre secciones (Update).
     */
    #[Middleware('permission:editar_curso')]    public function edit($id, MultimediaService $multimedia): Response
    {
        $curso = Curso::with([
            'modulos.lecciones.cuestionario.preguntas.opciones',
        ])->findOrFail($id);

        $cursosDisponibles = Curso::where('id_curso', '!=', $curso->id_curso)
            ->orderBy('nombre')
            ->get(['id_curso', 'nombre']);

        return Inertia::render('cursos/update', [
            'cursoEditable'     => $curso,
            'cursosDisponibles' => $cursosDisponibles,
            'repositorioSharepoint' => $multimedia->listarRepositorio(),
        ]);
    }

    /**
     * Actualiza un curso existente y redirige a su vista Show.
     */
    #[Middleware('permission:editar_curso')]
    public function update(Request $request, $id): RedirectResponse
    {
        $curso = Curso::findOrFail($id);

        $validated = $request->validate([
            'nombre'          => 'required|string|max:255',
            'descripcion'     => 'nullable|string',
            'tiempo_vigencia' => 'required|date',
            'estado_curso'    => 'required|in:Activo,Borrador,Inactivo',
            'id_curso_req'    => 'nullable|exists:curso,id_curso',
            'modulos'         => 'required|array|min:1',
            'cuestionario'    => 'required|array',
        ]);

        DB::transaction(function () use ($curso, $validated) {
            $curso->update([
                'nombre'             => $validated['nombre'],
                'descripcion'        => $validated['descripcion'] ?? '',
                'tiempo_vigencia'    => $validated['tiempo_vigencia'],
                'estado_curso'       => $validated['estado_curso'],
                'id_curso_req'       => $validated['id_curso_req'] ?? null,
                'version_trimestral' => ($curso->version_trimestral ?? 1) + 1,
            ]);

            $this->syncEstructuraYExamen($curso, $validated['modulos'], $validated['cuestionario']);

            if (Auth::id()) {
                AuditAdmin::create([
                    'id_usuario'        => Auth::id(),
                    'id_curso'          => $curso->id_curso,
                    'accion'            => 'Actualización integral del curso',
                    'fecha_evento'      => now(),
                    'estado_resultante' => $validated['estado_curso'],
                ]);
            }
        });

        return redirect()->route('cursos.show', $curso->id_curso)
            ->with('success', 'Curso actualizado correctamente.');
    }

    /**
     * Cambio rápido de estado (Activo, Borrador, Inactivo) desde la tabla o desde el Show.
     */
    #[Middleware('permission:editar_curso')]
    public function updateStatus(Request $request, $id): RedirectResponse
    {
        $curso = Curso::findOrFail($id);

        $validated = $request->validate([
            'estado_curso' => 'required|in:Activo,Borrador,Inactivo',
        ]);

        $curso->update([
            'estado_curso' => $validated['estado_curso'],
        ]);

        if (Auth::id()) {
            AuditAdmin::create([
                'id_usuario'        => Auth::id(),
                'id_curso'          => $curso->id_curso,
                'accion'            => "Cambio rápido de estado a {$validated['estado_curso']}",
                'fecha_evento'      => now(),
                'estado_resultante' => $validated['estado_curso'],
            ]);
        }

        return redirect()->back()
            ->with('success', "Estado del curso actualizado a {$validated['estado_curso']}.");
    }

    /**
     * Eliminación definitiva del curso.
     */
    #[Middleware('permission:eliminar_curso')]
    public function destroy($id): RedirectResponse
    {
        $curso = Curso::findOrFail($id);
        $curso->delete();

        return redirect()->route('cursos.index')
            ->with('success', 'Curso eliminado permanentemente.');
    }

    /**
     * Reconstruye limpiamente Módulos, Contenidos (Video / PowerPoint) y el Cuestionario Final.
     */
    private function syncEstructuraYExamen(Curso $curso, array $modulosData, ?array $cuestionarioData): void
    {
        if (empty($modulosData)) {
            return;
        }

        // Limpiamos los módulos previos (la BD borra en cascada lecciones, cuestionarios, preguntas y opciones)
        $curso->modulos()->delete();

        $ultimoModulo = null;

        foreach ($modulosData as $idx => $modInput) {
            $tituloMod = trim($modInput['titulo'] ?? '') ?: 'Módulo ' . ($idx + 1);

            $modulo = Modulo::create([
                'id_curso'       => $curso->id_curso,
                'titulo'         => $tituloMod,
                'dia_liberacion' => $modInput['dia_liberacion'] ?? ($idx + 1),
                'orden'          => $idx + 1,
            ]);

            $ultimoModulo = $modulo;

            $contenidos = $modInput['contenidos'] ?? [];
            foreach ($contenidos as $cIdx => $cont) {
                $tituloCont = trim($cont['titulo'] ?? '');
                if (!$tituloCont) continue;

                Leccion::create([
                    'id_modulo'          => $modulo->id_modulo,
                    'titulo'             => $tituloCont,
                    'tipo_recurso'       => $cont['tipo_recurso'] ?? 'Video', // 'Video' o 'Presentacion_Filminas' (PowerPoint)
                    'id_sharepoint_item' => $cont['archivo_nombre'] ?? 'sp-item-prototipo',
                    'orden'              => $cIdx + 1,
                ]);
            }
        }

        // Vinculamos el Cuestionario al cierre del curso (como Lección evaluativa del último módulo)
        if ($ultimoModulo && !empty($cuestionarioData) && !empty($cuestionarioData['preguntas'])) {
            $leccionQuiz = Leccion::create([
                'id_modulo'          => $ultimoModulo->id_modulo,
                'titulo'             => 'Cuestionario de Evaluación',
                'tipo_recurso'       => 'Cuestionario',
                'id_sharepoint_item' => 'quiz-evaluacion-final',
                'orden'              => 99,
            ]);

            $totalPreguntas = count($cuestionarioData['preguntas']);
            $mostrar = (int) ($cuestionarioData['cantidad_preguntas_mostrar'] ?? $totalPreguntas);
            if ($mostrar > $totalPreguntas) {
                $mostrar = $totalPreguntas;
            }

            $cuestionario = Cuestionario::create([
                'id_leccion'                 => $leccionQuiz->id_leccion,
                'puntaje_min_aprobacion'     => (int) ($cuestionarioData['puntaje_min_aprobacion'] ?? 70),
                'max_intentos'               => 3,
                'orden_aleatorio'            => (bool) ($cuestionarioData['orden_aleatorio'] ?? true),
                'cantidad_preguntas_mostrar' => max(1, $mostrar),
            ]);

            foreach ($cuestionarioData['preguntas'] as $pregInput) {
                $enunciado = trim($pregInput['enunciado'] ?? '');
                if (!$enunciado) continue;

                $pregunta = Pregunta::create([
                    'id_cuestionario'      => $cuestionario->id_cuestionario,
                    'enunciado'            => $enunciado,
                    'explicacion_refuerzo' => $pregInput['explicacion_refuerzo'] ?? 'Repasá el contenido de los módulos del curso.',
                ]);

                $opciones = $pregInput['opciones'] ?? [];
                foreach ($opciones as $opInput) {
                    $textoOp = trim($opInput['texto_opcion'] ?? '');
                    if (!$textoOp) continue;

                    Opcion::create([
                        'id_pregunta'  => $pregunta->id_pregunta,
                        'texto_opcion' => $textoOp,
                        'es_correcta'  => (bool) ($opInput['es_correcta'] ?? false),
                    ]);
                }
            }
        }
    }

    public function uploadMultimedia(Request $request, MultimediaService $multimedia)
    {
        $request->validate([
            'archivo' => [
                'required',
                'file',
                'mimes:mp4,pdf,ppt,pptx',
                'max:102400', // Máx 100 MB
            ],
        ], [
            'archivo.mimes' => 'Formato no soportado. Subí un video .mp4 o una presentación en .pdf / .pptx.',
            'archivo.max'   => 'El archivo supera el límite de 100 MB.',
        ]);

        $datosArchivo = $multimedia->subirArchivo($request->file('archivo'));

        return response()->json([
            'ok'      => true,
            'mensaje' => 'Archivo subido y verificado correctamente.',
            'archivo' => $datosArchivo,
        ]);
    }
}