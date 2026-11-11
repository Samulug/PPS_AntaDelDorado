<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte Ejecutivo de Inducciones - Anta del Dorado</title>
    <style>
        @page {
            margin: 24px 30px;
        }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #1F2328;
            margin: 0;
            padding: 0;
        }
        /* Encabezado corporativo */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #2F6F5E;
            padding-bottom: 10px;
            margin-bottom: 16px;
        }
        .header-table td {
            border: none;
            padding: 0;
        }
        .company-tag {
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #2F6F5E;
            letter-spacing: 1px;
        }
        h1 {
            font-size: 20px;
            margin: 4px 0 2px 0;
            color: #1F2328;
            text-align: left;
        }
        .subtitle {
            font-size: 11px;
            color: #6B7280;
            margin: 0;
        }
        .meta-box {
            text-align: right;
            font-size: 10px;
            color: #4B5563;
            line-height: 1.5;
        }

        /* Tarjetas KPI en tabla (Dompdf soporta tablas mejor que Flexbox/Grid) */
        .kpi-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px 0;
            margin: 0 -8px 18px -8px;
        }
        .kpi-card {
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-top: 3px solid #2F6F5E;
            border-radius: 6px;
            padding: 10px 12px;
            width: 25%;
            vertical-align: top;
        }
        .kpi-card.alert {
            border-top-color: #B5651D;
            background-color: #FFFBEB;
        }
        .kpi-label {
            font-size: 10px;
            color: #6B7280;
            text-transform: uppercase;
            display: block;
            margin-bottom: 4px;
        }
        .kpi-value {
            font-size: 20px;
            font-weight: bold;
            color: #1F2328;
        }
        .kpi-sub {
            font-size: 9px;
            color: #6B7280;
            margin-top: 3px;
            display: block;
        }

        /* Secciones y Tablas de datos */
        h2 {
            font-size: 13px;
            color: #2F6F5E;
            margin: 14px 0 6px 0;
            border-left: 3px solid #2F6F5E;
            padding-left: 8px;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        table.data-table th {
            background-color: #2F6F5E;
            color: #FFFFFF;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            padding: 7px 8px;
            border: 1px solid #2F6F5E;
            text-align: left;
        }
        table.data-table td {
            border: 1px solid #CBD5E1;
            padding: 6px 8px;
            font-size: 10.5px;
            vertical-align: middle;
        }
        table.data-table tr:nth-child(even) td {
            background-color: #F8FAFC;
        }

        /* Badges de estado */
        .badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 10px;
            font-size: 9.5px;
            font-weight: bold;
        }
        .badge-danger {
            background-color: #FEE2E2;
            color: #B3372B;
        }
        .badge-warning {
            background-color: #FEF3C7;
            color: #B5651D;
        }
        .badge-success {
            background-color: #DCFCE7;
            color: #2F7D4F;
        }

        /* Resumen al pie */
        .summary-box {
            margin-top: 10px;
            padding: 8px 12px;
            background-color: #EDF4F1;
            border: 1px solid #C6DFD6;
            border-radius: 4px;
            font-size: 10.5px;
        }
        .footer {
            position: fixed;
            bottom: -10px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9px;
            color: #9CA3AF;
            border-top: 1px solid #E5E7EB;
            padding-top: 4px;
        }
    </style>
