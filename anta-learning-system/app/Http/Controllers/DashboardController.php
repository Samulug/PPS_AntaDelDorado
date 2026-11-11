<?php

namespace App\Http\Controllers;
use Illuminate\Routing\Attributes\Controllers\Middleware;
use App\Models\Curso;
use App\Models\Cuadrilla;
use App\Models\ProgresoCurso;
use App\Models\TicketConsulta;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

use App\Exports\ColaboradoresExport;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;

#[Middleware('permission:ver_metricas')]
class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        // Filtro Global
        $zona = $request->input('zona', null);

        // operarios activos filtrando por zona si existe
        $totalActivos = User::where('rol', 'Operario')
            ->where('estado_operativo', 'Activo')
            ->when($zona, fn($q) => $q->where('zona_geografica_establecimient', $zona))
            ->count();

        // % de cumplimiento global promediando la tabla de progresos
        $promedioCumplimiento = ProgresoCurso::when($zona, fn($q) => 
                $q->whereHas('usuario', fn($u) => $u->where('zona_geografica_establecimient', $zona))
            )->avg('porcentaje_avance') ?? 0;

        // operarios que reprobaron 3 veces o se les venció el curso
        $alertasBloqueados = ProgresoCurso::whereIn('estado', ['Bloqueado', 'Vencido'])
            ->when($zona, fn($q) => 
                $q->whereHas('usuario', fn($u) => $u->where('zona_geografica_establecimient', $zona))
            )->count();

        // tickets enviados por la App Móvil sin responder
        $ticketsPendientes = TicketConsulta::where('estado_ticket', 'Pendiente')
            ->when($zona, fn($q) => 
                $q->whereHas('colaborador', fn($u) => $u->where('zona_geografica_establecimient', $zona))
            )->count();

        $metrics = [
            'total_activos'        => $totalActivos,
            'indice_cumplimiento'  => round($promedioCumplimiento, 1),
            'alertas_bloqueados'   => $alertasBloqueados,
            'tickets_pendientes'   => $ticketsPendientes,
        ];

        // estados de los cursos
        $estadosCursos = ProgresoCurso::select('estado', DB::raw('count(*) as total'))
            ->when($zona, fn($q) => 
                $q->whereHas('usuario', fn($u) => $u->where('zona_geografica_establecimient', $zona))
            )
            ->groupBy('estado')
            ->get()
            ->map(fn ($item) => [
                'name'  => $item->estado, //"Completado", "En_Curso", "Bloqueado"
                'value' => (int) $item->total,
            ]);

        // avance por cuadrilla
        // withAvg: traer directamente el promedio de las relaciones
        $avancePorCuadrilla = Cuadrilla::where('estado', true)
            ->withAvg('progresosCursos', 'porcentaje_avance')
            ->take(5) // mostramos top 5 de cuadrillas activas
            ->get()
            ->map(fn ($cuadrilla) => [
                'name' => $cuadrilla->nombre_cuadrilla,
                'avance' => round($cuadrilla->progresos_cursos_avg_porcentaje_avance ?? 0, 1)
            ]);

        // top 5 operarios bloqueados
        //eager loading: solo los datos necesarios usando (with)
        // top 5 operarios bloqueados
        $colaboradoresBloqueados = ProgresoCurso::with([
                // Corregido: Solicitamos 'id' porque así se llama la PK en la tabla users
                'usuario:id,nombre_completo,legajo,zona_geografica_establecimient',
                'curso:id_curso,nombre'
            ])
            ->where('estado', 'Bloqueado')
            ->when($zona, fn($q) => 
                $q->whereHas('usuario', fn($u) => $u->where('zona_geografica_establecimient', $zona))
            )
            ->latest('updated_at')
            ->take(5)
            ->get();

        $cursosProblematicos = Curso::withCount(['progresos as bloqueos_count' => fn($q) => 
                $q->where('estado', 'Bloqueado')
            ])
            ->orderByDesc('bloqueos_count')
            ->take(3)
            ->get()
            ->map(fn ($curso) => [
                'id_curso' => $curso->id_curso,
                'nombre'   => $curso->nombre,
                'bloqueos' => $curso->bloqueos_count
            ]);

        return Inertia::render('Dashboard', [
            'filtros'                 => ['zona' => $zona],
            'metrics'                 => $metrics,
            'estadosCursos'           => $estadosCursos,
            'avancePorCuadrilla'      => $avancePorCuadrilla,
            'colaboradoresBloqueados' => $colaboradoresBloqueados,
            'cursosProblematicos'     => $cursosProblematicos,
        ]);
    }

    /**
     * Genera y descarga (o previsualiza) el Reporte Ejecutivo en PDF del Dashboard (A4 Horizontal)
     */
    public function exportPdf(Request $request)
    {
        $zona = $request->input('zona');

        // Reutilizamos las métricas filtradas por zona
        $usuariosActivosQuery = User::where('rol', 'Operario')
            ->where('estado_operativo', 'Activo')
            ->when($zona, fn($q) => $q->where('zona_geografica_establecimient', $zona));

        $totalActivos = $usuariosActivosQuery->count();

        $progresosQuery = ProgresoCurso::with(['usuario', 'curso'])
            ->when($zona, function ($q) use ($zona) {
                $q->whereHas('usuario', fn($u) => $u->where('zona_geografica_establecimient', $zona));
            });

        $indiceCumplimiento = round((clone $progresosQuery)->avg('porcentaje_avance') ?? 0);

        $colaboradoresBloqueados = (clone $progresosQuery)
            ->whereIn('estado', ['Bloqueado', 'Vencido', 'En_Curso'])
            ->orderByRaw("CASE WHEN estado = 'Bloqueado' THEN 1 WHEN estado = 'Vencido' THEN 2 ELSE 3 END")
            ->get();

        $alertasBloqueados = (clone $progresosQuery)->whereIn('estado', ['Bloqueado', 'Vencido'])->count();
        $ticketsPendientes = TicketConsulta::where('estado_ticket', 'Pendiente')->count();

        $cursosProblematicos = Curso::withCount([
            'progresos as bloqueos' => function ($q) use ($zona) {
                $q->where('estado', 'Bloqueado')
                  ->when($zona, fn($sub) => $sub->whereHas('usuario', fn($u) => $u->where('zona_geografica_establecimient', $zona)));
            }
        ])->orderByDesc('bloqueos')->take(8)->get()->map(fn($c) => [
            'id_curso' => $c->id_curso,
            'nombre'   => $c->nombre,
            'bloqueos' => $c->bloqueos,
        ]);

        $avancePorCuadrilla = Cuadrilla::with('progresosCursos')->get()->map(fn($cuad) => [
            'name'   => $cuad->nombre_cuadrilla,
            'avance' => round($cuad->progresosCursos->avg('porcentaje_avance') ?? 0),
        ]);

        $pdf = Pdf::loadView('reportes.dashboard-pdf', [
            'zona'                    => $zona,
            'fechaGeneracion'         => now()->format('d/m/Y H:i'),
            'emitidoPor'              => $request->user()?->nombre_completo ?? 'RRHH Admin',
            'metrics'                 => [
                'total_activos'       => $totalActivos,
                'indice_cumplimiento' => $indiceCumplimiento,
                'alertas_bloqueados'  => $alertasBloqueados,
                'tickets_pendientes'  => $ticketsPendientes,
            ],
            'colaboradoresBloqueados' => $colaboradoresBloqueados,
            'cursosProblematicos'     => $cursosProblematicos,
            'avancePorCuadrilla'      => $avancePorCuadrilla,
        ])->setPaper('a4', 'landscape'); // Orientación A4 horizontal como pide la guía

        $sufijoZona = $zona ? '-' . \Illuminate\Support\Str::slug($zona) : '-global';
        return $pdf->download("reporte-inducciones{$sufijoZona}-" . now()->format('Ymd') . ".pdf");
    }

    /**
     * Descarga el Excel desde el Dashboard respetando el filtro de Zona Geográfica
     */
    public function exportExcel(Request $request)
    {
        $filtros = [
            'zona'      => $request->input('zona', ''),
            'orden'     => 'nombre_completo',
            'direccion' => 'asc',
        ];

        $sufijoZona = $filtros['zona'] ? '_' . \Illuminate\Support\Str::slug($filtros['zona']) : '_global';
        return Excel::download(
            new ColaboradoresExport($filtros),
            "nomina_inducciones{$sufijoZona}_" . now()->format('Ymd') . ".xlsx"
        );
    }
}