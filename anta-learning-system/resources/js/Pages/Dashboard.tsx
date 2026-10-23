import React, { useState } from 'react';
import AppLayout from '@/Layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

// Interfaces de datos enviadas por DashboardController.php
interface ColaboradorBloqueado {
    id_progreso: number;
    estado: string;
    updated_at: string;
    usuario?: {
        id: number;
        nombre_completo: string;
        legajo: number;
        zona_geografica_establecimient: string;
    };
    curso?: {
        id_curso: number;
        nombre: string;
    };
}

interface CursoProblematico {
    id_curso: number;
    nombre: string;
    bloqueos: number;
}

interface DatoGraficoTorta {
    name: string;
    value: number;
}

interface DatoGraficoBarra {
    name: string;
    avance: number;
}

interface DashboardProps {
    filtros?: {
        zona: string | null;
    };
    metrics?: {
        total_activos: number;
        indice_cumplimiento: number;
        alertas_bloqueados: number;
        tickets_pendientes: number;
    };
    estadosCursos?: DatoGraficoTorta[];
    avancePorCuadrilla?: DatoGraficoBarra[];
    colaboradoresBloqueados?: ColaboradorBloqueado[];
    cursosProblematicos?: CursoProblematico[];
}

// Paleta sobria y formal inspirada en el prototipo (#2F6F5E, #2F7D4F, #B5651D, #B3372B)
const PIE_COLORS = ['#2F6F5E', '#3B82F6', '#B3372B', '#B5651D', '#6B7280'];

const ZONAS_DISPONIBLES = [
    'Las Lajitas',
    'Anta',
    'Coronel Mollinedo',
    'Laguna Verde',
];

const DEPARTAMENTOS = ['Todos', 'Cosecha', 'Empaque', 'Mantenimiento', 'Logística'];
const RANGOS_FECHAS = ['7 días', '30 días', '90 días', 'Este año'];

