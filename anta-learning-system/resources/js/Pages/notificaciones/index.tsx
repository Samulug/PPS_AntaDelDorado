import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime';
import {
    Bell,
    Mail,
    Smartphone,
    Calendar,
    Send,
    Clock,
    Ban,
    Users,
    AlertTriangle,
    Copy,
    CheckCircle2,
    Sparkles,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

interface NotificacionItem {
    id_notificacion: number;
    id_usuario: number | null;
    tipo_origen: 'Manual' | 'Automatica' | string;
    evento_disparador: string | null;
    titulo: string;
    mensaje: string;
    fecha_publicacion: string;
    fecha_programada: string | null;
    fecha_envio_real: string | null;
    enviado_push: boolean;
    enviado_email: boolean;
    segmento_destino: string;
    filtros_json: Record<string, any> | null;
    estado: 'Programada' | 'Enviada' | 'Cancelada' | 'Fallida' | string;
    total_destinatarios: number;
    leidos_count?: number;
    created_at: string;
    administrador?: {
        id: number;
        nombre_completo: string;
        rol: string;
    } | null;
    cancelada_por?: {
        id: number;
        nombre_completo: string;
    } | null;
}

interface ColaboradorOption {
    id: number;
    nombre_completo: string;
    legajo: number | string;
    dni: number | string;
    zona_geografica_establecimient: string;
    estado_operativo: string;
}

interface CuadrillaOption {
    id_cuadrilla: number;
    nombre_cuadrilla: string;
    labor_asociada: string | null;
}

interface NotificacionesProps {
    notificacionesIniciales: NotificacionItem[];
    catalogos: {
        nodos: string[];
        roles: string[];
        cuadrillas: CuadrillaOption[];
        colaboradores: ColaboradorOption[];
    };
    adminActual: {
        id: number;
        nombre_completo: string;
        rol: string;
    };
}

const PLANTILLAS_RAPIDAS = [
    {
        etiqueta: 'Recordatorio vencimiento',
        titulo: 'Capacitación pendiente por vencer',
        mensaje:
            'Recuerda completar tu capacitación obligatoria antes de la fecha límite desde la app de Anta del Dorado.',
        es_critica: false,
    },
    {
        etiqueta: 'Suspensión por clima',
        titulo: 'Aviso operativo por condiciones climáticas',
        mensaje:
            'Se suspenden las tareas programadas en campo hasta nuevo aviso. Mantente atento a las indicaciones de tu supervisor.',
        es_critica: true,
    },
    {
        etiqueta: 'Desbloqueo evaluación',
        titulo: 'Nueva oportunidad habilitada',
        mensaje:
            'Tu cuestionario fue desbloqueado por RRHH. Repasa el material en la app y realiza el nuevo intento.',
        es_critica: false,
    },
];

export default function NotificacionesIndex({
    notificacionesIniciales = [],
    catalogos,
    adminActual,
}: NotificacionesProps) {
    const { flash } = usePage<any>().props;
    const { can } = useAuth();

    // Sincronización en tiempo real cuando cambie la tabla notificacion_emitida
    useSupabaseRealtime({
        channelName: 'sync-notificaciones',
        tables: ['notificacion_emitida'],
        onlyProps: ['notificacionesIniciales'],
    });

    const esSuperAdmin = adminActual.rol === 'SuperAdmin';
    const puedeCrear = esSuperAdmin || can('crear_notificacion') || can('enviar_notificacion_push');
    const puedeCritica = esSuperAdmin || can('enviar_notificacion_critica');
    const puedeCancelarCualquiera = esSuperAdmin || adminActual.rol === 'Lic_RRHH';

    const { data, setData, post, processing, errors, reset } = useForm({
        titulo: '',
        mensaje: '',
        tipo_segmento: 'todos' as 'todos' | 'nodo' | 'rol' | 'cuadrilla' | 'estado' | 'especificos',
        nodo: catalogos.nodos[0] || '',
        rol: catalogos.roles[0] || '',
        cuadrilla_id: catalogos.cuadrillas[0]?.id_cuadrilla ? String(catalogos.cuadrillas[0].id_cuadrilla) : '',
        estado_curso: 'bloqueados' as 'bloqueados' | 'atrasados',
        usuarios_ids: [] as number[],
        es_critica: false,
        modo_envio: 'ahora' as 'ahora' | 'programar',
        fecha_programada: '',
    });

    // Estado de UI
    const [previewTab, setPreviewTab] = useState<'push' | 'email'>('push');
    const [busquedaColab, setBusquedaColab] = useState('');
    const [filtroTabla, setFiltroTabla] = useState<'TODAS' | 'MANUALES' | 'PROGRAMADAS' | 'AUTOMATICAS'>('TODAS');
    const [modalConfirmar, setModalConfirmar] = useState(false);

    // Contador dinámico de alcance
    const [alcance, setAlcance] = useState<{
        cargando: boolean;
        activos: number;
        excluidos: number;
        sin_fcm_token: number;
        etiqueta: string;
    }>({
        cargando: false,
        activos: 0,
        excluidos: 0,
        sin_fcm_token: 0,
        etiqueta: 'Todos los colaboradores activos',
    });

    // Consultar alcance en vivo con debounce de 250ms al cambiar segmento
    useEffect(() => {
        const timer = setTimeout(async () => {
            setAlcance((prev) => ({ ...prev, cargando: true }));
            try {
                const res = await axios.post('/notificaciones/alcance', {
                    tipo_segmento: data.tipo_segmento,
                    nodo: data.nodo || null,
                    rol: data.rol || null,
                    cuadrilla_id: data.cuadrilla_id ? Number(data.cuadrilla_id) : null,
                    estado_curso: data.estado_curso,
                    usuarios_ids: data.usuarios_ids,
                });
                setAlcance({
                    cargando: false,
                    activos: res.data.activos,
                    excluidos: res.data.excluidos,
                    sin_fcm_token: res.data.sin_fcm_token,
                    etiqueta: res.data.etiqueta,
                });
            } catch {
                setAlcance((prev) => ({ ...prev, cargando: false }));
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [
        data.tipo_segmento,
        data.nodo,
        data.rol,
        data.cuadrilla_id,
        data.estado_curso,
        data.usuarios_ids,
    ]);

    // Si desactiva alerta crítica, volver a vista Push
    useEffect(() => {
        if (!data.es_critica && previewTab === 'email') {
            setPreviewTab('push');
        }
    }, [data.es_critica, previewTab]);

    const colaboradoresFiltrados = useMemo(() => {
        const q = busquedaColab.trim().toLowerCase();
        if (!q) return catalogos.colaboradores.slice(0, 30);
        return catalogos.colaboradores
            .filter(
                (c) =>
                    c.nombre_completo.toLowerCase().includes(q) ||
                    String(c.legajo).includes(q) ||
                    String(c.dni).includes(q)
            )
            .slice(0, 30);
    }, [catalogos.colaboradores, busquedaColab]);

    const toggleUsuarioEspecifico = (id: number) => {
        const exists = data.usuarios_ids.includes(id);
        setData(
            'usuarios_ids',
            exists ? data.usuarios_ids.filter((uid) => uid !== id) : [...data.usuarios_ids, id]
        );
    };

    const notificacionesFiltradas = useMemo(() => {
        return notificacionesIniciales.filter((n) => {
            if (filtroTabla === 'MANUALES') return n.tipo_origen === 'Manual';
            if (filtroTabla === 'AUTOMATICAS') return n.tipo_origen === 'Automatica';
            if (filtroTabla === 'PROGRAMADAS') return n.estado === 'Programada';
            return true;
        });
    }, [notificacionesIniciales, filtroTabla]);

    const handleConfirmarDisparo = () => {
        post('/notificaciones', {
            preserveScroll: true,
            onSuccess: () => {
                setModalConfirmar(false);
                reset('titulo', 'mensaje', 'fecha_programada', 'usuarios_ids');
            },
        });
    };

    const handleCancelarProgramada = (item: NotificacionItem) => {
        if (!confirm(`¿Cancelar el envío programado "${item.titulo}"? No se enviará a ningún colaborador.`)) {
            return;
        }
        router.post(`/notificaciones/${item.id_notificacion}/cancelar`, {}, { preserveScroll: true });
    };

    const handleDuplicar = (item: NotificacionItem) => {
        setData((prev) => ({
            ...prev,
            titulo: item.titulo,
            mensaje: item.mensaje,
            es_critica: puedeCritica ? item.enviado_email : false,
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const formularioValido =
        data.titulo.trim().length > 0 &&
        data.mensaje.trim().length > 0 &&
        (data.modo_envio === 'ahora' || data.fecha_programada !== '') &&
        (data.tipo_segmento !== 'especificos' || data.usuarios_ids.length > 0);

    const formatearFecha = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Estados de paginación
    const [paginaActual, setPaginaActual] = useState<number>(1);
    const [itemsPorPagina, setItemsPorPagina] = useState<number>(5);

    const totalItems = notificacionesFiltradas.length;
    const totalPaginas = Math.max(1, Math.ceil(totalItems / itemsPorPagina));
    const paginaSegura = Math.min(paginaActual, totalPaginas);

    const notificacionesPaginadas = useMemo(() => {
        const inicio = (paginaSegura - 1) * itemsPorPagina;
        return notificacionesFiltradas.slice(inicio, inicio + itemsPorPagina);
    }, [notificacionesFiltradas, paginaSegura, itemsPorPagina]);

    // Genera el rango de números de página visibles (ej. [1, 2, 3, 4, 5])
    const paginasVisibles = useMemo(() => {
        const maxBotones = 5;
        let inicio = Math.max(1, paginaSegura - Math.floor(maxBotones / 2));
        const fin = Math.min(totalPaginas, inicio + maxBotones - 1);
        inicio = Math.max(1, fin - maxBotones + 1);

        const paginas: number[] = [];
        for (let i = inicio; i <= fin; i++) {
            paginas.push(i);
        }
        return paginas;
    }, [paginaSegura, totalPaginas]);

    return (
        <AppLayout title="Notificaciones push">
            <Head title="Notificaciones push · Panel de RRHH" />

            {/* ENCABEZADO DE PÁGINA */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="min-w-0">
                    <h1 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0">
                        Notificaciones push
                    </h1>
                    <p className="text-[13.5px] sm:text-[14px] text-[#6B7280] dark:text-[#9AA39D] m-0 mt-0.5">
                        Emití avisos segmentados a la app móvil, programá recordatorios y auditá envíos automáticos.
                    </p>
                </div>

                {flash?.success && (
                    <div className="w-full sm:w-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-[#EDF4F1] dark:bg-[#223029] border border-[#2F6F5E]/30 text-[#2F6F5E] dark:text-[#6FBFA5] text-[13px] font-medium">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
            </div>

            {/* =====================================================================
                BLOQUE SUPERIOR (RESPONSIVO: 1 COL EN MÓVIL/TABLET, 2 COLS EN DESKTOP)
            ===================================================================== */}
            {puedeCrear && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 mb-6 items-stretch">
                    {/* COLUMNA IZQUIERDA (6 cols): ESTRUCTURA DE NOTIFICACIÓN */}
                    <section className="lg:col-span-6 min-w-0 bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-4 sm:p-5 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                                <h2 className="text-[15.5px] sm:text-[16px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                    Estructura de notificación
                                </h2>

                                {/* Plantillas rápidas */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {PLANTILLAS_RAPIDAS.map((tpl) => (
                                        <button
                                            key={tpl.etiqueta}
                                            type="button"
                                            onClick={() =>
                                                setData((prev) => ({
                                                    ...prev,
                                                    titulo: tpl.titulo,
                                                    mensaje: tpl.mensaje,
                                                    es_critica: puedeCritica ? tpl.es_critica : false,
                                                }))
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] text-[11.5px] font-medium text-[#6B7280] dark:text-[#9AA39D] hover:border-[#2F6F5E] hover:text-[#2F6F5E] transition cursor-pointer"
                                        >
                                            <Sparkles className="h-3 w-3 shrink-0" />
                                            <span>{tpl.etiqueta}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Campo Título */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[13.5px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                        Título
                                    </label>
                                    <span
                                        className={`text-[12px] ${
                                            data.titulo.length > 60 ? 'text-[#B5651D]' : 'text-[#6B7280]'
                                        }`}
                                    >
                                        {data.titulo.length}/80
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    maxLength={80}
                                    value={data.titulo}
                                    onChange={(e) => setData('titulo', e.target.value)}
                                    placeholder="Ej: Capacitación de Seguridad Eléctrica habilitada"
                                    className="w-full px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714] text-[14px] text-[#1F2328] dark:text-[#ECEFEC] placeholder-[#6B7280] focus:outline-none focus:border-[#2F6F5E] focus:bg-white dark:focus:bg-[#1B1F1C] transition"
                                />
                                {errors.titulo && (
                                    <p className="text-[12px] text-[#B3372B] mt-1 m-0">{errors.titulo}</p>
                                )}
                            </div>

                            {/* Campo Descripción */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[13.5px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                        Descripción
                                    </label>
                                    <span
                                        className={`text-[12px] ${
                                            data.mensaje.length > 180 ? 'text-[#B5651D]' : 'text-[#6B7280]'
                                        }`}
                                    >
                                        {data.mensaje.length}/500
                                    </span>
                                </div>
                                <textarea
                                    rows={6}
                                    maxLength={500}
                                    value={data.mensaje}
                                    onChange={(e) => setData('mensaje', e.target.value)}
                                    placeholder="Escribí un mensaje breve y directo para lectura rápida en el celular del operario..."
                                    className="w-full p-3.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714] text-[14px] leading-relaxed text-[#1F2328] dark:text-[#ECEFEC] placeholder-[#6B7280] focus:outline-none focus:border-[#2F6F5E] focus:bg-white dark:focus:bg-[#1B1F1C] transition resize-none"
                                />
                                {errors.mensaje && (
                                    <p className="text-[12px] text-[#B3372B] mt-1 m-0">{errors.mensaje}</p>
                                )}
                            </div>
                        </div>

                        {/* Interruptor de Criticidad (Solo Push vs Push + Email de respaldo) */}
                        <div className="mt-4 pt-4 border-t border-[#E9E9E7] dark:border-[#2A302B]">
                            <label
                                className={`flex items-start justify-between gap-3 p-3 rounded-[8px] border transition ${
                                    data.es_critica
                                        ? 'border-[#B5651D]/50 bg-[#B5651D]/5'
                                        : 'border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/50 dark:bg-[#141714]'
                                } ${puedeCritica ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                            >
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#1F2328] dark:text-[#ECEFEC]">
                                        <Mail className="h-4 w-4 text-[#B5651D] shrink-0" />
                                        <span>Alerta crítica (Push + Correo de respaldo)</span>
                                    </div>
                                    <p className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] m-0">
                                        {puedeCritica
                                            ? 'Usar únicamente para emergencias climáticas, avisos legales o vencimientos críticos.'
                                            : 'Tu rol actual solo tiene permiso para notificaciones estándar (solo Push).'}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    disabled={!puedeCritica}
                                    checked={data.es_critica}
                                    onChange={(e) => setData('es_critica', e.target.checked)}
                                    className="mt-1 h-4 w-4 shrink-0 accent-[#2F6F5E] cursor-pointer"
                                />
                            </label>
                            {errors.es_critica && (
                                <p className="text-[12px] text-[#B3372B] mt-1 m-0">{errors.es_critica}</p>
                            )}
                        </div>
                    </section>

                    {/* COLUMNA DERECHA (6 cols): PREVISUALIZADOR + SELECTOR + BOTÓN ENVIAR */}
                    <section className="lg:col-span-6 min-w-0 flex flex-col gap-4">
                        {/* SUB-BLOQUE 1: PREVISUALIZADOR EN VIVO */}
                        <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                <span className="text-[13px] font-semibold text-[#1F2328] dark:text-[#ECEFEC]">
                                    Previsualizador de notificación
                                </span>
                                <div className="inline-flex rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] p-0.5 bg-[#F7F7F6] dark:bg-[#141714]">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewTab('push')}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[12px] font-medium cursor-pointer transition ${
                                            previewTab === 'push'
                                                ? 'bg-white dark:bg-[#1B1F1C] text-[#2F6F5E] dark:text-[#6FBFA5] shadow-2xs'
                                                : 'text-[#6B7280]'
                                        }`}
                                    >
                                        <Smartphone className="h-3.5 w-3.5" />
                                        Push móvil
                                    </button>
                                    {data.es_critica && (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewTab('email')}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[12px] font-medium cursor-pointer transition ${
                                                previewTab === 'email'
                                                    ? 'bg-white dark:bg-[#1B1F1C] text-[#B5651D] shadow-2xs'
                                                    : 'text-[#6B7280]'
                                            }`}
                                        >
                                            <Mail className="h-3.5 w-3.5" />
                                            Correo respaldo
                                        </button>
                                    )}
                                </div>
                            </div>

                            {previewTab === 'push' ? (
                                /* Simulación realista de notificación en pantalla bloqueada */
                                <div className="rounded-[12px] bg-[#1F2328] dark:bg-[#0F1210] p-3.5 sm:p-4 text-white">
                                    <div className="flex items-start gap-3">
                                        <div className="h-9 w-9 rounded-[9px] bg-[#2F6F5E] flex items-center justify-center shrink-0 font-bold text-[13px]">
                                            AD
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2 text-[11px] text-white/60">
                                                <span className="font-semibold text-white/85 truncate">
                                                    Anta del Dorado
                                                </span>
                                                <span className="shrink-0">ahora</span>
                                            </div>
                                            <p className="text-[14px] font-semibold text-white m-0 mt-0.5 truncate">
                                                {data.titulo.trim() || 'Título de la notificación'}
                                            </p>
                                            <p className="text-[13px] text-white/80 m-0 mt-0.5 line-clamp-2 leading-snug break-words">
                                                {data.mensaje.trim() ||
                                                    'Aquí verás en tiempo real cómo aparecerá el mensaje en el teléfono del colaborador.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Previsualización de Correo de Respaldo */
                                <div className="rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] p-3.5 text-[13px]">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9E9E7] dark:border-[#2A302B] pb-2 mb-2 text-[12px] text-[#6B7280]">
                                        <span className="break-all">
                                            <b>Asunto:</b> [Anta del Dorado] {data.titulo || 'Alerta corporativa'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-[#B5651D]/15 text-[#B5651D] font-semibold text-[11px] shrink-0">
                                            Respaldo legal
                                        </span>
                                    </div>
                                    <p className="m-0 text-[#1F2328] dark:text-[#ECEFEC] whitespace-pre-wrap line-clamp-3 break-words">
                                        {data.mensaje || 'Cuerpo del correo corporativo...'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* SUB-BLOQUE 2: SELECTOR DE DESTINO + SELECTOR DE DÍA/HORA */}
                        <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-4 space-y-3.5 flex-1">
                            {/* Selector de a dónde enviar */}
                            <div>
                                <label className="block text-[13px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] mb-1.5">
                                    Destinatarios (Segmento)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <select
                                        value={data.tipo_segmento}
                                        onChange={(e) => setData('tipo_segmento', e.target.value as any)}
                                        className="w-full min-w-0 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714] text-[13.5px] text-[#1F2328] dark:text-[#ECEFEC] focus:outline-none focus:border-[#2F6F5E]"
                                    >
                                        <option value="todos">Todos los activos</option>
                                        <option value="nodo">Por Nodo / Establecimiento</option>
                                        <option value="rol">Por Rol</option>
                                        <option value="cuadrilla">Por Cuadrilla</option>
                                        <option value="estado">Por Estado (Bloqueados / Atrasados)</option>
                                        <option value="especificos">Colaboradores específicos</option>
                                    </select>

                                    {/* Segundo control condicional según el tipo seleccionado */}
                                    {data.tipo_segmento === 'nodo' && (
                                        <select
                                            value={data.nodo}
                                            onChange={(e) => setData('nodo', e.target.value)}
                                            className="w-full min-w-0 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] text-[13.5px]"
                                        >
                                            {catalogos.nodos.map((n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {data.tipo_segmento === 'rol' && (
                                        <select
                                            value={data.rol}
                                            onChange={(e) => setData('rol', e.target.value)}
                                            className="w-full min-w-0 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] text-[13.5px]"
                                        >
                                            {catalogos.roles.map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {data.tipo_segmento === 'cuadrilla' && (
                                        <select
                                            value={data.cuadrilla_id}
                                            onChange={(e) => setData('cuadrilla_id', e.target.value)}
                                            className="w-full min-w-0 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] text-[13.5px]"
                                        >
                                            {catalogos.cuadrillas.map((c) => (
                                                <option key={c.id_cuadrilla} value={c.id_cuadrilla}>
                                                    {c.nombre_cuadrilla} {c.labor_asociada ? `(${c.labor_asociada})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {data.tipo_segmento === 'estado' && (
                                        <select
                                            value={data.estado_curso}
                                            onChange={(e) => setData('estado_curso', e.target.value as any)}
                                            className="w-full min-w-0 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] text-[13.5px]"
                                        >
                                            <option value="bloqueados">Bloqueados (3 intentos fallidos)</option>
                                            <option value="atrasados">Atrasados (+3 días sin avance)</option>
                                        </select>
                                    )}
                                </div>

                                {/* Selector múltiple si eligió Colaboradores específicos */}
                                {data.tipo_segmento === 'especificos' && (
                                    <div className="mt-2.5 border border-[#E9E9E7] dark:border-[#2A302B] rounded-[8px] p-2.5 bg-[#F7F7F6]/40 dark:bg-[#141714] space-y-2">
                                        <div className="relative">
                                            <Search className="h-3.5 w-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="search"
                                                value={busquedaColab}
                                                onChange={(e) => setBusquedaColab(e.target.value)}
                                                placeholder="Filtrar colaborador por nombre, legajo o DNI..."
                                                className="w-full pl-8 pr-3 py-1.5 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[12.5px]"
                                            />
                                        </div>
                                        <div className="max-h-36 overflow-y-auto divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                                            {colaboradoresFiltrados.map((col) => {
                                                const checked = data.usuarios_ids.includes(col.id);
                                                return (
                                                    <label
                                                        key={col.id}
                                                        className="flex items-center justify-between gap-2 py-1.5 px-1 text-[12.5px] cursor-pointer hover:bg-white dark:hover:bg-[#1B1F1C]"
                                                    >
                                                        <span className="flex items-center gap-2 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleUsuarioEspecifico(col.id)}
                                                                className="accent-[#2F6F5E] shrink-0"
                                                            />
                                                            <span className="font-medium truncate">
                                                                {col.nombre_completo}
                                                            </span>
                                                            <span className="text-[#6B7280] shrink-0">#{col.legajo}</span>
                                                        </span>
                                                        <span
                                                            className={`text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                                                                col.estado_operativo === 'Activo'
                                                                    ? 'bg-[#EDF4F1] text-[#2F6F5E]'
                                                                    : 'bg-[#B5651D]/15 text-[#B5651D]'
                                                            }`}
                                                        >
                                                            {col.estado_operativo}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Contador Dinámico de Alcance */}
                                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-[8px] bg-[#EDF4F1] dark:bg-[#223029] text-[12.5px] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <Users className="h-4 w-4 shrink-0" />
                                        {alcance.cargando ? (
                                            'Calculando alcance...'
                                        ) : (
                                            <>
                                                Llegará a <b>{alcance.activos}</b> colaborador(es) activo(s)
                                            </>
                                        )}
                                    </span>
                                    {alcance.excluidos > 0 && !alcance.cargando && (
                                        <span className="text-[11.5px] text-[#B5651D] dark:text-[#E3A15A] font-medium">
                                            {alcance.excluidos} excluido(s) por licencia/inactividad
                                        </span>
                                    )}
                                </div>
                                {errors.tipo_segmento && (
                                    <p className="text-[12px] text-[#B3372B] mt-1 m-0">{errors.tipo_segmento}</p>
                                )}
                            </div>

                            {/* Selector de cuándo enviar (Ahora vs Programar fecha) */}
                            <div className="pt-2 border-t border-[#E9E9E7] dark:border-[#2A302B]">
                                <label className="block text-[13px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] mb-1.5">
                                    Cuándo enviar
                                </label>
                                <div className="space-y-2.5">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setData('modo_envio', 'ahora')}
                                            className={`w-full py-2 px-3 rounded-[8px] border text-[13px] font-medium transition cursor-pointer ${
                                                data.modo_envio === 'ahora'
                                                    ? 'border-[#2F6F5E] bg-[#2F6F5E] text-white'
                                                    : 'border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280]'
                                            }`}
                                        >
                                            Enviar ahora
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setData('modo_envio', 'programar')}
                                            className={`w-full py-2 px-3 rounded-[8px] border text-[13px] font-medium transition cursor-pointer ${
                                                data.modo_envio === 'programar'
                                                    ? 'border-[#2F6F5E] bg-[#2F6F5E] text-white'
                                                    : 'border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280]'
                                            }`}
                                        >
                                            Programar
                                        </button>
                                    </div>

                                    {data.modo_envio === 'programar' && (
                                        <div className="relative w-full">
                                            <Calendar className="h-4 w-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input
                                                type="datetime-local"
                                                value={data.fecha_programada}
                                                onChange={(e) => setData('fecha_programada', e.target.value)}
                                                className="w-full min-w-0 max-w-full pl-9 pr-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] text-[13px] text-[#1F2328] dark:text-[#ECEFEC]"
                                            />
                                        </div>
                                    )}
                                </div>
                                {errors.fecha_programada && (
                                    <p className="text-[12px] text-[#B3372B] mt-1 m-0">{errors.fecha_programada}</p>
                                )}
                            </div>
                        </div>

                        {/* SUB-BLOQUE 3: BOTÓN ENVIAR / PROGRAMAR */}
                        <button
                            type="button"
                            disabled={!formularioValido || processing}
                            onClick={() => setModalConfirmar(true)}
                            className="w-full py-3 px-5 rounded-[10px] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14.5px] font-semibold flex items-center justify-center gap-2 hover:brightness-95 transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shadow-xs"
                        >
                            {data.modo_envio === 'programar' ? (
                                <>
                                    <Clock className="h-4 w-4 shrink-0" />
                                    <span>Programar notificación</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 shrink-0" />
                                    <span>Enviar notificación</span>
                                </>
                            )}
                        </button>
                    </section>
                </div>
            )}

            {/* =====================================================================
                BLOQUE INFERIOR: HISTORIAL SIN SCROLL HORIZONTAL (5 COLS + MÓVIL)
            ===================================================================== */}
            <section className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-[#E9E9E7] dark:border-[#2A302B] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-[15.5px] sm:text-[16px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                            Historial de notificaciones
                        </h2>
                        <p className="text-[12.5px] text-[#6B7280] dark:text-[#9AA39D] m-0 mt-0.5">
                            Registro auditado de comunicaciones emitidas, envíos programados y alertas automáticas.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full md:w-auto">
                        {[
                            { id: 'TODAS', label: 'Todas' },
                            { id: 'PROGRAMADAS', label: 'Programadas' },
                            { id: 'MANUALES', label: 'Manuales' },
                            { id: 'AUTOMATICAS', label: 'Automáticas' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {setFiltroTabla(tab.id as any)
                                 setPaginaActual(1);   
                                }}
                                className={`w-full sm:w-auto px-3 py-1.5 rounded-[7px] text-[12.5px] font-medium text-center transition cursor-pointer border ${
                                    filtroTabla === tab.id
                                        ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                        : 'border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* VISTA MÓVIL (< 768px): TARJETAS APILADAS SIN SCROLL LATERAL */}
                <div className="md:hidden divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                    {notificacionesFiltradas.length > 0 ? (
                        notificacionesPaginadas.map((item) => {
                            const puedeCancelarEsta =
                                item.estado === 'Programada' &&
                                (puedeCancelarCualquiera || item.id_usuario === adminActual.id);

                            return (
                                <div key={item.id_notificacion} className="p-4 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-[14px] text-[#1F2328] dark:text-[#ECEFEC] break-words">
                                                    {item.titulo}
                                                </span>
                                                {item.tipo_origen === 'Automatica' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-[#E5E7EB] dark:bg-[#2A302B] text-[#4B5563] dark:text-[#9AA39D] shrink-0">
                                                        Auto
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[12.5px] text-[#6B7280] dark:text-[#9AA39D] m-0 mt-1 line-clamp-2">
                                                {item.mensaje}
                                            </p>
                                        </div>

                                        <span
                                            className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                item.estado === 'Enviada'
                                                    ? 'bg-[#2F7D4F]/15 text-[#2F7D4F] dark:text-[#6CC28A]'
                                                    : item.estado === 'Programada'
                                                    ? 'bg-[#B5651D]/15 text-[#B5651D] dark:text-[#E3A15A]'
                                                    : 'bg-[#B3372B]/15 text-[#B3372B] dark:text-[#EE8274]'
                                            }`}
                                        >
                                            {item.estado}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                                        {item.enviado_push && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] font-medium bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                                <Bell className="h-3 w-3" />
                                                Push
                                            </span>
                                        )}
                                        {item.enviado_email && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] font-medium bg-[#B5651D]/15 text-[#B5651D] dark:text-[#E3A15A]">
                                                <Mail className="h-3 w-3" />
                                                Email
                                            </span>
                                        )}
                                        <span className="text-[#6B7280] dark:text-[#9AA39D]">
                                            · {item.segmento_destino} ({item.total_destinatarios})
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E9E9E7]/60 dark:border-[#2A302B]/60 text-[12px] text-[#6B7280]">
                                        <div>
                                            <span>
                                                {item.estado === 'Programada'
                                                    ? formatearFecha(item.fecha_programada)
                                                    : formatearFecha(item.fecha_envio_real || item.created_at)}
                                            </span>
                                            <span className="block text-[11.5px]">
                                                Por: {item.administrador?.nombre_completo || 'Sistema Automático'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {puedeCancelarEsta && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelarProgramada(item)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-[#B3372B]/40 text-[#B3372B] dark:text-[#EE8274] text-[11.5px] font-semibold"
                                                >
                                                    <Ban className="h-3 w-3" />
                                                    Cancelar
                                                </button>
                                            )}
                                            {puedeCrear && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDuplicar(item)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280] text-[11.5px] font-medium"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                    Duplicar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-10 px-4 text-center text-[13.5px] text-[#6B7280] dark:text-[#9AA39D]">
                            No hay notificaciones registradas en esta vista.
                        </div>
                    )}
                </div>

                {/* VISTA ESCRITORIO / TABLET (>= 768px): 5 COLUMNAS CONSOLIDADAS AL 100% */}
                <table className="hidden md:table w-full table-fixed text-left border-collapse text-[13px]">
                    <thead>
                        <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/70 dark:bg-[#141714] text-[11.5px] uppercase tracking-wider text-[#6B7280] dark:text-[#9AA39D]">
                            <th className="w-[33%] py-3 px-4 font-semibold">Notificación y Canales</th>
                            <th className="w-[22%] py-3 px-3 font-semibold">Destino y Alcance</th>
                            <th className="w-[12%] py-3 px-2 font-semibold">Estado</th>
                            <th className="w-[20%] py-3 px-3 font-semibold">Fecha y Emisor</th>
                            <th className="w-[13%] py-3 px-4 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                        {notificacionesFiltradas.length > 0 ? (
                            notificacionesPaginadas.map((item) => {
                                const puedeCancelarEsta =
                                    item.estado === 'Programada' &&
                                    (puedeCancelarCualquiera || item.id_usuario === adminActual.id);

                                return (
                                    <tr
                                        key={item.id_notificacion}
                                        className="hover:bg-[#F7F7F6]/60 dark:hover:bg-[#141714]/60 transition"
                                    >
                                        {/* Columna 1: Título + Mensaje + Badges de Canal */}
                                        <td className="py-3 px-4 align-middle">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="font-semibold text-[#1F2328] dark:text-[#ECEFEC] truncate"
                                                    title={item.titulo}
                                                >
                                                    {item.titulo}
                                                </span>
                                                {item.tipo_origen === 'Automatica' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#E5E7EB] dark:bg-[#2A302B] text-[#4B5563] dark:text-[#9AA39D] shrink-0">
                                                        Auto
                                                    </span>
                                                )}
                                            </div>
                                            <p
                                                className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] m-0 mt-0.5 truncate"
                                                title={item.mensaje}
                                            >
                                                {item.mensaje}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                {item.enviado_push && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10.5px] font-medium bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                                        <Bell className="h-2.5 w-2.5 shrink-0" />
                                                        Push
                                                    </span>
                                                )}
                                                {item.enviado_email && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10.5px] font-medium bg-[#B5651D]/15 text-[#B5651D] dark:text-[#E3A15A]">
                                                        <Mail className="h-2.5 w-2.5 shrink-0" />
                                                        Email
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Columna 2: Segmento + Conteo */}
                                        <td className="py-3 px-3 align-middle">
                                            <div
                                                className="font-medium text-[#1F2328] dark:text-[#ECEFEC] truncate"
                                                title={item.segmento_destino}
                                            >
                                                {item.segmento_destino}
                                            </div>
                                            <div className="text-[11.5px] text-[#6B7280] mt-0.5 truncate">
                                                {item.total_destinatarios} dest.
                                                {item.estado === 'Enviada' && item.leidos_count !== undefined
                                                    ? ` · ${item.leidos_count} leído(s)`
                                                    : ''}
                                            </div>
                                        </td>

                                        {/* Columna 3: Estado */}
                                        <td className="py-3 px-2 align-middle">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                    item.estado === 'Enviada'
                                                        ? 'bg-[#2F7D4F]/15 text-[#2F7D4F] dark:text-[#6CC28A]'
                                                        : item.estado === 'Programada'
                                                        ? 'bg-[#B5651D]/15 text-[#B5651D] dark:text-[#E3A15A]'
                                                        : 'bg-[#B3372B]/15 text-[#B3372B] dark:text-[#EE8274]'
                                                }`}
                                            >
                                                {item.estado}
                                            </span>
                                        </td>

                                        {/* Columna 4: Fecha + Emisor / Cancelador */}
                                        <td className="py-3 px-3 align-middle text-[12px]">
                                            <div className="text-[#6B7280] dark:text-[#9AA39D]">
                                                {item.estado === 'Programada'
                                                    ? formatearFecha(item.fecha_programada)
                                                    : formatearFecha(item.fecha_envio_real || item.created_at)}
                                            </div>
                                            <div
                                                className="text-[#1F2328] dark:text-[#ECEFEC] font-medium truncate mt-0.5"
                                                title={item.administrador?.nombre_completo || 'Sistema Automático'}
                                            >
                                                {item.administrador?.nombre_completo || 'Sistema Automático'}
                                            </div>
                                            {item.estado === 'Cancelada' && item.cancelada_por && (
                                                <div
                                                    className="text-[11px] text-[#B3372B] truncate"
                                                    title={`Canceló: ${item.cancelada_por.nombre_completo}`}
                                                >
                                                    Canceló: {item.cancelada_por.nombre_completo}
                                                </div>
                                            )}
                                        </td>

                                        {/* Columna 5: Acciones */}
                                        <td className="py-3 px-4 text-right align-middle">
                                            <div className="inline-flex flex-col items-end gap-1">
                                                {puedeCancelarEsta && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelarProgramada(item)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-[#B3372B]/40 text-[#B3372B] dark:text-[#EE8274] text-[11px] font-semibold hover:bg-[#B3372B]/10 transition cursor-pointer"
                                                    >
                                                        <Ban className="h-3 w-3 shrink-0" />
                                                        Cancelar
                                                    </button>
                                                )}
                                                {puedeCrear && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDuplicar(item)}
                                                        title="Reutilizar texto en el editor"
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] text-[11px] font-medium transition cursor-pointer"
                                                    >
                                                        <Copy className="h-3 w-3 shrink-0" />
                                                        Duplicar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-10 px-4 text-center text-[13.5px] text-[#6B7280] dark:text-[#9AA39D]"
                                >
                                    No hay notificaciones registradas en esta vista.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {/* BARRA DE PAGINACIÓN Y SELECTOR DE CANTIDAD */}
                {totalItems > 0 && (
                    <div className="px-4 sm:px-5 py-3.5 border-t border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/50 dark:bg-[#141714]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px]">
                        {/* Izquierda: Rango mostrado + Selector de filas por página */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-[#6B7280] dark:text-[#9AA39D]">
                            <span>
                                Mostrando{' '}
                                <b className="text-[#1F2328] dark:text-[#ECEFEC]">
                                    {(paginaSegura - 1) * itemsPorPagina + 1}
                                </b>
                                –
                                <b className="text-[#1F2328] dark:text-[#ECEFEC]">
                                    {Math.min(paginaSegura * itemsPorPagina, totalItems)}
                                </b>{' '}
                                de <b className="text-[#1F2328] dark:text-[#ECEFEC]">{totalItems}</b>
                            </span>

                            <span className="hidden sm:inline text-[#E9E9E7] dark:text-[#2A302B]">|</span>

                            <label className="inline-flex items-center gap-1.5">
                                <span>Mostrar</span>
                                <select
                                    value={itemsPorPagina}
                                    onChange={(e) => {
                                        setItemsPorPagina(Number(e.target.value));
                                        setPaginaActual(1);
                                    }}
                                    className="px-2.3 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] font-medium focus:outline-none focus:border-[#2F6F5E] cursor-pointer"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                                <span>por página</span>
                            </label>
                        </div>

                        {/* Derecha: Botones de navegación entre páginas */}
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={paginaSegura <= 1}
                                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] font-medium hover:bg-[#F7F7F6] dark:hover:bg-[#223029] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span className="hidden xs:inline">Anterior</span>
                            </button>

                            {paginasVisibles.map((numPagina) => (
                                <button
                                    key={numPagina}
                                    type="button"
                                    onClick={() => setPaginaActual(numPagina)}
                                    className={`min-w-[32px] h-[32px] px-2 rounded-[7px] text-[12.5px] font-semibold transition cursor-pointer border ${
                                        numPagina === paginaSegura
                                            ? 'border-[#2F6F5E] bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                            : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                                    }`}
                                >
                                    {numPagina}
                                </button>
                            ))}

                            <button
                                type="button"
                                disabled={paginaSegura >= totalPaginas}
                                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] font-medium hover:bg-[#F7F7F6] dark:hover:bg-[#223029] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span className="hidden xs:inline">Siguiente</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* MODAL DE DOBLE VALIDACIÓN (RESPONSIVO) */}
            {modalConfirmar && (
                <div
                    className="fixed inset-0 z-50 bg-[#141916]/45 grid place-items-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setModalConfirmar(false)}
                >
                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl">
                        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                            <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0 flex items-center gap-2">
                                {data.es_critica ? (
                                    <AlertTriangle className="h-5 w-5 text-[#B5651D] shrink-0" />
                                ) : (
                                    <Bell className="h-5 w-5 text-[#2F6F5E] shrink-0" />
                                )}
                                <span>
                                    {data.modo_envio === 'programar'
                                        ? 'Confirmar programación'
                                        : 'Confirmar envío masivo'}
                                </span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalConfirmar(false)}
                                className="text-[#6B7280] hover:text-[#1F2328] cursor-pointer shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-[13.5px] text-[#6B7280] dark:text-[#9AA39D]">
                            <p className="m-0">
                                Estás por{' '}
                                <b className="text-[#1F2328] dark:text-[#ECEFEC]">
                                    {data.modo_envio === 'programar'
                                        ? `programar para el ${formatearFecha(data.fecha_programada)}`
                                        : 'enviar de inmediato'}
                                </b>{' '}
                                la siguiente comunicación:
                            </p>

                            <div className="p-3 rounded-[8px] bg-[#F7F7F6] dark:bg-[#141714] border border-[#E9E9E7] dark:border-[#2A302B] space-y-1">
                                <div className="font-semibold text-[#1F2328] dark:text-[#ECEFEC] break-words">
                                    {data.titulo}
                                </div>
                                <div className="text-[12.5px] line-clamp-3 break-words">{data.mensaje}</div>
                            </div>

                            <ul className="m-0 pl-4 space-y-1 text-[13px]">
                                <li>
                                    <b>Segmento:</b> {alcance.etiqueta} ({alcance.activos} activos hoy)
                                </li>
                                <li>
                                    <b>Canales:</b>{' '}
                                    {data.es_critica
                                        ? 'Notificación Push + Correo electrónico de respaldo'
                                        : 'Solo Notificación Push'}
                                </li>
                            </ul>

                            {data.modo_envio === 'programar' && (
                                <p className="m-0 text-[12px] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                    Podrás cancelar este envío en cualquier momento desde la tabla inferior antes de la
                                    hora programada.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 mt-6">
                            <button
                                type="button"
                                onClick={() => setModalConfirmar(false)}
                                className="w-full sm:w-auto px-4 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] text-[13px] font-medium cursor-pointer text-center"
                            >
                                Revisar
                            </button>
                            <button
                                type="button"
                                disabled={processing}
                                onClick={handleConfirmarDisparo}
                                className="w-full sm:w-auto px-4 py-2 rounded-[8px] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[13px] font-semibold hover:brightness-95 cursor-pointer disabled:opacity-50 text-center"
                            >
                                {processing
                                    ? 'Procesando...'
                                    : data.modo_envio === 'programar'
                                    ? 'Confirmar y programar'
                                    : 'Confirmar y enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}