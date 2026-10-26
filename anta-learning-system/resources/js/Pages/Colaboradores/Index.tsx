import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import {
    Search,
    Filter,
    RotateCcw,
    Plus,
    Users,
    Edit3,
    Trash2,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';

interface Evaluacion {
    cuestionario: string;
    intentos: number;
    fecha: string;
    nota: number;
}

interface Colaborador {
    id: number;
    nombre_completo: string;
    dni: number | string;
    legajo: number | string;
    email: string;
    rol: 'Operario' | 'Supervisor';
    zona_geografica_establecimient: string;
    centro_costo: string;
    estado_operativo: 'Activo' | 'Inactivo' | 'Suspendido' | 'Vacaciones' | 'Lesionado' | 'Siniestrado';
    avance?: number;
    ultimo_ingreso?: string;
    tiempo_total?: string;
    historial_evaluaciones?: Evaluacion[];
}

interface Cuadrilla {
    id_cuadrilla: number;
    nombre_cuadrilla: string;
    labor_asociada: string;
    fecha_creacion: string;
    estado: boolean; // true = Activa, false = Inactiva
    colaboradores: Colaborador[];
}

interface CursoSimple {
    id_curso: number;
    nombre: string;
}

interface Props {
    users: Colaborador[];
    cuadrillas: Cuadrilla[];
    cursosDisponibles?: CursoSimple[];
    filters?: {
        search?: string;
    };
}

const NODOS = ['Las Lajitas', 'Finca Norte', 'Finca Valle', 'Planta de empaque', 'Anta', 'Coronel Mollinedo', 'Laguna Verde'];
const DEPS = ['Cosecha', 'Empaque', 'Mantenimiento', 'Logística'];
const ROLES_COLAB = ['Operario', 'Supervisor'];
const ESTADOS_COLAB = ['Activo', 'Suspendido', 'Inactivo', 'Vacaciones', 'Lesionado', 'Siniestrado'];
const ESTADOS_BAJA = ['Suspendido', 'Inactivo', 'Vacaciones', 'Lesionado', 'Siniestrado'];

const HISTORIAL_MOCK: Evaluacion[] = [
    { cuestionario: 'Normas básicas de seguridad', intentos: 1, fecha: '12/09/2026', nota: 90 },
    { cuestionario: 'Uso correcto de EPP', intentos: 2, fecha: '18/09/2026', nota: 75 },
    { cuestionario: 'Manejo de agroquímicos', intentos: 3, fecha: '29/09/2026', nota: 60 },
];

export default function ColaboradoresIndex({
    users = [],
    cuadrillas = [],
    cursosDisponibles = [],
    filters = {},
}: Props) {
    const { flash } = usePage<any>().props;
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const triggerToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3200);
    };

    useEffect(() => {
        if (flash?.success) {
            triggerToast(flash.success);
        }
    }, [flash]);

    // =========================================================================
    // 1. ESTADOS DE FILTROS Y PAGINACIÓN: TABLA COLABORADORES
    // =========================================================================
    // Control para mostrar/ocultar el input de texto al apretar la "lupita"
    const [showColabSearch, setShowColabSearch] = useState(Boolean(filters.search));
    const colabSearchInputRef = useRef<HTMLInputElement>(null);

    // Estado temporal (inputs en la barra antes de apretar "Filtrar")
    const [colabDraft, setColabDraft] = useState({
        search: filters.search || '',
        sort: 'az' as 'az' | 'za',
        rol: 'Todos',
        nodo: 'Todos',
        estado: 'Todos',
    });

    // Estado aplicado (impacta en la tabla al presionar "Filtrar")
    const [colabApplied, setColabApplied] = useState({
        search: filters.search || '',
        sort: 'az' as 'az' | 'za',
        rol: 'Todos',
        nodo: 'Todos',
        estado: 'Todos',
    });

    // Paginación Colaboradores (por defecto 5 elementos)
    const [colabPage, setColabPage] = useState(1);
    const [colabPerPage, setColabPerPage] = useState(5);

    // Sincronizar búsqueda que viene desde el Topbar (AppLayout)
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

    // Procesamiento de Colaboradores (Filtrado + Ordenamiento A-Z / Z-A)
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



    // =========================================================================
    // 3. MODALES DE COLABORADORES (ALTA, FICHA LATERAL, BAJA, RESET CLAVE)
    // =========================================================================
    const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);
    const [evalSearch, setEvalSearch] = useState('');
    const [showNewModal, setShowNewModal] = useState(false);
    const [motivoBaja, setMotivoBaja] = useState('Suspendido');

    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        confirmText: string;
        isDanger?: boolean;
        extraSelect?: {
            label: string;
            value: string;
            options: string[];
            onChange: (val: string) => void;
        };
        onConfirm: () => void;
    } | null>(null);

    const colabForm = useForm({
        nombre_completo: '',
        dni: '',
        legajo: '',
        email: '',
        rol: 'Operario',
        zona_geografica_establecimient: NODOS[0],
        centro_costo: DEPS[0],
    });

    const handleCreateColabSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        colabForm.post('/colaboradores', {
            preserveScroll: true,
            onSuccess: () => {
                setShowNewModal(false);
                colabForm.reset();
                triggerToast('Colaborador dado de alta (Contraseña inicial: DNI)');
            },
        });
    };

    const handleForcePasswordReset = (colab: Colaborador) => {
        setConfirmModal({
            title: 'Confirmar restablecimiento',
            message: `La contraseña de ${colab.nombre_completo} volverá a ser su DNI (${colab.dni}) y la aplicación móvil le exigirá crear una clave nueva en su próximo ingreso.`,
            confirmText: 'Forzar restablecimiento',
            onConfirm: () => {
                router.post(
                    `/colaboradores/${colab.id}/reset-password`,
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            setConfirmModal(null);
                            triggerToast('Contraseña restablecida al DNI del colaborador');
                        },
                    }
                );
            },
        });
    };

    const handleToggleStatus = (colab: Colaborador, nuevoEstado: string) => {
        router.patch(
            `/colaboradores/${colab.id}/status`,
            { estado_operativo: nuevoEstado },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirmModal(null);
                    setSelectedColab((prev) =>
                        prev ? { ...prev, estado_operativo: nuevoEstado as any } : null
                    );
                    triggerToast(
                        nuevoEstado === 'Activo'
                            ? 'Colaborador reactivado correctamente'
                            : `Estado actualizado a ${nuevoEstado}`
                    );
                },
            }
        );
    };


    const getChipClasses = (estado: string) => {
        if (estado === 'Activo' || estado === 'Activa') {
            return 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:bg-[#6CC28A]/15 dark:text-[#6CC28A]';
        }
        if (estado === 'Vacaciones' || estado === 'Lesionado') {
            return 'bg-[#B5651D]/12 text-[#B5651D] dark:bg-[#E3A15A]/15 dark:text-[#E3A15A]';
        }
        return 'bg-[#B3372B]/12 text-[#B3372B] dark:bg-[#EE8274]/15 dark:text-[#EE8274]';
    };

    return (
        <AppLayout title="Colaboradores y Cuadrillas">
            <Head title="Colaboradores y Cuadrillas · Panel de RRHH" />

            {/* =====================================================================
                SECCIÓN 1: DIRECTORIO DE COLABORADORES
            ===================================================================== */}
            <div className="flex flex-wrap items-end justify-between mb-3 p-[-5px]">
                <div className="flex-1 min-w-[260px]">
                    <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-1">
                        Colaboradores
                    </h1>
                    <p className="text-[#6B7280] dark:text-[#9AA39D] text-[15px] m-0">
                        Altas, bajas y seguimiento individual del personal operativo.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowNewModal(true)}
                        className="inline-flex items-center gap-2 min-h-[38px] px-[18px] py-[7px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] text-white dark:text-[#0E1A15] font-medium text-[15px] hover:brightness-95 transition cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo colaborador
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] overflow-hidden mb-12">
                {/* BARRA DE BÚSQUEDA Y FILTROS EN LA MISMA LÍNEA (COLABORADORES) */}
                <div className="p-5 md:px-7 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5">
                        {/* Botón de la "lupita" para activar/ocultar la búsqueda por texto */}
                        <button
                            type="button"
                            onClick={toggleColabSearchInput}
                            title={showColabSearch ? 'Ocultar buscador de texto' : 'Buscar por texto'}
                            aria-label="Activar búsqueda por texto"
                            className={`inline-flex items-center justify-center min-h-[38px] px-2.5 py-[7px] rounded-[8px] border transition cursor-pointer shrink-0 ${
                                showColabSearch || colabDraft.search
                                    ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                    : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714]'
                            }`}
                        >
                            <Search className="h-4 w-4" />
                        </button>

                        {/* Buscador de texto desplegable al apretar la lupita */}
                        {showColabSearch && (
                            <div className="relative flex-1 min-w-[180px] animate-in fade-in slide-in-from-left-2 duration-150">
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
                                    placeholder="Buscar nombre, DNI, legajo o correo..."
                                    className="w-full pl-3 pr-8 py-[7px] min-h-[38px] rounded-[8px] border border-[#2F6F5E] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[14px] focus:outline-none"
                                />
                                {colabDraft.search && (
                                    <button
                                        type="button"
                                        onClick={() => setColabDraft({ ...colabDraft, search: '' })}
                                        title="Limpiar texto"
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] cursor-pointer"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Orden Alfabético por Nombre */}
                        <span className="text-[14px] ml-1">Nombre: </span>
                        <select
                            aria-label="Ordenar por nombre"
                            value={colabDraft.sort}
                            onChange={(e) =>
                                setColabDraft({ ...colabDraft, sort: e.target.value as 'az' | 'za' })
                            }
                            className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[13px] focus:outline-none focus:border-[#2F6F5E]"
                        >
                            <option value="az">A-Z</option>
                            <option value="za">Z-A</option>
                        </select>

                        {/* Selector Rol */}
                        <span className="text-[14px]">Rol: </span>
                        <select
                            aria-label="Filtrar por rol"
                            value={colabDraft.rol}
                            onChange={(e) => setColabDraft({ ...colabDraft, rol: e.target.value })}
                            className="w-21 py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[14px] focus:outline-none focus:border-[#2F6F5E]"
                        >
                            <option value="Todos">Todos</option>
                            {ROLES_COLAB.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>

                        {/* Selector Nodo */}
                        <span className="text-[14px]">Nodo: </span>
                        <select
                            aria-label="Filtrar por nodo"
                            value={colabDraft.nodo}
                            onChange={(e) => setColabDraft({ ...colabDraft, nodo: e.target.value })}
                            className="w-21 py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[14px] focus:outline-none focus:border-[#2F6F5E]"
                        >
                            <option value="Todos">Todos</option>
                            {NODOS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>

                        {/* Selector Estado */}
                        <span className="text-[14px]">Estado: </span>
                        <select
                            aria-label="Filtrar por estado"
                            value={colabDraft.estado}
                            onChange={(e) =>
                                setColabDraft({ ...colabDraft, estado: e.target.value })
                            }
                            className="w-21 py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[14px] focus:outline-none focus:border-[#2F6F5E]"
                        >
                            <option value="Todos">Todos</option>
                            {ESTADOS_COLAB.map((est) => (
                                <option key={est} value={est}>
                                    {est}
                                </option>
                            ))}
                        </select>

                        {/* Botón Filtrar */}
                        <button
                            type="button"
                            onClick={applyColabFilters}
                            className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-[7px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14px] font-medium hover:brightness-95 transition cursor-pointer shrink-0 ml-auto"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filtrar
                        </button>

                        {/* Botón Limpiar */}
                        <button
                            type="button"
                            onClick={resetColabFilters}
                            title="Restablecer filtros"
                            className="inline-flex items-center justify-center min-h-[38px] px-2.5 py-[7px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition cursor-pointer shrink-0"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* TABLA DE COLABORADORES */}
                <div className="w-full">
                    <table className="w-full table-fixed border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/50">
                                <th className="w-[28%] py-3 px-5 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Colaborador y Documento
                                </th>
                                <th className="w-[32%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Legajo y Correo Electrónico
                                </th>
                                <th className="w-[25%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
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
                                        onClick={() => {
                                            setEvalSearch('');
                                            setSelectedColab(colab);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setEvalSearch('');
                                                setSelectedColab(colab);
                                            }
                                        }}
                                        className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors cursor-pointer"
                                    >
                                        {/* Columna 1: Nombre + DNI */}
                                        <td className="py-3.5 px-5 align-middle">
                                            <b className="font-semibold text-[#1F2328] dark:text-[#ECEFEC] block truncate">
                                                {colab.nombre_completo}
                                            </b>
                                            <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D]">
                                                DNI: {colab.dni}
                                            </span>
                                        </td>

                                        {/* Columna 2: Legajo + Email */}
                                        <td className="py-3.5 px-4 align-middle">
                                            <span className="font-medium text-[#1F2328] dark:text-[#ECEFEC] block">
                                                Legajo #{colab.legajo}
                                            </span>
                                            <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] block truncate">
                                                {colab.email}
                                            </span>
                                        </td>

                                        {/* Columna 3: Rol + Nodo y Centro de Costo */}
                                        <td className="py-3.5 px-4 align-middle">
                                            <span className="font-medium text-[#1F2328] dark:text-[#ECEFEC] block truncate">
                                                {colab.rol} · {colab.zona_geografica_establecimient}
                                            </span>
                                            <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] block truncate">
                                                Depto: {colab.centro_costo}
                                            </span>
                                        </td>

                                        {/* Columna 4: Chip de Estado Operativo */}
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

                {/* CONTROLES DE PAGINACIÓN (COLABORADORES) */}
                <div className="px-6 py-4 border-t border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/50 dark:bg-[#141714]/40 flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 font-normal text-[#6B7280] dark:text-[#9AA39D]">
                            Mostrar
                            <select
                                value={colabPerPage}
                                onChange={(e) => {
                                    setColabPerPage(Number(e.target.value));
                                    setColabPage(1);
                                }}
                                className="px-1.7 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[13px]"
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
                        <label className="flex items-center gap-1.5 font-normal text-[#6B7280] dark:text-[#9AA39D]">
                            Ir a página:
                            <select
                                value={colabPage}
                                onChange={(e) => setColabPage(Number(e.target.value))}
                                className="px-2.2 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[13px]"
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
                                aria-label="Página anterior"
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
                                aria-label="Página siguiente"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* =====================================================================
                MODAL: DAR DE ALTA NUEVO COLABORADOR
            ===================================================================== */}
            {showNewModal && (
                <div
                    className="fixed inset-0 z-40 bg-[#141916]/35 grid place-items-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowNewModal(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Nuevo colaborador"
                        className="bg-white dark:bg-[#1B1F1C] rounded-[16px] shadow-2xl w-full max-w-[720px] max-h-[94dvh] flex flex-col animate-in zoom-in-95 duration-150"
                    >
                        <header className="flex items-center justify-between px-8 pt-7 pb-2">
                            <h2 className="text-[24px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                Nuevo colaborador
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowNewModal(false)}
                                aria-label="Cerrar"
                                className="w-9 h-9 rounded-[8px] text-[26px] leading-none text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] cursor-pointer"
                            >
                                ×
                            </button>
                        </header>

                        <form
                            onSubmit={handleCreateColabSubmit}
                            className="flex flex-col flex-1 overflow-hidden"
                        >
                            <div className="px-8 py-4 overflow-y-auto grid gap-5">
                                <div className="rounded-[10px] bg-[#EDF4F1] dark:bg-[#223029] border border-[#2F6F5E]/20 px-4 py-3 text-[14px] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                    <b>Credenciales automáticas:</b> Al presionar "Dar de alta", el
                                    sistema asignará el <b>DNI</b> como contraseña inicial. En su
                                    primer ingreso a la app móvil, se le solicitará cambiarla
                                    obligatoriamente por seguridad.
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <label className="grid gap-2 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                        Nombre completo
                                        <input
                                            type="text"
                                            required
                                            value={colabForm.data.nombre_completo}
                                            onChange={(e) =>
                                                colabForm.setData('nombre_completo', e.target.value)
                                            }
                                            placeholder="Ej. Marcos Ledesma"
                                            className="px-3.5 py-[11px] text-[16px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                                        />
                                        {colabForm.errors.nombre_completo && (
                                            <span className="text-[12px] text-[#B3372B]">
                                                {colabForm.errors.nombre_completo}
                                            </span>
                                        )}
                                    </label>

                                    <label className="grid gap-2 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                        Correo electrónico
                                        <input
                                            type="email"
                                            required
                                            value={colabForm.data.email}
                                            onChange={(e) =>
                                                colabForm.setData('email', e.target.value)
                                            }
                                            placeholder="operario@antadorado.com.ar"
                                            className="px-3.5 py-[11px] text-[16px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                                        />
                                        {colabForm.errors.email && (
                                            <span className="text-[12px] text-[#B3372B]">
                                                {colabForm.errors.email}
                                            </span>
                                        )}
                                    </label>

                                    <label className="grid gap-2 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                        DNI (Será su contraseña inicial)
                                        <input
                                            type="number"
                                            required
                                            value={colabForm.data.dni}
                                            onChange={(e) =>
                                                colabForm.setData('dni', e.target.value)
                                            }
                                            placeholder="Sin puntos, ej: 30412887"
                                            className="px-3.5 py-[11px] text-[16px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                                        />
                                        {colabForm.errors.dni && (
                                            <span className="text-[12px] text-[#B3372B]">
                                                {colabForm.errors.dni}
                                            </span>
                                        )}
                                    </label>

                                    <label className="grid gap-2 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                        Legajo
                                        <input
                                            type="number"
                                            required
                                            value={colabForm.data.legajo}
                                            onChange={(e) =>
                                                colabForm.setData('legajo', e.target.value)
                                            }
                                            placeholder="Ej. 1042"
                                            className="px-3.5 py-[11px] text-[16px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                                        />
                                        {colabForm.errors.legajo && (
                                            <span className="text-[12px] text-[#B3372B]">
                                                {colabForm.errors.legajo}
                                            </span>
                                        )}
                                    </label>

                                    <label className="grid gap-2 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                        Rol
                                        <select
                                            value={colabForm.data.rol}
                                            onChange={(e) =>
                                                colabForm.setData('rol', e.target.value as any)
                                            }
                                            className="px-3.5 py-[11px] text-[16px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                                        >
                                            <option value="Operario">Operario</option>
                                            <option value="Supervisor">Supervisor</option>
                                        </select>
                                    </label>

                                    <label className="grid gap-2 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                        Nodo productivo
                                        <select
                                            value={colabForm.data.zona_geografica_establecimient}
                                            onChange={(e) =>
                                                colabForm.setData(
                                                    'zona_geografica_establecimient',
                                                    e.target.value
                                                )
                                            }
                                            className="px-3.5 py-[11px] text-[16px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                                        >
                                            {NODOS.map((n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="grid gap-2 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D] sm:col-span-2">
                                        Departamento (Centro de costo)
                                        <select
                                            value={colabForm.data.centro_costo}
                                            onChange={(e) =>
                                                colabForm.setData('centro_costo', e.target.value)
                                            }
                                            className="px-3.5 py-[11px] text-[16px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                                        >
                                            {DEPS.map((d) => (
                                                <option key={d} value={d}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <footer className="px-8 py-5 flex justify-end gap-3 border-t border-[#E9E9E7] dark:border-[#2A302B]">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="min-h-[42px] px-5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] font-medium text-[#1F2328] dark:text-[#ECEFEC] cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={colabForm.processing}
                                    className="min-h-[42px] px-5 py-2 rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[15px] font-medium hover:brightness-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {colabForm.processing ? 'Guardando...' : 'Dar de alta'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* =====================================================================
                DRAWER LATERAL: FICHA INDIVIDUAL DEL COLABORADOR
            ===================================================================== */}
            {selectedColab && (
                <div
                    className="fixed inset-0 z-40 bg-[#141916]/35 flex justify-end"
                    onClick={(e) => e.target === e.currentTarget && setSelectedColab(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={selectedColab.nombre_completo}
                        className="bg-white dark:bg-[#1B1F1C] w-full max-w-[780px] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
                    >
                        <header className="flex items-center justify-between px-8 pt-7 pb-2">
                            <h2 className="text-[24px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                {selectedColab.nombre_completo}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setSelectedColab(null)}
                                aria-label="Cerrar"
                                className="w-9 h-9 rounded-[8px] text-[26px] leading-none text-[#6B7280] hover:bg-[#F7F7F6] cursor-pointer"
                            >
                                ×
                            </button>
                        </header>

                        <div className="flex-1 px-8 py-4 overflow-y-auto grid gap-6 content-start text-[16px]">
                            <span
                                className={`justify-self-start inline-block px-3 py-0.5 rounded-full text-[13px] font-medium ${getChipClasses(
                                    selectedColab.estado_operativo
                                )}`}
                            >
                                {selectedColab.estado_operativo}
                            </span>

                            <div>
                                <h3 className="text-[17px] font-semibold m-0">
                                    Datos del legajo{' '}
                                    <small className="text-[#6B7280] dark:text-[#9AA39D] font-normal">
                                        · solo lectura
                                    </small>
                                </h3>
                                <dl className="mt-3 grid grid-cols-[150px_1fr] gap-y-3.5 gap-x-4 m-0 text-[15px]">
                                    <dt className="text-[#6B7280] dark:text-[#9AA39D]">DNI</dt>
                                    <dd className="font-semibold m-0">{selectedColab.dni}</dd>

                                    <dt className="text-[#6B7280] dark:text-[#9AA39D]">Legajo</dt>
                                    <dd className="font-semibold m-0">{selectedColab.legajo}</dd>

                                    <dt className="text-[#6B7280] dark:text-[#9AA39D]">Correo</dt>
                                    <dd className="font-semibold m-0">{selectedColab.email}</dd>

                                    <dt className="text-[#6B7280] dark:text-[#9AA39D]">Nodo</dt>
                                    <dd className="font-semibold m-0">
                                        {selectedColab.zona_geografica_establecimient}
                                    </dd>

                                    <dt className="text-[#6B7280] dark:text-[#9AA39D]">
                                        Departamento
                                    </dt>
                                    <dd className="font-semibold m-0">
                                        {selectedColab.centro_costo}
                                    </dd>
                                </dl>
                            </div>

                            <div>
                                <h3 className="text-[17px] font-semibold m-0">
                                    Avance de la inducción · {selectedColab.avance ?? 60}%
                                </h3>
                                <div className="h-1 bg-[#E9E9E7] dark:bg-[#2A302B] rounded-full overflow-hidden my-2.5">
                                    <i
                                        className="block h-full bg-[#2F6F5E] dark:bg-[#6FBFA5]"
                                        style={{ width: `${selectedColab.avance ?? 60}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px] p-3.5">
                                        <small className="text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                            Último ingreso
                                        </small>
                                        <br />
                                        <b className="text-[20px] font-semibold">
                                            {selectedColab.ultimo_ingreso || 'hace 2 días'}
                                        </b>
                                    </div>
                                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px] p-3.5">
                                        <small className="text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                            Tiempo total en la app
                                        </small>
                                        <br />
                                        <b className="text-[20px] font-semibold">
                                            {selectedColab.tiempo_total || '6 h 40 min'}
                                        </b>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                    <h3 className="text-[17px] font-semibold m-0 flex-1">
                                        Historial de evaluaciones
                                    </h3>
                                    <input
                                        type="search"
                                        value={evalSearch}
                                        onChange={(e) => setEvalSearch(e.target.value)}
                                        placeholder="Buscar cuestionario"
                                        className="w-full sm:w-[260px] px-3 py-1.5 text-[14px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C]"
                                    />
                                </div>
                                <div className="overflow-x-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px]">
                                    <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B]">
                                                <th className="py-3 px-5 text-[13px] font-medium text-[#6B7280]">
                                                    Cuestionario
                                                </th>
                                                <th className="py-3 px-5 text-[13px] font-medium text-[#6B7280]">
                                                    Intentos
                                                </th>
                                                <th className="py-3 px-5 text-[13px] font-medium text-[#6B7280]">
                                                    Fecha
                                                </th>
                                                <th className="py-3 px-5 text-[13px] font-medium text-[#6B7280]">
                                                    Nota
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(selectedColab.historial_evaluaciones || HISTORIAL_MOCK)
                                                .filter((ev) =>
                                                    ev.cuestionario
                                                        .toLowerCase()
                                                        .includes(evalSearch.toLowerCase())
                                                )
                                                .map((ev, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="border-b last:border-b-0 border-[#E9E9E7] dark:border-[#2A302B] text-[15px]"
                                                    >
                                                        <td className="py-3.5 px-5">
                                                            {ev.cuestionario}
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            {ev.intentos}
                                                        </td>
                                                        <td className="py-3.5 px-5">{ev.fecha}</td>
                                                        <td className="py-3.5 px-5">
                                                            <b>{ev.nota}</b>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <footer className="px-8 py-5 flex justify-end gap-3 flex-wrap border-t border-[#E9E9E7] dark:border-[#2A302B]">
                            <button
                                type="button"
                                onClick={() => handleForcePasswordReset(selectedColab)}
                                className="min-h-[42px] px-5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] font-medium text-[#1F2328] dark:text-[#ECEFEC] cursor-pointer"
                            >
                                Forzar restablecimiento de contraseña
                            </button>

                            {selectedColab.estado_operativo === 'Activo' ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMotivoBaja('Suspendido');
                                        setConfirmModal({
                                            title: 'Dar de baja o suspender acceso',
                                            message: `${selectedColab.nombre_completo} no podrá ingresar a la app móvil hasta que reactives su acceso.`,
                                            confirmText: 'Confirmar baja / suspensión',
                                            isDanger: true,
                                            extraSelect: {
                                                label: 'Motivo / Nuevo estado operativo',
                                                value: 'Suspendido',
                                                options: ESTADOS_BAJA,
                                                onChange: (val: string) => setMotivoBaja(val),
                                            },
                                            onConfirm: () =>
                                                handleToggleStatus(selectedColab, motivoBaja),
                                        });
                                    }}
                                    className="min-h-[42px] px-5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] font-medium text-[#B3372B] dark:text-[#EE8274] cursor-pointer"
                                >
                                    Dar de baja / Suspender acceso
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmModal({
                                            title: 'Confirmar reactivación',
                                            message: `${selectedColab.nombre_completo} volverá al estado Activo y recuperará el acceso a la app.`,
                                            confirmText: 'Poner activo',
                                            onConfirm: () =>
                                                handleToggleStatus(selectedColab, 'Activo'),
                                        })
                                    }
                                    className="min-h-[42px] px-5 py-2 rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[15px] font-medium cursor-pointer"
                                >
                                    Poner activo
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}

            {/* =====================================================================
                MODAL DE CONFIRMACIÓN GENERAL
            ===================================================================== */}
            {confirmModal && (
                <div
                    className="fixed inset-0 z-50 bg-[#141916]/35 grid place-items-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setConfirmModal(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="bg-white dark:bg-[#1B1F1C] rounded-[16px] shadow-2xl w-full max-w-[520px] flex flex-col animate-in zoom-in-95 duration-150"
                    >
                        <header className="flex items-center justify-between px-8 pt-7 pb-2">
                            <h2 className="text-[22px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                {confirmModal.title}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                className="w-9 h-9 rounded-[8px] text-[26px] leading-none text-[#6B7280] cursor-pointer"
                            >
                                ×
                            </button>
                        </header>

                        <div className="px-8 py-4 grid gap-4">
                            <p className="text-[16px] text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                {confirmModal.message}
                            </p>

                            {confirmModal.extraSelect && (
                                <label className="grid gap-2 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                    {confirmModal.extraSelect.label}
                                    <select
                                        value={motivoBaja}
                                        onChange={(e) => {
                                            setMotivoBaja(e.target.value);
                                            confirmModal.extraSelect?.onChange(e.target.value);
                                        }}
                                        className="px-3.5 py-2.5 text-[15px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                                    >
                                        {confirmModal.extraSelect.options.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt === 'Inactivo'
                                                    ? 'Inactivo (Baja definitiva / Despido)'
                                                    : opt}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                        </div>

                        <footer className="px-8 py-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                className="min-h-[42px] px-5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] font-medium text-[#1F2328] dark:text-[#ECEFEC] cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmModal.onConfirm}
                                className={`min-h-[42px] px-5 py-2 rounded-[8px] text-[15px] font-medium text-white cursor-pointer ${
                                    confirmModal.isDanger
                                        ? 'bg-[#B3372B] border border-[#B3372B]'
                                        : 'bg-[#2F6F5E] border border-[#2F6F5E] dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                }`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* TOAST FLOTANTE */}
            {toastMsg && (
                <div
                    role="status"
                    className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#1F2328] dark:bg-[#ECEFEC] text-white dark:text-[#141714] px-5 py-3 rounded-[10px] shadow-lg text-[15px] font-medium"
                >
                    {toastMsg}
                </div>
            )}
        </AppLayout>
    );
}