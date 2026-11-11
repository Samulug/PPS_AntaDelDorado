import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useAuth } from '@/hooks/use-auth';
import AppLayout from '@/Layouts/app-layout';
import {
    ArrowLeft,
    Edit3,
    Trash2,
    Users,
    BookOpen,
    AlertTriangle,
    ShieldCheck
} from 'lucide-react';

interface Colaborador {
    id: number;
    nombre_completo: string;
    dni: number | string;
    legajo: number | string;
    rol: string;
    zona_geografica_establecimient: string;
    centro_costo: string;
    estado_operativo: string;
}

interface CursoItem {
    id_curso: number;
    nombre: string;
    tiempo_vigencia?: string;
}

interface ProgresoCurso {
    id_progreso: number;
    id_curso: number;
    curso: CursoItem;
}

interface Cuadrilla {
    id_cuadrilla: number;
    nombre_cuadrilla: string;
    labor_asociada: string;
    estado: string | boolean;
    created_at?: string;
    colaboradores?: Colaborador[];
    progresos_cursos?: ProgresoCurso[];
}

export default function CuadrillaShow({ cuadrilla }: { cuadrilla: Cuadrilla }) {
    const { flash } = usePage<any>().props;
    const { can } = useAuth();
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
    const [deleteChecked, setDeleteChecked] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            setToastMsg(flash.success);
            setTimeout(() => setToastMsg(null), 3000);
        }
    }, [flash]);

    if (!cuadrilla) {
        return (
            <AppLayout title="Cuadrilla no encontrada">
                <div className="p-8 text-center text-[#6B7280]">
                    No se encontraron los datos de la cuadrilla.
                </div>
            </AppLayout>
        );
    }

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

    const normalizeEstado = (est: any): 'Borrador' | 'Activa' | 'Inactiva' => {
        if (est === 'Borrador') return 'Borrador';
        if (est === false || est === 'Inactiva') return 'Inactiva';
        return 'Activa';
    };
    const estadoStr = normalizeEstado(cuadrilla.estado);

    const handleChangeStatus = (nuevoEstado: 'Activa' | 'Borrador' | 'Inactiva') => {
        if (nuevoEstado === 'Activa' && (!cuadrilla.colaboradores || cuadrilla.colaboradores.length === 0)) {
            setToastMsg('No podés activar una cuadrilla sin integrantes.');
            setTimeout(() => setToastMsg(null), 3000);
            return;
        }

        router.patch(
            `/cuadrillas/${cuadrilla.id_cuadrilla}/status`,
            { estado: nuevoEstado },
            { preserveScroll: true }
        );
    };

    const executeConfirmedDelete = () => {
        if (!deleteChecked) return;
        router.delete(`/cuadrillas/${cuadrilla.id_cuadrilla}`, {
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteModal(false);
            },
        });
    };

    const getChipClasses = (estado: string) => {
        if (estado === 'Activa' || estado === 'Activo') {
            return 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:bg-[#6CC28A]/15 dark:text-[#6CC28A]';
        }
        if (estado === 'Borrador' || estado === 'Lesionado' || estado === 'Vacaciones') {
            return 'bg-[#B5651D]/15 text-[#B5651D] dark:bg-[#E3A15A]/15 dark:text-[#E3A15A]';
        }
        return 'bg-[#B3372B]/12 text-[#B3372B] dark:bg-[#EE8274]/15 dark:text-[#EE8274]';
    };

    // Cálculos rápidos para la ficha
    const nodosUnicos = Array.from(new Set((cuadrilla.colaboradores || []).map(m => m.zona_geografica_establecimient)));
    const rolesUnicos = Array.from(new Set((cuadrilla.colaboradores || []).map(m => m.rol)));

    // Extraer cursos únicos de `progresos_cursos`
    const cursosUnicosMap = new Map();
    (cuadrilla.progresos_cursos || []).forEach(p => {
        if (p.curso && !cursosUnicosMap.has(p.id_curso)) {
            cursosUnicosMap.set(p.id_curso, p.curso);
        }
    });
    const cursosAsignados = Array.from(cursosUnicosMap.values());

    return (
        <AppLayout
            title={cuadrilla.nombre_cuadrilla}
            breadcrumbs={[
                { title: 'Cuadrillas', href: '/cuadrillas' },
                { title: cuadrilla.nombre_cuadrilla },
            ]}
        >
            <Head title={`${cuadrilla.nombre_cuadrilla} · Detalle Cuadrilla`} />

            <div className="w-full max-w-[960px] mx-auto space-y-6">
                
                {/* CABECERA CON ACCIONES DE ESTADO Y EDICIÓN */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/cuadrillas"
                            className="p-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] transition"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-[24px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                    {cuadrilla.nombre_cuadrilla}
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${getChipClasses(estadoStr)}`}>
                                    {estadoStr}
                                </span>
                            </div>
                            <span className="text-[13.5px] text-[#6B7280]">
                                Creada el {formatDate(cuadrilla.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Controles rápidos: Activar, Borrador, Desactivar y Modificar/Eliminar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {can('editar_cuadrilla') && (
                            <>
                                <div className="inline-flex rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] p-1 gap-1">
                                    {(['Activa', 'Borrador', 'Inactiva'] as const).map((est) => (
                                        <button
                                            key={est}
                                            type="button"
                                            onClick={() => handleChangeStatus(est)}
                                            className={`px-3 py-1 rounded-[6px] text-[13px] font-medium transition cursor-pointer ${
                                                estadoStr === est
                                                    ? 'bg-[#2F6F5E] text-white font-semibold'
                                                    : 'text-[#6B7280] hover:text-[#1F2328]'
                                            }`}
                                        >
                                            {est === 'Activa' ? 'Activar' : est === 'Borrador' ? 'A Borrador' : 'Desactivar'}
                                        </button>
                                    ))}
                                </div>

                                <Link
                                    href={`/cuadrillas/${cuadrilla.id_cuadrilla}/edit`}
                                    className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-2 rounded-[8px] bg-[#2F6F5E] text-white text-[14px] font-semibold hover:brightness-95 transition"
                                >
                                    <Edit3 className="h-4 w-4" />
                                    Editar cuadrilla
                                </Link>
                            </>
                        )}
                        
                        {can('eliminar_cuadrilla') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteConfirmStep(1);
                                    setDeleteChecked(false);
                                    setShowDeleteModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] font-medium text-[#B3372B] dark:text-[#EE8274] hover:bg-[#B3372B]/10 transition cursor-pointer"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* TARJETA 1: DATOS OPERATIVOS */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-4 pb-2 border-b border-[#E9E9E7] dark:border-[#2A302B] flex items-center gap-2">
                        <ShieldCheck className="w-4.5 h-4.5 text-[#2F6F5E]" />
                        Datos operativos
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-[14px]">
                        <div className="sm:col-span-3">
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px] mb-1">Labor / Tarea de Riesgo:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">{cuadrilla.labor_asociada || 'No definida'}</b>
                        </div>
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Roles asignados:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">
                                {rolesUnicos.length > 0 ? rolesUnicos.join(', ') : 'Ninguno'}
                            </b>
                        </div>
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Nodos intervinientes:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">
                                {nodosUnicos.length > 0 ? nodosUnicos.join(', ') : 'Ninguno'}
                            </b>
                        </div>
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Total integrantes:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">
                                {(cuadrilla.colaboradores || []).length} personas
                            </b>
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: COLABORADORES ASIGNADOS */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-4 pb-2 border-b border-[#E9E9E7] dark:border-[#2A302B] flex items-center gap-2">
                        <Users className="w-4.5 h-4.5 text-[#2F6F5E]" />
                        Personal Integrante
                    </h2>

                    <div className="overflow-x-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px]">
                        <table className="w-full table-fixed border-collapse text-left text-[14px]">
                            <thead>
                                <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/40">
                                    <th className="w-[35%] py-3 px-5 font-medium text-[#6B7280]">Colaborador</th>
                                    <th className="w-[20%] py-3 px-4 font-medium text-[#6B7280]">DNI / Legajo</th>
                                    <th className="w-[25%] py-3 px-4 font-medium text-[#6B7280]">Rol y Nodo</th>
                                    <th className="w-[20%] py-3 px-5 font-medium text-[#6B7280] text-right">Estado Op.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                                {(cuadrilla.colaboradores || []).length > 0 ? (
                                    (cuadrilla.colaboradores || []).map((colab) => (
                                        <tr key={colab.id} className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714]">
                                            <td className="py-3 px-5 font-medium text-[#1F2328] dark:text-[#ECEFEC] truncate">
                                                {colab.nombre_completo}
                                            </td>
                                            <td className="py-3 px-4 text-[#6B7280] truncate">
                                                {colab.dni} <br/> <span className="text-[12px]">#{colab.legajo}</span>
                                            </td>
                                            <td className="py-3 px-4 text-[#6B7280] truncate">
                                                {colab.rol} <br/> <span className="text-[12px]">{colab.zona_geografica_establecimient}</span>
                                            </td>
                                            <td className="py-3 px-5 text-right">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-medium ${getChipClasses(colab.estado_operativo)}`}>
                                                    {colab.estado_operativo}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-5 px-5 text-center text-[#6B7280]">
                                            La cuadrilla no tiene colaboradores asignados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TARJETA 3: BATERÍA PREVENTIVA (CURSOS ASIGNADOS) */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-4 pb-2 border-b border-[#E9E9E7] dark:border-[#2A302B] flex items-center gap-2">
                        <BookOpen className="w-4.5 h-4.5 text-[#2F6F5E]" />
                        Batería Preventiva Asignada
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cursosAsignados.length > 0 ? (
                            cursosAsignados.map((curso: any) => (
                                <div key={curso.id_curso} className="flex items-center gap-3 bg-[#F7F7F6]/50 dark:bg-[#141714]/40 border border-[#E9E9E7] dark:border-[#2A302B] p-3 rounded-[10px]">
                                    <BookOpen className="h-5 w-5 text-[#2F6F5E] shrink-0" />
                                    <div className="min-w-0">
                                        <b className="text-[14px] text-[#1F2328] dark:text-[#ECEFEC] block truncate">
                                            {curso.nombre}
                                        </b>
                                        <span className="text-[12px] text-[#6B7280]">
                                            Vencimiento: {formatDate(curso.tiempo_vigencia)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="col-span-full text-[14px] text-[#6B7280] m-0">
                                No se ha asignado ninguna batería de cursos a esta cuadrilla.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DE ELIMINACIÓN CON DOBLE VERIFICACIÓN */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 bg-[#141916]/45 grid place-items-center p-4">
                    <div role="dialog" className="bg-white dark:bg-[#1B1F1C] rounded-[16px] shadow-2xl w-full max-w-[500px] overflow-hidden">
                        <header className="flex items-center justify-between px-7 pt-6 pb-2">
                            <div className="flex items-center gap-2.5 text-[#B3372B] dark:text-[#EE8274]">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <h2 className="text-[20px] font-semibold m-0">
                                    {deleteConfirmStep === 1
                                        ? 'Eliminar cuadrilla'
                                        : 'Confirmación definitiva'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                className="w-8 h-8 rounded-[8px] text-[22px] text-[#6B7280] cursor-pointer"
                            >
                                ×
                            </button>
                        </header>

                        <div className="px-7 py-4 grid gap-4 text-[15px]">
                            {deleteConfirmStep === 1 ? (
                                <p className="m-0 text-[#1F2328] dark:text-[#ECEFEC]">
                                    Estás por eliminar la cuadrilla{' '}
                                    <b>"{cuadrilla.nombre_cuadrilla}"</b> (Estado actual:{' '}
                                    <b>{estadoStr}</b>). ¿Deseás avanzar a la confirmación definitiva?
                                </p>
                            ) : (
                                <>
                                    <p className="m-0 text-[#1F2328] dark:text-[#ECEFEC]">
                                        Por seguridad, marcá la casilla de verificación para
                                        confirmar que querés borrar permanentemente esta cuadrilla.
                                    </p>
                                    <label className="flex items-center gap-3 p-3 rounded-[8px] border border-[#B3372B]/30 bg-[#B3372B]/10 text-[14px] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={deleteChecked}
                                            onChange={(e) => setDeleteChecked(e.target.checked)}
                                            className="accent-[#B3372B] w-4 h-4 shrink-0"
                                        />
                                        <span className="font-medium text-[#B3372B] dark:text-[#EE8274]">
                                            Sí, eliminar de forma irreversible.
                                        </span>
                                    </label>
                                </>
                            )}
                        </div>

                        <footer className="px-7 py-4 border-t border-[#E9E9E7] dark:border-[#2A302B] flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                className="min-h-[38px] px-4 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] font-medium cursor-pointer"
                            >
                                Cancelar
                            </button>
                            {deleteConfirmStep === 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmStep(2)}
                                    className="min-h-[38px] px-4 py-1.5 rounded-[8px] bg-[#B5651D] text-white text-[14px] font-medium cursor-pointer"
                                >
                                    Continuar a verificación final
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={!deleteChecked}
                                    onClick={executeConfirmedDelete}
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