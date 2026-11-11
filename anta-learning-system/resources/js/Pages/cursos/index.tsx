import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';

import {
    Search,
    Filter,
    RotateCcw,
    Plus,
    Edit3,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    BookOpen,
    X,
} from 'lucide-react';

interface CursoItem {
    id_curso: number;
    nombre: string;
    descripcion?: string;
    tiempo_vigencia: string;
    estado_curso: 'Activo' | 'Borrador' | 'Inactivo' | string;
    id_curso_req?: number | null;
    curso_requisito?: {
        id_curso: number;
        nombre: string;
    } | null;
    modulos_count?: number;
    created_at: string;
}

interface Props {
    cursos: CursoItem[];
}

export default function CursosIndex({ cursos = [] }: Props) {
    const { can } = useAuth();  
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

    // Formateo legible de fechas (DD/MM/YYYY)
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    // =========================================================================
    // 1. FILTROS POR COLUMNA Y PAGINACIÓN
    // =========================================================================
    const [showSearch, setShowSearch] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [draftFilters, setDraftFilters] = useState({
        search: '',
        sort: 'az' as 'az' | 'za',
        creacion: '',
        vencimiento: '',
        estado: 'Todos',
    });

    const [appliedFilters, setAppliedFilters] = useState({
        search: '',
        sort: 'az' as 'az' | 'za',
        creacion: '',
        vencimiento: '',
        estado: 'Todos',
    });

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(5);

    const applyFilters = () => {
        setAppliedFilters({ ...draftFilters });
        setPage(1);
    };

    const resetFilters = () => {
        const clean = {
            search: '',
            sort: 'az' as const,
            creacion: '',
            vencimiento: '',
            estado: 'Todos',
        };
        setDraftFilters(clean);
        setAppliedFilters(clean);
        setShowSearch(false);
        setPage(1);
    };

    const processedCursos = useMemo(() => {
        const q = appliedFilters.search.toLowerCase().trim();

        const filtered = cursos.filter((c) => {
            const reqName = c.curso_requisito?.nombre || '';
            const matchText =
                !q ||
                `${c.nombre} ${c.descripcion || ''} ${reqName} ${c.estado_curso}`
                    .toLowerCase()
                    .includes(q);

            const matchEstado =
                appliedFilters.estado === 'Todos' ||
                c.estado_curso === appliedFilters.estado;

            const fechaCreacionISO = c.created_at ? c.created_at.slice(0, 10) : '';
            const fechaVencISO = c.tiempo_vigencia ? c.tiempo_vigencia.slice(0, 10) : '';

            const matchCreacion =
                !appliedFilters.creacion || fechaCreacionISO === appliedFilters.creacion;

            const matchVencimiento =
                !appliedFilters.vencimiento || fechaVencISO === appliedFilters.vencimiento;

            return matchText && matchEstado && matchCreacion && matchVencimiento;
        });

        filtered.sort((a, b) => {
            // Priorizar siempre los cursos en estado "Borrador" al principio de la tabla
            if (a.estado_curso === 'Borrador' && b.estado_curso !== 'Borrador') return -1;
            if (a.estado_curso !== 'Borrador' && b.estado_curso === 'Borrador') return 1;

            const cmp = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
            return appliedFilters.sort === 'az' ? cmp : -cmp;
        });

        return filtered;
    }, [cursos, appliedFilters]);

    const totalPages = Math.max(1, Math.ceil(processedCursos.length / perPage));
    const paginatedCursos = useMemo(() => {
        const start = (page - 1) * perPage;
        return processedCursos.slice(start, start + perPage);
    }, [processedCursos, page, perPage]);

    // Cambio rápido de estado desde la tabla
    const handleQuickStatusChange = (curso: CursoItem, nuevoEstado: string) => {
        router.patch(
            `/cursos/${curso.id_curso}/status`,
            { estado_curso: nuevoEstado },
            { preserveScroll: true }
        );
    };

    const getChipClasses = (estado: string) => {
        if (estado === 'Activo') {
            return 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:bg-[#6CC28A]/15 dark:text-[#6CC28A]';
        }
        if (estado === 'Borrador') {
            return 'bg-[#B5651D]/15 text-[#B5651D] dark:bg-[#E3A15A]/15 dark:text-[#E3A15A]';
        }
        return 'bg-[#B3372B]/12 text-[#B3372B] dark:bg-[#EE8274]/15 dark:text-[#EE8274]';
    };

    // =========================================================================
    // 2. MODAL DE DOBLE VERIFICACIÓN PARA ELIMINAR CURSO
    // =========================================================================
    const [deleteTarget, setDeleteTarget] = useState<CursoItem | null>(null);
    const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
    const [deleteChecked, setDeleteChecked] = useState(false);

    const openDeleteModal = (curso: CursoItem) => {
        setDeleteTarget(curso);
        setDeleteStep(1);
        setDeleteChecked(false);
    };

    const confirmFinalDelete = () => {
        if (!deleteTarget || !deleteChecked) return;
        router.delete(`/cursos/${deleteTarget.id_curso}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AppLayout title="Cursos y Contenido">
            <Head title="Cursos y Contenido · Panel de RRHH" />

            {/* ENCABEZADO */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div className="flex-1 min-w-[260px]">
                    <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-1">
                        Cursos y contenido
                    </h1>
                    <p className="text-[#6B7280] dark:text-[#9AA39D] text-[15px] m-0">
                        Gestión del catálogo formativo, módulos multimedia, cuestionarios y borradores.
                    </p>
                </div>

                {can('crear_curso') && (
                <div>
                    <Link
                        href="/cursos/create"
                        className="inline-flex items-center gap-2 min-h-[38px] px-[18px] py-[7px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] text-white dark:text-[#0E1A15] font-medium text-[15px] hover:brightness-95 transition cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo curso
                    </Link>
                </div>
                )}
            </div>

            {/* CONTENEDOR DE FILTROS Y TABLA */}
            <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] overflow-hidden">
                
                {/* BARRA DE FILTROS (Botones Filtrar y Resetear fijos a la derecha) */}
                <div className="p-4 md:px-7 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5">
                        
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSearch((prev) => {
                                        const next = !prev;
                                        if (next) setTimeout(() => searchInputRef.current?.focus(), 50);
                                        return next;
                                    });
                                }}
                                title="Buscar por nombre"
                                className={`inline-flex items-center justify-center min-h-[38px] px-2.5 py-[7px] rounded-[8px] border transition cursor-pointer shrink-0 ${
                                    showSearch || draftFilters.search
                                        ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                        : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280]'
                                }`}
                            >
                                <Search className="h-4 w-4" />
                            </button>

                            {showSearch && (
                                <div className="relative w-48 sm:w-56 shrink-0 animate-in fade-in duration-150">
                                    <input
                                        ref={searchInputRef}
                                        type="search"
                                        value={draftFilters.search}
                                        onChange={(e) =>
                                            setDraftFilters({ ...draftFilters, search: e.target.value })
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') applyFilters();
                                            if (e.key === 'Escape') setShowSearch(false);
                                        }}
                                        placeholder="Buscar curso..."
                                        className="w-full pl-3 pr-7 py-[7px] min-h-[38px] rounded-[8px] border border-[#2F6F5E] bg-white dark:bg-[#1B1F1C] text-[13.5px] focus:outline-none"
                                    />
                                    {draftFilters.search && (
                                        <button
                                            type="button"
                                            onClick={() => setDraftFilters({ ...draftFilters, search: '' })}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280]"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            )}

                            <span className="text-[13px] text-[#6B7280] shrink-0">Curso:</span>
                            <select
                                value={draftFilters.sort}
                                onChange={(e) =>
                                    setDraftFilters({ ...draftFilters, sort: e.target.value as 'az' | 'za' })
                                }
                                className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] px-2.1"
                            >
                                <option value="az">A-Z</option>
                                <option value="za">Z-A</option>
                            </select>

                            <span className="text-[13px] text-[#6B7280] shrink-0">Creación:</span>
                            <input
                                type="date"
                                value={draftFilters.creacion}
                                onChange={(e) =>
                                    setDraftFilters({ ...draftFilters, creacion: e.target.value })
                                }
                                className="py-[6px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] px-2.5"
                            />

                            <span className="text-[13px] text-[#6B7280] shrink-0">Vencimiento:</span>
                            <input
                                type="date"
                                value={draftFilters.vencimiento}
                                onChange={(e) =>
                                    setDraftFilters({ ...draftFilters, vencimiento: e.target.value })
                                }
                                className="py-[6px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] px-2.5"
                            />

                            <span className="text-[13px] text-[#6B7280] shrink-0">Estado:</span>
                            <select
                                value={draftFilters.estado}
                                onChange={(e) =>
                                    setDraftFilters({ ...draftFilters, estado: e.target.value })
                                }
                                className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] px-2"
                            >
                                <option value="Todos">Todos</option>
                                <option value="Activo">Activo</option>
                                <option value="Borrador">Borrador</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </div>

                        {/* Botones estáticos a la derecha */}
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-[7px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14px] font-medium cursor-pointer"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                Filtrar
                            </button>

                            <button
                                type="button"
                                onClick={resetFilters}
                                title="Restablecer filtros"
                                className="inline-flex items-center justify-center min-h-[38px] px-2.5 py-[7px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] cursor-pointer"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLA DE VISTA RÁPIDA SIN SCROLL HORIZONTAL */}
                <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/50">
                            <th className="w-[32%] min-w-[220px] py-3 px-5 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Nombre del Curso y Correlatividad
                                </th>
                                <th className="w-[15%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Fecha Creación
                                </th>
                                <th className="w-[15%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Fecha Vencimiento
                                </th>
                                <th className="w-[14%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Estado
                                </th>
                                {can('editar_curso') && (
                                <th className="w-[24%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px] text-center">
                                    Acciones
                                </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B] text-[14px]">
                            {paginatedCursos.length > 0 ? (
                                paginatedCursos.map((curso) => (
                                    <tr
                                        key={curso.id_curso}
                                        className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors"
                                    >
                                        {/* Columna 1: Nombre + Requisito + Módulos */}
                                        <td
                                            onClick={() => router.visit(`/cursos/${curso.id_curso}`)}
                                            className="py-3.5 px-5 align-middle cursor-pointer"
                                        >
                                            <b className="font-semibold text-[#1F2328] dark:text-[#ECEFEC] block truncate">
                                                {curso.nombre}
                                            </b>
                                            <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] block truncate">
                                                {curso.modulos_count ?? 0} mód. · Req:{' '}
                                                {curso.curso_requisito
                                                    ? curso.curso_requisito.nombre
                                                    : 'Ninguno (Libre)'}
                                            </span>
                                        </td>

                                        {/* Columna 2: Fecha de Creación */}
                                        <td className="py-3.5 px-4 align-middle text-[#1F2328] dark:text-[#ECEFEC]">
                                            {formatDate(curso.created_at)}
                                        </td>

                                        {/* Columna 3: Fecha de Vencimiento */}
                                        <td className="py-3.5 px-4 align-middle text-[#1F2328] dark:text-[#ECEFEC]">
                                            {formatDate(curso.tiempo_vigencia)}
                                        </td>

                                        {/* Columna 4: Selector rápido de Estado */}
                                        <td className="py-3.5 px-4 align-middle">
                                            {can('editar_curso') ? (
                                                <select
                                                    value={curso.estado_curso}
                                                    onChange={(e) => handleQuickStatusChange(curso, e.target.value)}
                                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-medium border-0 cursor-pointer outline-none ${getChipClasses(curso.estado_curso)}`}
                                                >
                                                    <option value="Activo">Activo</option>
                                                    <option value="Borrador">Borrador</option>
                                                    <option value="Inactivo">Inactivo</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-medium ${getChipClasses(curso.estado_curso)}`}>
                                                    {curso.estado_curso}
                                                </span>
                                            )}
                                        </td>

                                        {/* Columna 5: Acciones */}
                                        {can('editar_curso') && (
                                        <td className="py-3.5 px-4 align-middle text-center">
                                            <div className="inline-flex items-center justify-center gap-1.5 flex-nowrap">
                                                <Link
                                                    href={`/cursos/${curso.id_curso}/edit`}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-[8px] border text-[13px] font-medium whitespace-nowrap ${
                                                        curso.estado_curso === 'Borrador'
                                                            ? 'border-[#B5651D] bg-[#B5651D]/10 text-[#B5651D] dark:text-[#E3A15A]'
                                                            : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]'
                                                    }`}
                                                >
                                                    <Edit3 className="h-3.5 w-3.5 shrink-0" />
                                                    {curso.estado_curso === 'Borrador'
                                                        ? 'Continuar'
                                                        : 'Editar'}
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteModal(curso)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] font-medium text-[#B3372B] dark:text-[#EE8274] hover:bg-[#B3372B]/10 cursor-pointer"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                                </button>
                                            </div>
                                        </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="py-6 px-7 text-[#6B7280] dark:text-[#9AA39D]"
                                    >
                                        No hay cursos registrados con los filtros aplicados.
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
                                value={perPage}
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="px-2.1 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
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
                            · Total: <b>{processedCursos.length}</b> cursos
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 font-normal">
                            Ir a página:
                            <select
                                value={page}
                                onChange={(e) => setPage(Number(e.target.value))}
                                className="px-2.1 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                            >
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <option key={p} value={p}>
                                        {p} de {totalPages}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="p-1.5 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="p-1.5 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE DOBLE VERIFICACIÓN PARA ELIMINAR */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 bg-[#141916]/45 grid place-items-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="bg-white dark:bg-[#1B1F1C] rounded-[16px] shadow-2xl w-full max-w-[500px] overflow-hidden"
                    >
                        <header className="flex items-center justify-between px-7 pt-6 pb-2">
                            <div className="flex items-center gap-2.5 text-[#B3372B] dark:text-[#EE8274]">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <h2 className="text-[20px] font-semibold m-0">
                                    {deleteStep === 1
                                        ? 'Eliminar curso (Verificación 1 de 2)'
                                        : 'Confirmación definitiva (Verificación 2 de 2)'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="w-8 h-8 rounded-[8px] text-[22px] text-[#6B7280] cursor-pointer"
                            >
                                ×
                            </button>
                        </header>

                        <div className="px-7 py-4 grid gap-4 text-[15px]">
                            {deleteStep === 1 ? (
                                <p className="m-0 text-[#1F2328] dark:text-[#ECEFEC]">
                                    Estás por eliminar el curso <b>"{deleteTarget.nombre}"</b> (Estado
                                    actual: <b>{deleteTarget.estado_curso}</b>). ¿Deseás avanzar a la
                                    confirmación definitiva?
                                </p>
                            ) : (
                                <>
                                    <p className="m-0 text-[#1F2328] dark:text-[#ECEFEC]">
                                        Por seguridad, marcá la casilla para confirmar que querés
                                        borrar permanentemente <b>"{deleteTarget.nombre}"</b> y sus
                                        módulos asociados.
                                    </p>
                                    <label className="flex items-center gap-3 p-3 rounded-[8px] border border-[#B3372B]/30 bg-[#B3372B]/10 text-[14px] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={deleteChecked}
                                            onChange={(e) => setDeleteChecked(e.target.checked)}
                                            className="accent-[#B3372B] w-4 h-4 shrink-0"
                                        />
                                        <span className="font-medium text-[#B3372B] dark:text-[#EE8274]">
                                            Sí, estoy seguro de eliminar este curso de forma
                                            irreversible.
                                        </span>
                                    </label>
                                </>
                            )}
                        </div>

                        <footer className="px-7 py-4 border-t border-[#E9E9E7] dark:border-[#2A302B] flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="min-h-[38px] px-4 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] font-medium cursor-pointer"
                            >
                                Cancelar
                            </button>

                            {deleteStep === 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setDeleteStep(2)}
                                    className="min-h-[38px] px-4 py-1.5 rounded-[8px] bg-[#B5651D] text-white text-[14px] font-medium cursor-pointer"
                                >
                                    Continuar a verificación final
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={!deleteChecked}
                                    onClick={confirmFinalDelete}
                                    className="min-h-[38px] px-4 py-1.5 rounded-[8px] bg-[#B3372B] text-white text-[14px] font-medium disabled:opacity-40 cursor-pointer"
                                >
                                    Eliminar definitivamente
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}

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