import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import {
    ArrowLeft,
    Edit3,
    Video,
    Presentation,
    CheckCircle2,
    HelpCircle,
    Shuffle,
    Calendar,
    Layers,
} from 'lucide-react';

export default function CursoShow({ curso }: any) {
    const { flash } = usePage<any>().props;
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    useEffect(() => {
        if (flash?.success) {
            setToastMsg(flash.success);
            setTimeout(() => setToastMsg(null), 3000);
        }
    }, [flash]);

    if (!curso) {
        return (
            <AppLayout title="Curso no encontrado">
                <div className="p-8 text-center text-[#6B7280]">
                    No se encontraron los datos del curso.
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

    const handleChangeStatus = (nuevoEstado: 'Activo' | 'Borrador' | 'Inactivo') => {
        router.patch(
            `/cursos/${curso.id_curso}/status`,
            { estado_curso: nuevoEstado },
            { preserveScroll: true }
        );
    };

    // Buscar el cuestionario dentro de las lecciones del curso
    let cuestionarioCurso: any = null;
    (curso.modulos || []).forEach((m: any) => {
        (m.lecciones || []).forEach((l: any) => {
            if (l.tipo_recurso === 'Cuestionario' && l.cuestionario) {
                cuestionarioCurso = l.cuestionario;
            }
        });
    });

    const getChipClasses = (estado: string) => {
        if (estado === 'Activo') {
            return 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:bg-[#6CC28A]/15 dark:text-[#6CC28A]';
        }
        if (estado === 'Borrador') {
            return 'bg-[#B5651D]/15 text-[#B5651D] dark:bg-[#E3A15A]/15 dark:text-[#E3A15A]';
        }
        return 'bg-[#B3372B]/12 text-[#B3372B] dark:bg-[#EE8274]/15 dark:text-[#EE8274]';
    };

    return (
        <AppLayout
            title={curso.nombre}
            breadcrumbs={[
                { title: 'Cursos y contenido', href: '/cursos' },
                { title: curso.nombre },
            ]}
        >
            <Head title={`${curso.nombre} · Detalle del Curso`} />

            <div className="w-full max-w-[960px] mx-auto space-y-6">
                
                {/* CABECERA CON ACCIONES DE ESTADO Y EDICIÓN */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/cursos"
                            className="p-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] transition"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-[24px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                    {curso.nombre}
                                </h1>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${getChipClasses(
                                        curso.estado_curso
                                    )}`}
                                >
                                    {curso.estado_curso}
                                </span>
                            </div>
                            <span className="text-[13.5px] text-[#6B7280]">
                                Creado el {formatDate(curso.created_at)} · Vence el{' '}
                                {formatDate(curso.tiempo_vigencia)}
                            </span>
                        </div>
                    </div>

                    {/* Controles rápidos: Activar, Borrador, Desactivar y Modificar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] p-1 gap-1">
                            {(['Activo', 'Borrador', 'Inactivo'] as const).map((est) => (
                                <button
                                    key={est}
                                    type="button"
                                    onClick={() => handleChangeStatus(est)}
                                    className={`px-3 py-1 rounded-[6px] text-[13px] font-medium transition cursor-pointer ${
                                        curso.estado_curso === est
                                            ? 'bg-[#2F6F5E] text-white font-semibold'
                                            : 'text-[#6B7280] hover:text-[#1F2328]'
                                    }`}
                                >
                                    {est === 'Activo'
                                        ? 'Activar'
                                        : est === 'Borrador'
                                        ? 'A Borrador'
                                        : 'Desactivar'}
                                </button>
                            ))}
                        </div>

                        <Link
                            href={`/cursos/${curso.id_curso}/edit`}
                            className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-2 rounded-[8px] bg-[#2F6F5E] text-white text-[14px] font-semibold hover:brightness-95 transition"
                        >
                            <Edit3 className="h-4 w-4" />
                            Modificar curso
                        </Link>
                    </div>
                </div>

                {/* TARJETA 1: METADATOS DEL CURSO */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-3 pb-2 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                        Información general y correlatividad
                    </h2>
                    <p className="text-[14px] text-[#6B7280] dark:text-[#9AA39D] mt-0 mb-4">
                        {curso.descripcion || 'Sin descripción adicional.'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[14px]">
                        <div className="p-3.5 rounded-[10px] bg-[#F7F7F6] dark:bg-[#141714]">
                            <span className="text-[12px] text-[#6B7280] block">
                                Curso requisito previo:
                            </span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC]">
                                {curso.curso_requisito
                                    ? curso.curso_requisito.nombre
                                    : 'Ninguno (Desbloqueado)'}
                            </b>
                        </div>

                        <div className="p-3.5 rounded-[10px] bg-[#F7F7F6] dark:bg-[#141714]">
                            <span className="text-[12px] text-[#6B7280] block">
                                Fecha de vencimiento:
                            </span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC]">
                                {formatDate(curso.tiempo_vigencia)}
                            </b>
                        </div>

                        <div className="p-3.5 rounded-[10px] bg-[#F7F7F6] dark:bg-[#141714]">
                            <span className="text-[12px] text-[#6B7280] block">
                                Total de módulos:
                            </span>
                            <b className="text-[#1F2328] dark:text-[#ECEFEC]">
                                {(curso.modulos || []).length} módulos estructurados
                            </b>
                        </div>
                    </div>
                </div>

                {/* TARJETA 2: ESTRUCTURA DE MÓDULOS Y CONTENIDO ADJUNTO */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm space-y-4">
                    <h2 className="text-[16px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 flex items-center gap-2">
                        <Layers className="h-4.5 w-4.5 text-[#2F6F5E]" />
                        Estructura de Módulos y Material Multimedia
                    </h2>

                    <div className="grid gap-4">
                        {(curso.modulos || []).map((mod: any, idx: number) => {
                            const contenidosMultimedia = (mod.lecciones || []).filter(
                                (l: any) => l.tipo_recurso !== 'Cuestionario'
                            );
                            return (
                                <div
                                    key={mod.id_modulo || idx}
                                    className="border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-4 bg-[#F7F7F6]/40 dark:bg-[#141714]/40"
                                >
                                    <b className="text-[15px] text-[#1F2328] dark:text-[#ECEFEC] block mb-2.5">
                                        {mod.titulo}
                                    </b>

                                    {contenidosMultimedia.length > 0 ? (
                                        <div className="grid gap-2">
                                            {contenidosMultimedia.map((lec: any) => (
                                                <div
                                                    key={lec.id_leccion}
                                                    className="flex items-center justify-between gap-3 bg-white dark:bg-[#1B1F1C] px-3.5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] text-[13.5px]"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        {lec.tipo_recurso === 'Video' ? (
                                                            <Video className="h-4 w-4 text-[#2F6F5E]" />
                                                        ) : (
                                                            <Presentation className="h-4 w-4 text-[#B5651D]" />
                                                        )}
                                                        <span className="font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                                            {lec.titulo}
                                                        </span>
                                                    </div>
                                                    <span className="text-[12px] text-[#6B7280] font-mono">
                                                        {lec.id_sharepoint_item}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[13px] text-[#6B7280]">
                                            Sin archivos multimedia adjuntos en este módulo.
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* TARJETA 3: CUESTIONARIO DE EVALUACIÓN */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E9E7] dark:border-[#2A302B] pb-3">
                        <h2 className="text-[16px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 flex items-center gap-2">
                            <HelpCircle className="h-4.5 w-4.5 text-[#2F6F5E]" />
                            Cuestionario de Evaluación
                        </h2>

                        {cuestionarioCurso && (
                            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                                <span className="px-2.5 py-1 rounded-full bg-[#EDF4F1] text-[#2F6F5E] font-semibold">
                                    Aprobación mínima: {cuestionarioCurso.puntaje_min_aprobacion}%
                                </span>
                                <span className="px-2.5 py-1 rounded-full bg-[#F7F7F6] text-[#1F2328] font-medium">
                                    Muestra {cuestionarioCurso.cantidad_preguntas_mostrar} de{' '}
                                    {(cuestionarioCurso.preguntas || []).length} preguntas
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F7F7F6] text-[#6B7280]">
                                    <Shuffle className="h-3.5 w-3.5" />
                                    {cuestionarioCurso.orden_aleatorio
                                        ? 'Shuffle Activo'
                                        : 'Orden Fijo'}
                                </span>
                            </div>
                        )}
                    </div>

                    {cuestionarioCurso && (cuestionarioCurso.preguntas || []).length > 0 ? (
                        <div className="grid gap-3.5">
                            {cuestionarioCurso.preguntas.map((preg: any, pIdx: number) => (
                                <div
                                    key={preg.id_pregunta || pIdx}
                                    className="p-4 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] grid gap-2"
                                >
                                    <b className="text-[14.5px] text-[#1F2328] dark:text-[#ECEFEC]">
                                        {pIdx + 1}. {preg.enunciado}
                                    </b>
                                    <div className="grid gap-1.5 pl-3">
                                        {(preg.opciones || []).map((op: any, oIdx: number) => (
                                            <div
                                                key={op.id_opcion || oIdx}
                                                className={`flex items-center gap-2 text-[13.5px] px-3 py-1 rounded-[6px] ${
                                                    op.es_correcta
                                                        ? 'bg-[#2F7D4F]/12 text-[#2F7D4F] font-semibold'
                                                        : 'text-[#6B7280]'
                                                }`}
                                            >
                                                <CheckCircle2
                                                    className={`h-4 w-4 shrink-0 ${
                                                        op.es_correcta ? 'opacity-100' : 'opacity-20'
                                                    }`}
                                                />
                                                <span>{op.texto_opcion}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[14px] text-[#6B7280] m-0">
                            Este curso aún no posee preguntas configuradas en su cuestionario.
                        </p>
                    )}
                </div>
            </div>

            {toastMsg && (
                <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#1F2328] text-white px-5 py-3 rounded-[10px] shadow-lg text-[14px] font-medium">
                    {toastMsg}
                </div>
            )}
        </AppLayout>
    );
}