</head>
<body>

    <!-- Encabezado del Reporte -->
    <table class="header-table">
        <tr>
            <td>
                <span class="company-tag">Anta del Dorado · Recursos Humanos e Higiene y Seguridad</span>
                <h1>Reporte Ejecutivo de Estado de Inducciones</h1>
                <p class="subtitle">
                    Filtro de Nodo / Planta: <strong>{{ $zona ?: 'Todos los Nodos Productivos' }}</strong>
                </p>
            </td>
            <td class="meta-box">
                <strong>Fecha de emisión:</strong> {{ $fechaGeneracion }}<br>
                <strong>Emitido por:</strong> {{ $emitidoPor }}<br>
                <strong>Documento:</strong> Auditoría Interna RRHH
            </td>
        </tr>
    </table>

    <!-- 1. Resumen de KPIs Principales -->
    <table class="kpi-table">
        <tr>
            <td class="kpi-card">
                <span class="kpi-label">Colaboradores Activos</span>
                <span class="kpi-value">{{ $metrics['total_activos'] }}</span>
                <span class="kpi-sub">{{ $zona ? "En planta $zona" : 'Total en todos los nodos' }}</span>
            </td>
            <td class="kpi-card">
                <span class="kpi-label">Cumplimiento Global</span>
                <span class="kpi-value">{{ $metrics['indice_cumplimiento'] }}%</span>
                <span class="kpi-sub">Promedio de avance de inducciones</span>
            </td>
            <td class="kpi-card alert">
                <span class="kpi-label">Personal Bloqueado / Demora</span>
                <span class="kpi-value">{{ $metrics['alertas_bloqueados'] }}</span>
                <span class="kpi-sub">Requieren atención o reintento</span>
            </td>
            <td class="kpi-card">
                <span class="kpi-label">Consultas Pendientes</span>
                <span class="kpi-value">{{ $metrics['tickets_pendientes'] }}</span>
                <span class="kpi-sub">Tickets sin responder en bandeja</span>
            </td>
        </tr>
    </table>

    <!-- 2. Tabla de Personal con Demora o Cuestionario Bloqueado -->
    <h2>1. Nómina de Personal con Demora o Cuestionario Bloqueado ({{ count($colaboradoresBloqueados) }} casos)</h2>
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 10%;">Legajo</th>
                <th style="width: 26%;">Colaborador</th>
                <th style="width: 16%;">Nodo / Planta</th>
                <th style="width: 28%;">Curso Asignado</th>
                <th style="width: 10%;">Avance</th>
                <th style="width: 10%;">Estado</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($colaboradoresBloqueados as $item)
                <tr>
                    <td>#{{ $item->usuario->legajo ?? '-' }}</td>
                    <td><strong>{{ $item->usuario->nombre_completo ?? 'Sin nombre' }}</strong></td>
                    <td>{{ $item->usuario->zona_geografica_establecimient ?? 'Las Lajitas' }}</td>
                    <td>{{ $item->curso->nombre ?? 'Curso asignado' }}</td>
                    <td>{{ $item->porcentaje_avance ?? 0 }}%</td>
                    <td>
                        @if ($item->estado === 'Bloqueado')
                            <span class="badge badge-danger">Bloqueado</span>
                        @else
                            <span class="badge badge-warning">{{ $item->estado }}</span>
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; padding: 12px; color: #6B7280;">
                        No se registran colaboradores bloqueados ni con demoras para el filtro seleccionado.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- 3. Tabla de Auditoría de Cursos y Avance por Cuadrillas (2 columnas lado a lado) -->
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 10px; border: none;">
                <h2>2. Auditoría de Cursos con Mayor Dificultad</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nombre del Curso</th>
                            <th style="width: 28%; text-align: center;">Operarios Bloqueados</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($cursosProblematicos as $curso)
                            <tr>
                                <td>{{ $curso['nombre'] }}</td>
                                <td style="text-align: center;">
                                    @if ($curso['bloqueos'] > 0)
                                        <span class="badge badge-warning">{{ $curso['bloqueos'] }} operarios</span>
                                    @else
                                        <span class="badge badge-success">0 bloqueos</span>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="2" style="text-align: center;">No hay cursos registrados.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </td>

            <td style="width: 50%; vertical-align: top; padding-left: 10px; border: none;">
                <h2>3. Avance Promedio por Cuadrilla Preventiva</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Cuadrilla de Entrenamiento</th>
                            <th style="width: 28%; text-align: center;">Avance Promedio</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($avancePorCuadrilla as $cuad)
                            <tr>
                                <td>{{ $cuad['name'] }}</td>
                                <td style="text-align: center;">
                                    <strong>{{ $cuad['avance'] }}%</strong>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="2" style="text-align: center;">No hay cuadrillas activas.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </td>
        </tr>
    </table>

    <!-- Resumen de Totales al pie (como pide la guía de Dompdf) -->
    <div class="summary-box">
        <strong>Resumen Ejecutivo de Auditoría:</strong>
        Total de colaboradores evaluados: <strong>{{ $metrics['total_activos'] }}</strong> &nbsp;|&nbsp;
        Casos bloqueados/demorados listados: <strong>{{ count($colaboradoresBloqueados) }}</strong> &nbsp;|&nbsp;
        Cursos auditados: <strong>{{ count($cursosProblematicos) }}</strong> &nbsp;|&nbsp;
        Cuadrillas activas monitoreadas: <strong>{{ count($avancePorCuadrilla) }}</strong>.
    </div>

    <div class="footer">
        Sistema de Onboarding y Microlearning Corporativo · Anta del Dorado S.A. · Reporte generado automáticamente el {{ $fechaGeneracion }}
    </div>

</body>
</html>