export default function Dashboard({
    filtros = { zona: null },
    metrics = {
        total_activos: 0,
        indice_cumplimiento: 0,
        alertas_bloqueados: 0,
        tickets_pendientes: 0,
    },
    estadosCursos = [],
    avancePorCuadrilla = [],
    colaboradoresBloqueados = [],
    cursosProblematicos = [],
}: DashboardProps) {
    const zonaActual = filtros?.zona || '';
    const [formatoExport, setFormatoExport] = useState<'Excel' | 'PDF'>('Excel');
    const [deptoFiltro, setDeptoFiltro] = useState('Todos');
    const [rangoFecha, setRangoFecha] = useState('30 días');
    const [busquedaTabla, setBusquedaTabla] = useState('');
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const mostrarToast = (texto: string) => {
        setToastMsg(texto);
        setTimeout(() => setToastMsg(null), 2800);
    };

    // Cambio de Zona Geográfica / Nodo productivo con Inertia
    const handleZonaChange = (nuevaZona: string) => {
        router.get(
            '/dashboard',
            { zona: nuevaZona || undefined },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Exportación de reporte según el selector (Excel o PDF)
    const handleExportarReporte = () => {
        const params = new URLSearchParams(
            zonaActual ? { zona: zonaActual } : {}
        ).toString();

        if (formatoExport === 'Excel') {
            window.location.href = `/dashboard/export-excel${params ? `?${params}` : ''}`;
        } else {
            window.location.href = `/dashboard/export-pdf${params ? `?${params}` : ''}`;
        }
    };

    // Filtrado rápido local de la tabla de personal demorado/bloqueado
    const filasFiltradas = colaboradoresBloqueados.filter((item) => {
        if (!busquedaTabla.trim()) return true;
        const q = busquedaTabla.toLowerCase();
        const nombre = item.usuario?.nombre_completo?.toLowerCase() || '';
        const legajo = String(item.usuario?.legajo || '');
        const curso = item.curso?.nombre?.toLowerCase() || '';
        const nodo = item.usuario?.zona_geografica_establecimient?.toLowerCase() || '';
        return (
            nombre.includes(q) ||
            legajo.includes(q) ||
            curso.includes(q) ||
            nodo.includes(q)
        );
    });

    return (
        <AppLayout title="Estado de las inducciones">
            <Head title="Estado de las inducciones · Panel de RRHH" />

            {/* Notificación Toast flotante igual al prototipo */}
            {toastMsg && (
                <div
                    role="status"
                    className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 rounded-[10px] bg-[#1F2328] dark:bg-[#ECEFEC] text-white dark:text-[#141714] px-5 py-3 text-[14px] font-medium shadow-lg transition-all"
                >
                    {toastMsg}
                </div>
            )}

            {/* 1. ENCABEZADO DE PÁGINA Y EXPORTACIÓN */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div className="flex-1 min-w-[260px]">
                    <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-1">
                        Estado de las inducciones
                    </h1>
                    <p className="text-[15px] text-[#6B7280] dark:text-[#9AA39D] m-0">
                        Resumen en tiempo real del cumplimiento del personal.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                    <label className="grid gap-1 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                        Formato
                        <select
                            value={formatoExport}
                            onChange={(e) =>
                                setFormatoExport(e.target.value as 'Excel' | 'PDF')
                            }
                            className="rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-[10px] text-[14px] font-normal text-[#1F2328] dark:text-[#ECEFEC] focus:border-[#2F6F5E] focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]"
                        >
                            <option value="Excel">Excel (.xlsx)</option>
                            <option value="PDF">Reporte PDF</option>
                        </select>
                    </label>

                    <button
                        type="button"
                        onClick={handleExportarReporte}
                        className="min-h-[38px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] px-[18px] py-[7px] text-[15px] font-medium text-white dark:text-[#0E1A15] hover:brightness-95 transition-all cursor-pointer"
                    >
                        Exportar reporte
                    </button>
                </div>
            </div>

            {/* 2. BARRA DE FILTROS EN TARJETA (Nodo productivo, Departamento, Rango de fechas) */}
            <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-6 flex flex-wrap items-end gap-5">
                <label className="grid gap-2 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] min-w-[200px] flex-1 sm:flex-initial">
                    Nodo productivo / Planta
                    <select
                        value={zonaActual}
                        onChange={(e) => handleZonaChange(e.target.value)}
                        className="rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-3 py-[9px] text-[15px] font-normal text-[#1F2328] dark:text-[#ECEFEC] focus:border-[#2F6F5E] focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]"
                    >
                        <option value="">Todos</option>
                        {ZONAS_DISPONIBLES.map((zona) => (
                            <option key={zona} value={zona}>
                                {zona}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="grid gap-2 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] min-w-[180px] flex-1 sm:flex-initial">
                    Departamento
                    <select
                        value={deptoFiltro}
                        onChange={(e) => setDeptoFiltro(e.target.value)}
                        className="rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-3 py-[9px] text-[15px] font-normal text-[#1F2328] dark:text-[#ECEFEC] focus:border-[#2F6F5E] focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]"
                    >
                        {DEPARTAMENTOS.map((dep) => (
                            <option key={dep} value={dep}>
                                {dep}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="grid gap-2 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] min-w-[160px] flex-1 sm:flex-initial">
                    Rango de fechas
                    <select
                        value={rangoFecha}
                        onChange={(e) => setRangoFecha(e.target.value)}
                        className="rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-3 py-[9px] text-[15px] font-normal text-[#1F2328] dark:text-[#ECEFEC] focus:border-[#2F6F5E] focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]"
                    >
                        {RANGOS_FECHAS.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* 3. TARJETAS DE MÉTRICAS RÁPIDAS (KPIs con tipografía 38px del prototipo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
                {/* KPI 1: Colaboradores activos */}
                <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-6 grid gap-2.5">
                    <span className="text-[15px] text-[#6B7280] dark:text-[#9AA39D]">
                        Colaboradores activos
                    </span>
                    <b className="text-[38px] font-medium leading-[1.1] tracking-[-0.02em] text-[#1F2328] dark:text-[#ECEFEC]">
                        {metrics.total_activos}
                    </b>
                    <small className="text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                        {zonaActual ? `Planta ${zonaActual}` : 'En todos los nodos'}
                    </small>
                </div>

                {/* KPI 2: Cumplimiento global con barra de progreso de 4px */}
                <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-6 grid gap-2.5">
                    <span className="text-[15px] text-[#6B7280] dark:text-[#9AA39D]">
                        Cumplimiento global
                    </span>
                    <b className="text-[38px] font-medium leading-[1.1] tracking-[-0.02em] text-[#1F2328] dark:text-[#ECEFEC]">
                        {metrics.indice_cumplimiento}%
                    </b>
                    <div className="h-[4px] w-full rounded-[4px] bg-[#E9E9E7] dark:bg-[#2A302B] overflow-hidden mt-1">
                        <i
                            className="block h-full bg-[#2F6F5E] dark:bg-[#6FBFA5] transition-all duration-500"
                            style={{
                                width: `${Math.min(100, Math.max(0, metrics.indice_cumplimiento))}%`,
                            }}
                        />
                    </div>
                </div>

                {/* KPI 3: Personal demorado / bloqueado (Color ámbar/alerta del prototipo) */}
                <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-6 grid gap-2.5">
                    <span className="text-[15px] text-[#6B7280] dark:text-[#9AA39D]">
                        Personal demorado / bloqueado
                    </span>
                    <b className="text-[38px] font-medium leading-[1.1] tracking-[-0.02em] text-[#B5651D] dark:text-[#E3A15A]">
                        {metrics.alertas_bloqueados}
                    </b>
                    <small className="text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                        Requieren atención o desbloqueo
                    </small>
                </div>

                {/* KPI 4: Consultas pendientes */}
                <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-6 grid gap-2.5">
                    <span className="text-[15px] text-[#6B7280] dark:text-[#9AA39D]">
                        Consultas sin responder
                    </span>
                    <b className="text-[38px] font-medium leading-[1.1] tracking-[-0.02em] text-[#1F2328] dark:text-[#ECEFEC]">
                        {metrics.tickets_pendientes}
                    </b>
                    <small className="text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                        Enviadas desde la app móvil
                    </small>
                </div>
            </div>

            {/* 4. SECCIÓN DE GRÁFICOS (Grilla de 2 columnas igual al prototipo .g2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8 items-start">
                {/* Gráfico 1: Avance por Cuadrilla / Departamento con línea punteada en 70% */}
                <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-6">
                    <h3 className="text-[15px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                        Avance promedio por cuadrilla de entrenamiento
                    </h3>
                    <p className="text-[14px] text-[#6B7280] dark:text-[#9AA39D] mt-1 mb-4">
                        La línea punteada verde marca el umbral mínimo de aprobación (70%).
                    </p>

                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={avancePorCuadrilla}
                                margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#E9E9E7"
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6B7280"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    fontSize={12}
                                    domain={[0, 100]}
                                    unit="%"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#FFFFFF',
                                        borderColor: '#E9E9E7',
                                        borderRadius: '8px',
                                        color: '#1F2328',
                                        fontSize: '13px',
                                    }}
                                />
                                <ReferenceLine
                                    y={70}
                                    stroke="#2F7D4F"
                                    strokeDasharray="5 4"
                                />
                                <Bar
                                    dataKey="avance"
                                    fill="#2F6F5E"
                                    radius={[4, 4, 0, 0]}
                                    barSize={44}
                                    name="Avance promedio"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico 2: Estado de las capacitaciones */}
                <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-6">
                    <h3 className="text-[15px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                        Distribución de estado de las inducciones
                    </h3>
                    <p className="text-[14px] text-[#6B7280] dark:text-[#9AA39D] mt-1 mb-4">
                        Proporción de cursadas completadas, en curso y bloqueadas por intentos.
                    </p>

                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={estadosCursos}
                                    cx="50%"
                                    cy="48%"
                                    innerRadius={52}
                                    outerRadius={78}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {estadosCursos.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#FFFFFF',
                                        borderColor: '#E9E9E7',
                                        borderRadius: '8px',
                                        color: '#1F2328',
                                        fontSize: '13px',
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={32}
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '13px', color: '#6B7280' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 5. TABLA PRINCIPAL: PERSONAL CON DEMORA / BLOQUEADO (Estilo exacto del prototipo) */}
            <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] mb-8 overflow-hidden">
                <div className="px-7 pt-6 pb-3 flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-[15px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0 flex-1">
                        Personal con demora o cuestionario bloqueado
                    </h3>

                    <input
                        type="search"
                        value={busquedaTabla}
                        onChange={(e) => setBusquedaTabla(e.target.value)}
                        placeholder="Buscar colaborador o curso"
                        aria-label="Buscar colaborador o curso"
                        className="w-full sm:w-[300px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-3 py-2 text-[14px] text-[#1F2328] dark:text-[#ECEFEC] placeholder-[#6B7280] focus:border-[#2F6F5E] focus:outline-none focus:ring-3 focus:ring-[#EDF4F1]"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B]">
                                <th className="py-3 px-7 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] whitespace-nowrap">
                                    Colaborador
                                </th>
                                <th className="py-3 px-7 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] whitespace-nowrap">
                                    Nodo
                                </th>
                                <th className="py-3 px-7 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] whitespace-nowrap">
                                    Curso
                                </th>
                                <th className="py-3 px-7 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] whitespace-nowrap">
                                    Estado / Alerta
                                </th>
                                <th className="py-3 px-7 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] text-right whitespace-nowrap">
                                    Acción
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B] text-[15px]">
                            {filasFiltradas.length > 0 ? (
                                filasFiltradas.map((item) => {
                                    const nombre =
                                        item.usuario?.nombre_completo ?? 'Colaborador';
                                    return (
                                        <tr
                                            key={item.id_progreso}
                                            className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors"
                                        >
                                            <td className="py-4 px-7 whitespace-nowrap">
                                                <b className="font-semibold text-[#1F2328] dark:text-[#ECEFEC]">
                                                    {nombre}
                                                </b>
                                                <span className="block text-[12px] text-[#6B7280] dark:text-[#9AA39D]">
                                                    Legajo #{item.usuario?.legajo ?? '-'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-7 whitespace-nowrap text-[#1F2328] dark:text-[#ECEFEC]">
                                                {item.usuario?.zona_geografica_establecimient ??
                                                    'Las Lajitas'}
                                            </td>
                                            <td className="py-4 px-7 whitespace-nowrap text-[#1F2328] dark:text-[#ECEFEC]">
                                                {item.curso?.nombre ?? 'Curso asignado'}
                                            </td>
                                            <td className="py-4 px-7 whitespace-nowrap">
                                                <span
                                                    className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                                                        item.estado === 'Bloqueado'
                                                            ? 'bg-[#B3372B]/12 text-[#B3372B] dark:text-[#EE8274]'
                                                            : 'bg-[#B5651D]/12 text-[#B5651D] dark:text-[#E3A15A]'
                                                    }`}
                                                >
                                                    {item.estado === 'Bloqueado'
                                                        ? 'Bloqueado (3 intentos)'
                                                        : item.estado}
                                                </span>
                                            </td>
                                            <td className="py-4 px-7 whitespace-nowrap text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        mostrarToast(
                                                            `Recordatorio enviado a ${nombre}`
                                                        )
                                                    }
                                                    className="min-h-[32px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-3 py-1 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors cursor-pointer"
                                                >
                                                    Enviar recordatorio
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-6 px-7 text-[#6B7280] dark:text-[#9AA39D]"
                                    >
                                        Sin demoras ni bloqueos registrados con estos filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 6. TABLA COMPLEMENTARIA: AUDITORÍA DE CURSOS CON MÁS BLOQUEOS */}
            <div className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] overflow-hidden">
                <div className="px-7 pt-6 pb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-[15px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                            Auditoría de cursos (cuestionarios con mayor dificultad)
                        </h3>
                        <p className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] mt-0.5 mb-0">
                            Permite detectar qué material requiere revisión trimestral en taller.
                        </p>
                    </div>
                    <Link
                        href="/cursos"
                        className="min-h-[32px] inline-flex items-center rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-3 py-1 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors"
                    >
                        Ver catálogo
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B]">
                                <th className="py-3 px-7 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                    Curso
                                </th>
                                <th className="py-3 px-7 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D] text-right">
                                    Operarios bloqueados
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B] text-[15px]">
                            {cursosProblematicos.length > 0 ? (
                                cursosProblematicos.map((curso) => (
                                    <tr
                                        key={curso.id_curso}
                                        className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors"
                                    >
                                        <td className="py-4 px-7 font-semibold text-[#1F2328] dark:text-[#ECEFEC]">
                                            {curso.nombre}
                                        </td>
                                        <td className="py-4 px-7 text-right">
                                            <span
                                                className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                                                    curso.bloqueos > 0
                                                        ? 'bg-[#B5651D]/12 text-[#B5651D] dark:text-[#E3A15A]'
                                                        : 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:text-[#6CC28A]'
                                                }`}
                                            >
                                                {curso.bloqueos} operarios
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="py-6 px-7 text-[#6B7280] dark:text-[#9AA39D]"
                                    >
                                        No hay cursos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}