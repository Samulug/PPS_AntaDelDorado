<?php

namespace App\Exports;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ColaboradoresExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    use Exportable;

    protected array $filters;
    protected array $estadosPorFila = [];

    public function __construct(array $filters = [])
    {
        $this->filters = $filters;
    }

    public function query(): Builder
    {
        $buscar = $this->filters['buscar'] ?? '';
        $rol = $this->filters['rol'] ?? '';
        $zona = $this->filters['zona'] ?? '';
        $estado = $this->filters['estado'] ?? '';
        $orden = $this->filters['orden'] ?? 'nombre_completo';
        $direccion = $this->filters['direccion'] ?? 'asc';

        return User::with(['progresos.curso', 'cuadrillas'])
            ->when($buscar !== '', function ($q) use ($buscar) {
                $q->where(function ($sub) use ($buscar) {
                    $sub->where('nombre_completo', 'ilike', "%{$buscar}%")
                        // En PostgreSQL debes castear los enteros a texto para poder usar LIKE/ILIKE
                        ->orWhereRaw('CAST(dni AS TEXT) ILIKE ?', ["%{$buscar}%"])
                        ->orWhereRaw('CAST(legajo AS TEXT) ILIKE ?', ["%{$buscar}%"])
                        ->orWhere('email', 'ilike', "%{$buscar}%");
                });
            })
            ->when($rol !== '', fn($q) => $q->where('rol', $rol))
            ->when($zona !== '', fn($q) => $q->where('zona_geografica_establecimient', $zona))
            ->when($estado !== '', fn($q) => $q->where('estado_operativo', $estado))
            ->orderBy($orden, $direccion);
    }

    public function headings(): array
    {
        return [
            'Legajo',
            'DNI',
            'Nombre Completo',
            'Correo Electrónico',
            'Rol',
            'Nodo / Planta',
            'Estado Operativo',
            'Cuadrillas Asignadas',
            'Avance Promedio (%)',
            'Cursos Completados',
            'Cursos Bloqueados / Demorados',
        ];
    }

    public function map($user): array
    {
        // Guardamos el estado para pintar la fila en styles()
        $this->estadosPorFila[] = $user->estado_operativo;

        $cuadrillasStr = $user->cuadrillas->pluck('nombre_cuadrilla')->implode(', ') ?: 'Sin cuadrilla';

        $totalCursos = $user->progresos->count();
        $avancePromedio = $totalCursos > 0
            ? round($user->progresos->avg('porcentaje_avance')) . '%'
            : '0%';

        $completados = $user->progresos
            ->where('estado', 'Completado')
            ->pluck('curso.nombre')
            ->filter()
            ->implode(', ') ?: 'Ninguno';

        $bloqueados = $user->progresos
            ->whereIn('estado', ['Bloqueado', 'Vencido'])
            ->pluck('curso.nombre')
            ->filter()
            ->implode(', ') ?: 'Sin alertas';

        return [
            $user->legajo ?? '-',
            $user->dni ?? '-',
            $user->nombre_completo,
            $user->email,
            $user->rol,
            $user->zona_geografica_establecimient ?? 'Las Lajitas',
            $user->estado_operativo,
            $cuadrillasStr,
            $avancePromedio,
            $completados,
            $bloqueados,
        ];
    }

    public function styles(Worksheet $sheet): array| null
    {
        $highestRow = $sheet->getHighestRow();
        $highestColumn = $sheet->getHighestColumn();
        $fullRange = "A1:{$highestColumn}{$highestRow}";

        // 1. Estilo del Encabezado (Fila 1): Fondo verde corporativo (#2F6F5E), texto blanco, centrado y en negrita
        $sheet->getStyle("A1:{$highestColumn}1")->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '2F6F5E'],
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(26);

        // 2. Bordes a toda la tabla resultante y alineación vertical
        $sheet->getStyle($fullRange)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'D1D5DB'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Centrar columnas cortas (Legajo, DNI, Rol, Nodo, Estado, Avance)
        foreach (['A', 'B', 'E', 'F', 'G', 'I'] as $col) {
            $sheet->getStyle("{$col}2:{$col}{$highestRow}")
                ->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        // 3. Pintar cada fila suavemente según el Estado Operativo del colaborador
        foreach ($this->estadosPorFila as $index => $estado) {
            $rowNumber = $index + 2; // +2 porque la fila 1 es el encabezado
            $colorFondo = match ($estado) {
                'Activo' => 'F0FDF4',     // Verde muy suave (legible)
                'Inactivo' => 'FEE2E2',   // Rojo suave
                'Vacaciones' => 'EFF6FF', // Azul suave
                'Lesionado', 'Enfermo', 'Siniestrado' => 'FEF3C7', // Ámbar suave de alerta
                default => 'FFFFFF',
            };

            $sheet->getStyle("A{$rowNumber}:{$highestColumn}{$rowNumber}")->applyFromArray([
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $colorFondo],
                ],
            ]);
            $sheet->getRowDimension($rowNumber)->setRowHeight(20);
        }

        return [];
    }
}