import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import {
    Search,
    Filter,
    RotateCcw,
    Plus,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';

interface Colaborador {
    id: number;
    nombre_completo: string;
    dni: number | string;
    legajo: number | string;
    email: string;
    rol: 'Operario' | 'Supervisor';
    zona_geografica_establecimient: string;
    centro_costo: string;
    estado_operativo: string;
}

interface Props {
    users: Colaborador[];
    filters?: {
        search?: string;
    };
}

const NODOS = ['Las Lajitas', 'Finca Norte', 'Finca Valle', 'Planta de empaque', 'Anta', 'Coronel Mollinedo', 'Laguna Verde'];
const ROLES_COLAB = ['Operario', 'Supervisor'];
const ESTADOS_COLAB = ['Activo', 'Suspendido', 'Inactivo', 'Vacaciones', 'Lesionado', 'Siniestrado'];

export default function ColaboradoresIndex({ users = [], filters = {} }: Props) {
    const { flash } = usePage<any>().props;
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const { can } = useAuth();

    const triggerToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3200);
    };

    useEffect(() => {
        if (flash?.success) {
            triggerToast(flash.success);
        }
    }, [flash]);

    // Control del buscador por texto desplegable
    const [showColabSearch, setShowColabSearch] = useState(Boolean(filters.search));
    const colabSearchInputRef = useRef<HTMLInputElement>(null);

    const [colabDraft, setColabDraft] = useState({
        search: filters.search || '',
        sort: 'az' as 'az' | 'za',
        rol: 'Todos',
        nodo: 'Todos',
        estado: 'Todos',
    });

    const [colabApplied, setColabApplied] = useState({
        search: filters.search || '',
        sort: 'az' as 'az' | 'za',
        rol: 'Todos',
        nodo: 'Todos',
        estado: 'Todos',
    });

    const [colabPage, setColabPage] = useState(1);
    const [colabPerPage, setColabPerPage] = useState(5);

    useEffect(() => {
        const s = filters.search || '';
        setColabDraft((prev) => ({ ...prev, search: s }));
        setColabApplied((prev) => ({ ...prev, search: s }));
        if (s) setShowColabSearch(true);
        setColabPage(1);
    }, [filters.search]);

    const toggleColabSearchInput = () => {
        setShowColabSearch((prev) => {
            const next = !prev;
            if (next) {
                setTimeout(() => colabSearchInputRef.current?.focus(), 50);
            }
            return next;
        });
    };

    const applyColabFilters = () => {
        setColabApplied({ ...colabDraft });
        setColabPage(1);
    };

    const resetColabFilters = () => {
        const clean = { search: '', sort: 'az' as const, rol: 'Todos', nodo: 'Todos', estado: 'Todos' };
        setColabDraft(clean);
        setColabApplied(clean);
        setShowColabSearch(false);
        setColabPage(1);
    };

    const processedColabs = useMemo(() => {
        const q = colabApplied.search.toLowerCase().trim();

        const filtered = users.filter((u) => {
            const matchText =
                !q ||
                `${u.nombre_completo} ${u.dni} ${u.legajo} ${u.email || ''} ${u.rol || ''} ${u.zona_geografica_establecimient || ''} ${u.centro_costo || ''} ${u.estado_operativo || ''}`
                    .toLowerCase()
                    .includes(q);

            const matchRol = colabApplied.rol === 'Todos' || u.rol === colabApplied.rol;
            const matchNodo =
                colabApplied.nodo === 'Todos' ||
                u.zona_geografica_establecimient === colabApplied.nodo;
            const matchEstado =
                colabApplied.estado === 'Todos' || u.estado_operativo === colabApplied.estado;

            return matchText && matchRol && matchNodo && matchEstado;
        });

        filtered.sort((a, b) => {
            const cmp = a.nombre_completo.localeCompare(b.nombre_completo, 'es', {
                sensitivity: 'base',
            });
            return colabApplied.sort === 'az' ? cmp : -cmp;
        });

        return filtered;
    }, [users, colabApplied]);

    const colabTotalPages = Math.max(1, Math.ceil(processedColabs.length / colabPerPage));
    const paginatedColabs = useMemo(() => {
        const start = (colabPage - 1) * colabPerPage;
        return processedColabs.slice(start, start + colabPerPage);
    }, [processedColabs, colabPage, colabPerPage]);

    const getChipClasses = (estado: string) => {
        if (estado === 'Activo') {
            return 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:bg-[#6CC28A]/15 dark:text-[#6CC28A]';
        }
        if (estado === 'Vacaciones' || estado === 'Lesionado') {
            return 'bg-[#B5651D]/12 text-[#B5651D] dark:bg-[#E3A15A]/15 dark:text-[#E3A15A]';
        }
        return 'bg-[#B3372B]/12 text-[#B3372B] dark:bg-[#EE8274]/15 dark:text-[#EE8274]';
    };

    const handleExportExcel = () => {
        const params = new URLSearchParams({
            buscar: colabApplied.search || '',
            rol: colabApplied.rol !== 'Todos' ? colabApplied.rol : '',
            zona: colabApplied.nodo !== 'Todos' ? colabApplied.nodo : '',
            estado: colabApplied.estado !== 'Todos' ? colabApplied.estado : '',
            orden: 'nombre_completo',
            direccion: colabApplied.sort === 'za' ? 'desc' : 'asc',
        }).toString();

        window.location.href = `/colaboradores/export?${params}`;
    };

    return (
        <AppLayout title="Colaboradores">
            <Head title="Colaboradores · Panel de RRHH" />

            {/* ENCABEZADO */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div className="flex-1 min-w-[260px]">
                    <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-1">
                        Colaboradores
                    </h1>
                    <p className="text-[#6B7280] dark:text-[#9AA39D] text-[15px] m-0">
                        Altas, bajas, auditoría y seguimiento individual del personal operativo.
                    </p>
                </div>
                {can('exportar_reportes') && (
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 min-h-[38px] px-4 py-[7px] rounded-[8px] border border-[#2F6F5E] bg-white dark:bg-[#1B1F1C] text-[#2F6F5E] dark:text-[#6FBFA5] font-medium text-[15px] hover:bg-[#EDF4F1] dark:hover:bg-[#223029] transition cursor-pointer"
                    >
                        Exportar a Excel (.xlsx)
                    </button>
                )}
                {can('crear_colaborador') && (
                <div>
                    <Link
                        href="/colaboradores/create"
                        className="inline-flex items-center gap-2 min-h-[38px] px-[18px] py-[7px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] text-white dark:text-[#0E1A15] font-medium text-[15px] hover:brightness-95 transition cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo colaborador
                    </Link>
                </div>
                )}
            </div>

            {/* CONTENEDOR DE TABLA */}
            <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] overflow-hidden mb-12">
                
                {/* BARRA DE FILTROS: Dos secciones fijas para que "Filtrar" y "Reset" NUNCA se muevan */}
                <div className="p-4 md:px-7 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
                        
                        {/* Lado Izquierdo: Buscador + Selectores */}
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            {/* Botón Lupita */}
                            <button
                                type="button"
                                onClick={toggleColabSearchInput}
                                title={showColabSearch ? 'Ocultar buscador' : 'Buscar por texto'}
                                className={`inline-flex items-center justify-center min-h-[38px] px-2.5 py-[7px] rounded-[8px] border transition cursor-pointer shrink-0 ${
                                    showColabSearch || colabDraft.search
                                        ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                        : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280]'
                                }`}
                            >
                                <Search className="h-4 w-4" />
                            </button>

                            {/* Campo de búsqueda con ancho fijo para evitar empujar elementos */}
                            {showColabSearch && (
                                <div className="relative w-48 sm:w-60 shrink-0 animate-in fade-in duration-150">
                                    <input
                                        ref={colabSearchInputRef}
                                        type="search"
                                        value={colabDraft.search}
                                        onChange={(e) =>
                                            setColabDraft({ ...colabDraft, search: e.target.value })
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') applyColabFilters();
                                            if (e.key === 'Escape') setShowColabSearch(false);
                                        }}
                                        placeholder="Buscar..."
                                        className="w-full pl-3 pr-7 py-[7px] min-h-[38px] rounded-[8px] border border-[#2F6F5E] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[13.5px] focus:outline-none"
                                    />
                                    {colabDraft.search && (
                                        <button
                                            type="button"
                                            onClick={() => setColabDraft({ ...colabDraft, search: '' })}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2328]"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Selectores */}
                            <span className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] shrink-0">Nombre:</span>
                            <select
                                value={colabDraft.sort}
                                onChange={(e) =>
                                    setColabDraft({ ...colabDraft, sort: e.target.value as 'az' | 'za' })
                                }
                                className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[13px] px-1.9"
                            >
                                <option value="az">A-Z</option>
                                <option value="za">Z-A</option>
                            </select>

                            <span className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] shrink-0">Rol:</span>
                            <select
                                value={colabDraft.rol}
                                onChange={(e) => setColabDraft({ ...colabDraft, rol: e.target.value })}
                                className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[13px] px-2"
                            >
                                <option value="Todos">Todos</option>
                                {ROLES_COLAB.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>

                            <span className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] shrink-0">Nodo:</span>
                            <select
                                value={colabDraft.nodo}
                                onChange={(e) => setColabDraft({ ...colabDraft, nodo: e.target.value })}
                                className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[13px] px-2"
                            >
                                <option value="Todos">Todos</option>
                                {NODOS.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>

                            <span className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] shrink-0">Estado:</span>
                            <select
                                value={colabDraft.estado}
                                onChange={(e) =>
                                    setColabDraft({ ...colabDraft, estado: e.target.value })
                                }
                                className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[13px] px-2"
                            >
                                <option value="Todos">Todos</option>
                                {ESTADOS_COLAB.map((est) => (
                                    <option key={est} value={est}>
                                        {est}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Lado Derecho Fijo: Filtrar y Resetear NO se mueven */}
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button
                                type="button"
                                onClick={applyColabFilters}
                                className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-[7px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14px] font-medium hover:brightness-95 transition cursor-pointer"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                Filtrar
                            </button>

                            <button
                                type="button"
                                onClick={resetColabFilters}
                                title="Restablecer filtros"
                                className="inline-flex items-center justify-center min-h-[38px] px-2.5 py-[7px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] transition cursor-pointer"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLA COMPACTA SIN SCROLL HORIZONTAL */}
                <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/50">
                                <th className="w-[30%] py-3 px-5 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Colaborador y Documento
                                </th>
                                <th className="w-[32%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Legajo y Correo Electrónico
                                </th>
                                <th className="w-[23%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Rol y Nodo Productivo
                                </th>
                                <th className="w-[15%] py-3 px-5 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px] text-right">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B] text-[14px]">
                            {paginatedColabs.length > 0 ? (
                                paginatedColabs.map((colab) => (
                                    <tr
                                        key={colab.id}
                                        tabIndex={0}
                                        onClick={() => router.visit(`/colaboradores/${colab.id}`)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') router.visit(`/colaboradores/${colab.id}`);
                                        }}
                                        className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors cursor-pointer"
                                    >
                                        <td className="py-3.5 px-5 align-middle">
                                            <b className="font-semibold text-[#1F2328] dark:text-[#ECEFEC] block truncate">
                                                {colab.nombre_completo}
                                            </b>
                                            <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D]">
                                                DNI: {colab.dni}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 align-middle">
                                            <span className="font-medium text-[#1F2328] dark:text-[#ECEFEC] block">
                                                Legajo #{colab.legajo}
                                            </span>
                                            <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] block truncate">
                                                {colab.email}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 align-middle">
                                            <span className="font-medium text-[#1F2328] dark:text-[#ECEFEC] block truncate">
                                                {colab.rol} · {colab.zona_geografica_establecimient}
                                            </span>
                                            <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] block truncate">
                                                Depto: {colab.centro_costo}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-5 align-middle text-right">
                                            <span
                                                className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-medium ${getChipClasses(
                                                    colab.estado_operativo
                                                )}`}
                                            >
                                                {colab.estado_operativo}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="py-6 px-7 text-[#6B7280] dark:text-[#9AA39D]"
                                    >
                                        No hay colaboradores que coincidan con los filtros aplicados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                <div className="px-6 py-4 border-t border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/50 dark:bg-[#141714]/40 flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 font-normal">
                            Mostrar
                            <select
                                value={colabPerPage}
                                onChange={(e) => {
                                    setColabPerPage(Number(e.target.value));
                                    setColabPage(1);
                                }}
                                className="px-1.9 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                            >
                                {[5, 10, 15, 20, 50].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                            por página
                        </label>
                        <span>
                            · Total: <b>{processedColabs.length}</b> registros
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 font-normal">
                            Ir a página:
                            <select
                                value={colabPage}
                                onChange={(e) => setColabPage(Number(e.target.value))}
                                className="px-1.9 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                            >
                                {Array.from({ length: colabTotalPages }, (_, i) => i + 1).map(
                                    (p) => (
                                        <option key={p} value={p}>
                                            {p} de {colabTotalPages}
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={colabPage <= 1}
                                onClick={() => setColabPage((p) => Math.max(1, p - 1))}
                                className="p-1.5 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                disabled={colabPage >= colabTotalPages}
                                onClick={() =>
                                    setColabPage((p) => Math.min(colabTotalPages, p + 1))
                                }
                                className="p-1.5 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {toastMsg && (
                <div
                    role="status"
                    className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#1F2328] dark:bg-[#ECEFEC] text-white dark:text-[#141714] px-5 py-3 rounded-[10px] shadow-lg text-[14px] font-medium"
                >
                    {toastMsg}
                </div>
            )}
        </AppLayout>
    );
}