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
private function resolveFechaDesde(?string $rango)
    {
        return match ($rango) {
            '7'   => now()->subDays(7),
            '30'  => now()->subDays(30),
            '90'  => now()->subDays(90),
            '365' => now()->subYear(),
            default => null,
        };
    }

    public function index(Request $request): Response
    {
        $zona  = $request->input('zona', null);
        $depto = $request->input('depto', null);
        $rango = $request->input('rango', 'todo');
        $fechaDesde = $this->resolveFechaDesde($rango);

        $filtrarProgreso = function ($query) use ($zona, $depto, $fechaDesde) {
            $query->when($zona || $depto, function ($q) use ($zona, $depto) {
                $q->whereHas('usuario', function ($u) use ($zona, $depto) {
                    $u->when($zona, fn($sq) => $sq->where('zona_geografica_establecimient', $zona))
                      ->when($depto, fn($sq) => $sq->where('centro_costo', $depto));
                });
            })->when($fechaDesde, fn($q) => $q->where('updated_at', '>=', $fechaDesde));
        };

        $totalActivos = User::where('rol', 'Operario')
            ->where('estado_operativo', 'Activo')
            ->when($zona, fn($q) => $q->where('zona_geografica_establecimient', $zona))
            ->when($depto, fn($q) => $q->where('centro_costo', $depto))
            ->count();

        $promedioCumplimiento = ProgresoCurso::tap($filtrarProgreso)
            ->avg('porcentaje_avance') ?? 0;

        $alertasBloqueados = ProgresoCurso::whereIn('estado', ['Bloqueado', 'Vencido'])
            ->tap($filtrarProgreso)
            ->count();

        $ticketsPendientes = TicketConsulta::whereIn('estado_ticket', ['Abierto', 'En Curso'])
            ->when($zona || $depto, function ($q) use ($zona, $depto) {
                $q->whereHas('colaborador', function ($u) use ($zona, $depto) {
                    $u->when($zona, fn($sq) => $sq->where('zona_geografica_establecimient', $zona))
                      ->when($depto, fn($sq) => $sq->where('centro_costo', $depto));
                });
            })
            ->when($fechaDesde, fn($q) => $q->where('created_at', '>=', $fechaDesde))
            ->count();

        $metrics = [
            'total_activos'       => $totalActivos,
            'indice_cumplimiento' => round($promedioCumplimiento, 1),
            'alertas_bloqueados'  => $alertasBloqueados,
            'tickets_pendientes'  => $ticketsPendientes,
        ];

        $estadosCursos = ProgresoCurso::select('estado', DB::raw('count(*) as total'))
            ->tap($filtrarProgreso)
            ->groupBy('estado')
            ->get()
            ->map(fn ($item) => [
                'name'  => $item->estado,
                'value' => (int) $item->total,
            ]);

        $avancePorCuadrilla = Cuadrilla::where('estado', 'Activa')
            ->when($zona || $depto, function ($q) use ($zona, $depto) {
                $q->whereHas('colaboradores', function ($u) use ($zona, $depto) {
                    $u->when($zona, fn($sq) => $sq->where('zona_geografica_establecimient', $zona))
                      ->when($depto, fn($sq) => $sq->where('centro_costo', $depto));
                });
            })
            ->with([
                'progresosCursos' => $filtrarProgreso,
                'colaboradores.progresos' => $filtrarProgreso,
            ])
            ->take(5)
            ->get()
            ->map(function ($cuadrilla) {
                $avgDirecto = $cuadrilla->progresosCursos->avg('porcentaje_avance');
                if ($avgDirecto === null) {
                    $progresosColabs = $cuadrilla->colaboradores->flatMap->progresos;
                    $avgDirecto = $progresosColabs->avg('porcentaje_avance');
                }
                return [
                    'name'   => $cuadrilla->nombre_cuadrilla,
                    'avance' => round($avgDirecto ?? 0, 1),
                ];
            });

        $colaboradoresBloqueados = ProgresoCurso::with([
                'usuario:id,nombre_completo,legajo,zona_geografica_establecimient,centro_costo',
                'curso:id_curso,nombre',
            ])
            ->where('estado', 'Bloqueado')
            ->tap($filtrarProgreso)
            ->latest('updated_at')
            ->take(5)
            ->get();

        $cursosProblematicos = Curso::withCount([
                'progresos as bloqueos_count' => fn($q) => $q->where('estado', 'Bloqueado')->tap($filtrarProgreso),
            ])
            ->orderByDesc('bloqueos_count')
            ->take(3)
            ->get()
            ->map(fn ($curso) => [
                'id_curso' => $curso->id_curso,
                'nombre'   => $curso->nombre,
                'bloqueos' => $curso->bloqueos_count,
            ]);

        return Inertia::render('Dashboard', [
            'filtros'                 => ['zona' => $zona, 'depto' => $depto, 'rango' => $rango],
            'metrics'                 => $metrics,
            'estadosCursos'           => $estadosCursos,
            'avancePorCuadrilla'      => $avancePorCuadrilla,
            'colaboradoresBloqueados' => $colaboradoresBloqueados,
            'cursosProblematicos'     => $cursosProblematicos,
        ]);
    }

    public function exportPdf(Request $request)
    {
        $zona  = $request->input('zona');
        $depto = $request->input('depto');
        $rango = $request->input('rango', 'todo');
        $fechaDesde = $this->resolveFechaDesde($rango);

        $rangoLabels = [
            '7'    => 'Últimos 7 días',
            '30'   => 'Últimos 30 días',
            '90'   => 'Últimos 90 días',
            '365'  => 'Último año',
            'todo' => 'Histórico completo',
        ];

        $filtrarProgreso = function ($query) use ($zona, $depto, $fechaDesde) {
            $query->when($zona || $depto, function ($q) use ($zona, $depto) {
                $q->whereHas('usuario', function ($u) use ($zona, $depto) {
                    $u->when($zona, fn($sq) => $sq->where('zona_geografica_establecimient', $zona))
                      ->when($depto, fn($sq) => $sq->where('centro_costo', $depto));
                });
            })->when($fechaDesde, fn($q) => $q->where('updated_at', '>=', $fechaDesde));
        };

        $totalActivos = User::where('rol', 'Operario')
            ->where('estado_operativo', 'Activo')
            ->when($zona, fn($q) => $q->where('zona_geografica_establecimient', $zona))
            ->when($depto, fn($q) => $q->where('centro_costo', $depto))
            ->count();

        $progresosQuery = ProgresoCurso::with(['usuario', 'curso'])->tap($filtrarProgreso);

        $indiceCumplimiento = round((clone $progresosQuery)->avg('porcentaje_avance') ?? 0);

        $colaboradoresBloqueados = (clone $progresosQuery)
            ->whereIn('estado', ['Bloqueado', 'Vencido', 'En_Curso'])
            ->orderByRaw("CASE WHEN estado = 'Bloqueado' THEN 1 WHEN estado = 'Vencido' THEN 2 ELSE 3 END")
            ->get();

        $alertasBloqueados = (clone $progresosQuery)->whereIn('estado', ['Bloqueado', 'Vencido'])->count();
        $ticketsPendientes = TicketConsulta::where('estado_ticket', 'Pendiente')
            ->when($zona || $depto, function ($q) use ($zona, $depto) {
                $q->whereHas('colaborador', function ($u) use ($zona, $depto) {
                    $u->when($zona, fn($sq) => $sq->where('zona_geografica_establecimient', $zona))
                      ->when($depto, fn($sq) => $sq->where('centro_costo', $depto));
                });
            })
            ->when($fechaDesde, fn($q) => $q->where('created_at', '>=', $fechaDesde))
            ->count();

        $cursosProblematicos = Curso::withCount([
            'progresos as bloqueos' => fn($q) => $q->where('estado', 'Bloqueado')->tap($filtrarProgreso),
        ])->orderByDesc('bloqueos')->take(8)->get()->map(fn($c) => [
            'id_curso' => $c->id_curso,
            'nombre'   => $c->nombre,
            'bloqueos' => $c->bloqueos,
        ]);

        $avancePorCuadrilla = Cuadrilla::where('estado', 'Activa')
            ->when($zona || $depto, function ($q) use ($zona, $depto) {
                $q->whereHas('colaboradores', function ($u) use ($zona, $depto) {
                    $u->when($zona, fn($sq) => $sq->where('zona_geografica_establecimient', $zona))
                      ->when($depto, fn($sq) => $sq->where('centro_costo', $depto));
                });
            })
            ->with([
                'progresosCursos' => $filtrarProgreso,
                'colaboradores.progresos' => $filtrarProgreso,
            ])
            ->take(5)
            ->get()
            ->map(function ($cuadrilla) {
                $avgDirecto = $cuadrilla->progresosCursos->avg('porcentaje_avance');
                if ($avgDirecto === null) {
                    $progresosColabs = $cuadrilla->colaboradores->flatMap->progresos;
                    $avgDirecto = $progresosColabs->avg('porcentaje_avance');
                }
                return [
                    'name'   => $cuadrilla->nombre_cuadrilla,
                    'avance' => round($avgDirecto ?? 0, 1),
                ];
            });

        $pdf = Pdf::loadView('reportes.dashboard-pdf', [
            'zona'                    => $zona,
            'depto'                   => $depto,
            'rangoLabel'              => $rangoLabels[$rango] ?? 'Histórico completo',
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
        ])->setPaper('a4', 'landscape');

        $sufijoZona = $zona ? '-' . \Illuminate\Support\Str::slug($zona) : '-global';
        return $pdf->download("reporte-inducciones{$sufijoZona}-" . now()->format('Ymd') . ".pdf");
    }

    public function exportExcel(Request $request)
    {
        $filtros = [
            'zona'      => $request->input('zona', ''),
            'depto'     => $request->input('depto', ''),
            'rango'     => $request->input('rango', 'todo'),
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