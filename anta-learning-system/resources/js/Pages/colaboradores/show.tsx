import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import {
    ArrowLeft,
    Edit3,
    KeyRound,
    UserCheck,
    UserX,
    Calendar,
    Briefcase,
    Building2,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

interface Evaluacion {
    cuestionario: string;
    intentos: number;
    fecha: string;
    nota: number;
}

interface ColaboradorDetalle {
    id: number;
    nombre_completo: string;
    dni: number | string;
    legajo: number | string;
    email: string;
    rol: string;
    zona_geografica_establecimient: string;
    centro_costo: string;
    estado_operativo: string;
    fecha_ingreso?: string;
    avance?: number;
    progresos?: Array<{
        id_progreso: number;
        estado: string;
        porcentaje_avance: number;
        curso?: { nombre: string };
    }>;
}

interface Props {
    colaborador: ColaboradorDetalle;
}

const HISTORIAL_MOCK: Evaluacion[] = [
    { cuestionario: 'Normas básicas de seguridad', intentos: 1, fecha: '12/09/2026', nota: 90 },
    { cuestionario: 'Uso correcto de EPP', intentos: 2, fecha: '18/09/2026', nota: 75 },
    { cuestionario: 'Manejo de agroquímicos', intentos: 3, fecha: '29/09/2026', nota: 60 },
];

const ESTADOS_BAJA = ['Suspendido', 'Inactivo', 'Vacaciones', 'Lesionado', 'Siniestrado'];

export default function ColaboradorShow({ colaborador }: Props) {
    const [evalSearch, setEvalSearch] = useState('');
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        confirmText: string;
        isDanger?: boolean;
        showReasonSelect?: boolean;
        onConfirm: (motivo?: string) => void;
    } | null>(null);
    const [motivoBaja, setMotivoBaja] = useState('Suspendido');

    const handleForcePasswordReset = () => {
        setConfirmModal({
            title: 'Confirmar restablecimiento de contraseña',
            message: `La clave de ${colaborador.nombre_completo} volverá a ser su DNI (${colaborador.dni}) y la app móvil le exigirá crear una clave nueva en su próximo inicio.`,
            confirmText: 'Restablecer contraseña',
            onConfirm: () => {
                router.post(`/colaboradores/${colaborador.id}/reset-password`, {}, {
                    preserveScroll: true,
                    onSuccess: () => setConfirmModal(null),
                });
            },
        });
    };

    const handleToggleStatus = (nuevoEstado: string) => {
        router.patch(`/colaboradores/${colaborador.id}/status`, { estado_operativo: nuevoEstado }, {
            preserveScroll: true,
            onSuccess: () => setConfirmModal(null),
        });
    };

    const getChipClasses = (estado: string) => {
        if (estado === 'Activo') {
            return 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:bg-[#6CC28A]/15 dark:text-[#6CC28A]';
        }
        if (estado === 'Vacaciones' || estado === 'Lesionado') {
            return 'bg-[#B5651D]/12 text-[#B5651D] dark:bg-[#E3A15A]/15 dark:text-[#E3A15A]';
        }
        return 'bg-[#B3372B]/12 text-[#B3372B] dark:bg-[#EE8274]/15 dark:text-[#EE8274]';
    };

    return (
        <AppLayout
            title={colaborador.nombre_completo}
            breadcrumbs={[
                { title: 'Colaboradores', href: '/colaboradores' },
                { title: colaborador.nombre_completo },
            ]}
        >
            <Head title={`${colaborador.nombre_completo} · Detalle del Colaborador`} />

            <div className="w-full max-w-[960px] mx-auto space-y-6">
                
                {/* CABECERA CON BOTÓN VOLVER Y ACCIÓN DE EDICIÓN RÁPIDA */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/colaboradores"
                            className="p-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] transition"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-[26px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                    {colaborador.nombre_completo}
                                </h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-[17px] font-semibold ${getChipClasses(colaborador.estado_operativo)}`}>
                                    {colaborador.estado_operativo}
                                </span>
                            </div>
                            <span className="text-[14px] text-[#6B7280] dark:text-[#9AA39D]">
                                Legajo #{colaborador.legajo} · DNI: {colaborador.dni}
                            </span>
                        </div>
                    </div>

                    {/* BOTÓN EDITAR EN CASO DE CARGA ERRÓNEA */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                            href={`/colaboradores/${colaborador.id}/edit`}
                            className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-2 rounded-[8px] border border-[#2F6F5E] text-[#2F6F5E] dark:text-[#6FBFA5] bg-white dark:bg-[#1B1F1C] hover:bg-[#EDF4F1] dark:hover:bg-[#223029] text-[14px] font-semibold transition"
                        >
                            <Edit3 className="h-4 w-4" />
                            Editar datos del colaborador
                        </Link>

                        <button
                            type="button"
                            onClick={handleForcePasswordReset}
                            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC] hover:bg-[#F7F7F6] transition cursor-pointer"
                        >
                            <KeyRound className="h-4 w-4 text-[#B5651D]" />
                            Restablecer clave
                        </button>

                        {colaborador.estado_operativo === 'Activo' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setMotivoBaja('Suspendido');
                                    setConfirmModal({
                                        title: 'Suspender o dar de baja',
                                        message: `${colaborador.nombre_completo} no podrá acceder a la app móvil hasta reactivarse.`,
                                        confirmText: 'Confirmar suspensión',
                                        isDanger: true,
                                        showReasonSelect: true,
                                        onConfirm: (motivo) => handleToggleStatus(motivo || 'Suspendido'),
                                    });
                                }}
                                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-2 rounded-[8px] border border-[#B3372B]/30 bg-white dark:bg-[#1B1F1C] text-[#B3372B] dark:text-[#EE8274] hover:bg-[#B3372B]/10 text-[14px] font-medium transition cursor-pointer"
                            >
                                <UserX className="h-4 w-4" />
                                Suspender acceso
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmModal({
                                        title: 'Reactivar colaborador',
                                        message: `${colaborador.nombre_completo} volverá a tener acceso activo a la app móvil.`,
                                        confirmText: 'Poner activo',
                                        onConfirm: () => handleToggleStatus('Activo'),
                                    });
                                }}
                                className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-2 rounded-[8px] bg-[#2F6F5E] text-white text-[14px] font-semibold hover:bg-[#2F7D4F] transition cursor-pointer"
                            >
                                <UserCheck className="h-4 w-4" />
                                Poner activo
                            </button>
                        )}
                    </div>
                </div>

                {/* TARJETA 1: DATOS GENERALES DEL LEGAJO */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm">
                    <h2 className="text-[17px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-4 pb-2 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                        Información operativa y de contacto
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-[14px]">
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Correo electrónico:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">{colaborador.email}</b>
                        </div>
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Rol en el sistema:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">{colaborador.rol}</b>
                        </div>
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Nodo productivo:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">{colaborador.zona_geografica_establecimient}</b>
                        </div>
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Centro de costo / Dpto:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">{colaborador.centro_costo}</b>
                        </div>
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Fecha de ingreso:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">{colaborador.fecha_ingreso || '15/02/2026'}</b>
                        </div>
                        <div>
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[13px]">Estado de cuenta:</span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC] font-medium">{colaborador.estado_operativo}</b>
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: AVANCE DE CAPACITACIÓN */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm">
                    <h2 className="text-[17px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-3">
                        Avance general de onboarding: {colaborador.avance ?? 75}%
                    </h2>
                    <div className="h-2 w-full rounded-full bg-[#E9E9E7] dark:bg-[#2A302B] overflow-hidden">
                        <i
                            className="block h-full bg-[#2F6F5E] dark:bg-[#6FBFA5] transition-all duration-300"
                            style={{ width: `${colaborador.avance ?? 75}%` }}
                        />
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <h3 className="text-[15px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                Historial de evaluaciones y cuestionarios
                            </h3>
                            <input
                                type="search"
                                value={evalSearch}
                                onChange={(e) => setEvalSearch(e.target.value)}
                                placeholder="Buscar cuestionario..."
                                className="px-3 py-1.5 text-[13.5px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] w-full sm:w-[240px]"
                            />
                        </div>

                        <div className="overflow-x-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px]">
                            <table className="w-full border-collapse text-left text-[14px]">
                                <thead>
                                    <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/40">
                                        <th className="py-2.5 px-4 font-medium text-[#6B7280]">Cuestionario</th>
                                        <th className="py-2.5 px-4 font-medium text-[#6B7280]">Intentos</th>
                                        <th className="py-2.5 px-4 font-medium text-[#6B7280]">Fecha</th>
                                        <th className="py-2.5 px-4 font-medium text-[#6B7280] text-right">Calificación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                                    {HISTORIAL_MOCK.filter((ev) =>
                                        ev.cuestionario.toLowerCase().includes(evalSearch.toLowerCase())
                                    ).map((ev, idx) => (
                                        <tr key={idx} className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714]">
                                            <td className="py-3 px-4 font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                                {ev.cuestionario}
                                            </td>
                                            <td className="py-3 px-4 text-[#6B7280]">{ev.intentos}</td>
                                            <td className="py-3 px-4 text-[#6B7280]">{ev.fecha}</td>
                                            <td className="py-3 px-4 text-right">
                                                <b className={ev.nota >= 70 ? 'text-[#2F7D4F]' : 'text-[#B3372B]'}>
                                                    {ev.nota}/100
                                                </b>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            {confirmModal && (
                <div
                    className="fixed inset-0 z-50 bg-[#141916]/40 grid place-items-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setConfirmModal(null)}
                >
                    <div className="bg-white dark:bg-[#1B1F1C] rounded-[16px] shadow-2xl w-full max-w-[480px] p-6 space-y-4">
                        <h2 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                            {confirmModal.title}
                        </h2>
                        <p className="text-[14px] text-[#6B7280] dark:text-[#9AA39D] m-0">
                            {confirmModal.message}
                        </p>

                        {confirmModal.showReasonSelect && (
                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Motivo / Nuevo estado:
                                <select
                                    value={motivoBaja}
                                    onChange={(e) => setMotivoBaja(e.target.value)}
                                    className="px-3.5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C]"
                                >
                                    {ESTADOS_BAJA.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] text-[14px] font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => confirmModal.onConfirm(motivoBaja)}
                                className={`px-4 py-2 rounded-[8px] text-[14px] font-semibold text-white ${
                                    confirmModal.isDanger ? 'bg-[#B3372B]' : 'bg-[#2F6F5E]'
                                }`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}