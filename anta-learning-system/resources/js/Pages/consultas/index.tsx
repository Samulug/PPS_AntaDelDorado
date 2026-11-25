import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime';

interface ColaboradorInfo {
    id: number;
    nombre_completo: string;
    dni: number | string;
    legajo: number | string;
    email: string;
    rol: string;
    zona_geografica_establecimient: string;
    centro_costo?: string;
    estado_operativo?: string;
    foto?: string | null;
}

interface AdminInfo {
    id: number;
    nombre_completo: string;
    rol: string;
    email?: string;
    disponible_soporte?: boolean;
    zona_geografica_establecimient?: string;
}

interface MensajeItem {
    id_mensaje: number;
    id_ticket: number;
    id_emisor_usuario: number;
    cuerpo_mensaje: string;
    es_nota_interna: boolean;
    created_at: string;
    emisor?: {
        id: number;
        nombre_completo: string;
        rol: string;
        foto?: string | null;
    };
}

interface TicketItem {
    id_ticket: number;
    id_usuario: number;
    id_curso?: number | null;
    id_admin_asignado?: number | null;
    categoria_consulta: string;
    asunto_resumen: string;
    fecha_devolucion_cola?: string | null;
    alerta_demora_enviada?: boolean;
    estado_ticket: 'Abierto' | 'En Curso' | 'Resuelto' | 'Cerrado' | string;
    calificacion_respuesta?: number | null;
    created_at: string;
    updated_at: string;
    colaborador?: ColaboradorInfo;
    admin_asignado?: AdminInfo | null;
    curso?: {
        id_curso: number;
        nombre: string;
    } | null;
    mensajes: MensajeItem[];
}

interface ConsultasProps {
    ticketsIniciales: TicketItem[];
    administradores: AdminInfo[];
    adminActual: {
        id: number;
        nombre_completo: string;
        rol: string;
        disponible_soporte: boolean;
    };
}

export default function ConsultasIndex({
    ticketsIniciales = [],
    administradores = [],
    adminActual,
}: ConsultasProps) {
    const { flash } = usePage<any>().props;
    const { can } = useAuth();

    const esSuperAdmin = adminActual.rol === 'SuperAdmin';
    const puedeReasignarAjenos = esSuperAdmin || can('reasignar_tickets_ajenos');
    const puedeDerivarPropios = esSuperAdmin || can('derivar_tickets') || can('responder_tickets');

    const [tickets, setTickets] = useState<TicketItem[]>(ticketsIniciales);
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(
        ticketsIniciales[0]?.id_ticket ?? null
    );

    // Controla la vista activa en pantallas chicas (< lg): false = lista, true = chat
    const [mostrarChatMovil, setMostrarChatMovil] = useState<boolean>(false);

    // Filtros: 3 estados ("TODOS" | "ACTIVOS" | "CERRADOS") + Select de área + Buscador + No asignados
    const [bandejaTab, setBandejaTab] = useState<'TODOS' | 'ACTIVOS' | 'CERRADOS'>('ACTIVOS');
    const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
    const [busqueda, setBusqueda] = useState<string>('');
    const [soloSinAsignar, setSoloSinAsignar] = useState<boolean>(false);

    // Redactor de mensajes
    const [cuerpoMensaje, setCuerpoMensaje] = useState<string>('');
    const [esNotaInterna, setEsNotaInterna] = useState<boolean>(false);
    const [enviando, setEnviando] = useState<boolean>(false);

    // Ventana de 30 segundos para Deshacer y Editar
    const [undoState, setUndoState] = useState<{
        visible: boolean;
        id_mensaje: number | null;
        id_ticket: number | null;
        segundosRestantes: number;
    }>({
        visible: false,
        id_mensaje: null,
        id_ticket: null,
        segundosRestantes: 30,
    });

    // Modal de Derivación
    const [modalDerivarAbierto, setModalDerivarAbierto] = useState<boolean>(false);
    const [adminDestinoId, setAdminDestinoId] = useState<string>('');
    const [motivoDerivacion, setMotivoDerivacion] = useState<string>('');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputMensajeRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTickets(ticketsIniciales);
    }, [ticketsIniciales]);

    const activeTicket = useMemo(() => {
        return tickets.find((t) => t.id_ticket === selectedTicketId) || null;
    }, [tickets, selectedTicketId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeTicket?.id_ticket, activeTicket?.mensajes.length, mostrarChatMovil]);

    // Cuenta regresiva de 30s para cancelar el envío
    useEffect(() => {
        if (!undoState.visible) return;

        if (undoState.segundosRestantes <= 0) {
            setUndoState({ visible: false, id_mensaje: null, id_ticket: null, segundosRestantes: 30 });
            return;
        }

        const interval = setInterval(() => {
            setUndoState((prev) => ({
                ...prev,
                segundosRestantes: prev.segundosRestantes - 1,
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, [undoState.visible, undoState.segundosRestantes]);

    // Opciones del Select de Áreas
    const categoriasDisponibles = useMemo(() => {
        const cats = new Set<string>(['Higiene y Seguridad', 'Recursos Humanos', 'Sistema / Cursos']);
        tickets.forEach((t) => {
            if (t.categoria_consulta) cats.add(t.categoria_consulta);
        });
        return Array.from(cats);
    }, [tickets]);

    // Contadores para los botones de estado
    const contadoresBandeja = useMemo(() => {
        const cerrados = tickets.filter(
            (t) => t.estado_ticket === 'Resuelto' || t.estado_ticket === 'Cerrado'
        ).length;

        const sinAsignar = tickets.filter((t) => t.id_admin_asignado === null).length;

        return {
            todos: tickets.length,
            activos: tickets.length - cerrados,
            cerrados,
            sinAsignar,
        };
    }, [tickets]);

    // Tickets filtrados en la columna izquierda
    const ticketsFiltrados = useMemo(() => {
        return tickets.filter((t) => {
            const estaCerrado = t.estado_ticket === 'Resuelto' || t.estado_ticket === 'Cerrado';

            if (bandejaTab === 'ACTIVOS' && estaCerrado) return false;
            if (bandejaTab === 'CERRADOS' && !estaCerrado) return false;

            if (categoriaFiltro !== 'TODAS' && t.categoria_consulta !== categoriaFiltro) {
                return false;
            }

            if (soloSinAsignar && t.id_admin_asignado !== null) {
                return false;
            }

            if (busqueda.trim() !== '') {
                const q = busqueda.toLowerCase();
                const nombreColab = t.colaborador?.nombre_completo?.toLowerCase() || '';
                const nodoColab = t.colaborador?.zona_geografica_establecimient?.toLowerCase() || '';
                const cursoNombre = t.curso?.nombre?.toLowerCase() || '';
                const asunto = t.asunto_resumen?.toLowerCase() || '';
                return (
                    nombreColab.includes(q) ||
                    nodoColab.includes(q) ||
                    cursoNombre.includes(q) ||
                    asunto.includes(q)
                );
            }

            return true;
        });
    }, [tickets, bandejaTab, categoriaFiltro, busqueda, soloSinAsignar]);

    // Verificar si el ticket pertenece a otro administrador
    const atendidoPorOtroCompanero = useMemo(() => {
        if (!activeTicket) return false;
        return (
            activeTicket.id_admin_asignado !== null &&
            activeTicket.id_admin_asignado !== adminActual.id
        );
    }, [activeTicket, adminActual.id]);

    const puedeMostrarBotonDerivar = useMemo(() => {
        if (!activeTicket) return false;
        if (atendidoPorOtroCompanero) return puedeReasignarAjenos;
        return puedeDerivarPropios;
    }, [activeTicket, atendidoPorOtroCompanero, puedeReasignarAjenos, puedeDerivarPropios]);

    const handleSeleccionarTicket = (idTicket: number) => {
        setSelectedTicketId(idTicket);
        setMostrarChatMovil(true);
    };

    const handleEnviarMensaje = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTicket || !cuerpoMensaje.trim() || enviando) return;

        const textoAEnviar = cuerpoMensaje;
        const notaFlag = esNotaInterna;
        setCuerpoMensaje('');
        setEnviando(true);

        try {
            const response = await axios.post(`/consultas/${activeTicket.id_ticket}/responder`, {
                cuerpo_mensaje: textoAEnviar,
                es_nota_interna: notaFlag,
            });

            if (response.data.success) {
                const nuevoMensaje: MensajeItem = response.data.mensaje;
                const ticketActualizado = response.data.ticket;

                setTickets((prev) =>
                    prev.map((item) => {
                        if (item.id_ticket !== activeTicket.id_ticket) return item;
                        return {
                            ...item,
                            id_admin_asignado: ticketActualizado.id_admin_asignado,
                            admin_asignado: ticketActualizado.admin_asignado,
                            estado_ticket: ticketActualizado.estado_ticket,
                            mensajes: [...item.mensajes, nuevoMensaje],
                        };
                    })
                );

                setUndoState({
                    visible: true,
                    id_mensaje: nuevoMensaje.id_mensaje,
                    id_ticket: activeTicket.id_ticket,
                    segundosRestantes: 30,
                });
            }
        } catch (err: any) {
            setCuerpoMensaje(textoAEnviar);
            alert(err?.response?.data?.error || 'Error al enviar el mensaje.');
        } finally {
            setEnviando(false);
        }
    };

    const handleDeshacerEnvio = async () => {
        if (!undoState.id_mensaje || !undoState.id_ticket) return;

        try {
            const res = await axios.delete(`/consultas/mensaje/${undoState.id_mensaje}/deshacer`);
            if (res.data.success) {
                const idMsgBorrado = undoState.id_mensaje;
                const idTicketTarget = undoState.id_ticket;

                setTickets((prev) =>
                    prev.map((t) => {
                        if (t.id_ticket !== idTicketTarget) return t;
                        return {
                            ...t,
                            mensajes: t.mensajes.filter((m) => m.id_mensaje !== idMsgBorrado),
                        };
                    })
                );

                setCuerpoMensaje(res.data.texto_recuperado);
                setEsNotaInterna(Boolean(res.data.es_nota_interna));
                setUndoState({ visible: false, id_mensaje: null, id_ticket: null, segundosRestantes: 30 });

                setTimeout(() => {
                    inputMensajeRef.current?.focus();
                }, 50);
            }
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Ya pasaron los 30 segundos permitidos para cancelar el envío.');
            setUndoState({ visible: false, id_mensaje: null, id_ticket: null, segundosRestantes: 30 });
        }
    };

    const handleToggleTurno = () => {
        router.post(
            '/consultas/turno/toggle',
            { soltar_pendientes: true },
            { preserveScroll: true }
        );
    };

    const handleConfirmarDerivacion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTicket || !adminDestinoId) return;

        router.post(
            `/consultas/${activeTicket.id_ticket}/derivar`,
            {
                id_admin_destino: adminDestinoId,
                motivo_nota: motivoDerivacion,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setModalDerivarAbierto(false);
                    setAdminDestinoId('');
                    setMotivoDerivacion('');
                },
            }
        );
    };

    const handleDevolverACola = () => {
        if (!activeTicket) return;
        router.post(`/consultas/${activeTicket.id_ticket}/devolver-cola`, {}, { preserveScroll: true });
    };

    const handleCambiarEstado = (nuevoEstado: string) => {
        if (!activeTicket) return;
        router.patch(
            `/consultas/${activeTicket.id_ticket}/estado`,
            { estado_ticket: nuevoEstado },
            { preserveScroll: true }
        );
    };

    useSupabaseRealtime({
        channelName: 'sync-tickets',
        tables: ['ticket_consulta', 'mensaje_ticket'],
        onlyProps: ['ticketsIniciales'],
    });

    return (
        <AppLayout title="Bandeja de consultas">
            <Head title="Bandeja de consultas · Panel de RRHH" />

            {/* ENCABEZADO SOBRIO RESPONSIVO */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-4 mb-3">
                <div className="min-w-0">
                    <h1 className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0">
                        Bandeja de consultas
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {flash?.success && (
                        <span className="px-3 py-1.5 rounded-[8px] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5] text-[12.5px] sm:text-[13px] font-medium">
                            {flash.success}
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={handleToggleTurno}
                        className={`w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-[8px] border text-[13px] font-medium transition cursor-pointer text-center ${
                            adminActual.disponible_soporte
                                ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] dark:text-[#9AA39D]'
                        }`}
                    >
                        {adminActual.disponible_soporte
                            ? '● Turno activo (Recibiendo consultas)'
                            : '○ Fuera de turno'}
                    </button>
                </div>
            </div>

            {/* CONTENEDOR ÚNICO DIVIDIDO (MAESTRO-DETALLE EN MÓVIL/TABLET, 2 COLUMNAS EN DESKTOP) */}
            <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] overflow-hidden grid grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)] h-[calc(100dvh-195px)] sm:h-[calc(100dvh-165px)] lg:h-[calc(100vh-155px)] min-h-[480px] lg:min-h-[580px] min-w-0">
                {/* =====================================================================
                    COLUMNA IZQUIERDA: FILTROS SOBRIOS Y LISTA DE CHATS
                ===================================================================== */}
                <div
                    className={`${
                        mostrarChatMovil ? 'hidden lg:flex' : 'flex'
                    } lg:border-r border-[#E9E9E7] dark:border-[#2A302B] flex-col min-h-0 min-w-0`}
                >
                    {/* Controles de búsqueda, estado (3 botones), área (select) y sin asignar */}
                    <div className="p-3 sm:p-3.5 border-b border-[#E9E9E7] dark:border-[#2A302B] space-y-2.5 shrink-0">
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, nodo o curso"
                            className="w-full min-w-0 px-3.5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714] text-[13.5px] text-[#1F2328] dark:text-[#ECEFEC] placeholder-[#6B7280] focus:outline-none focus:border-[#2F6F5E] transition"
                        />

                        {/* 3 Botones de Estado bien separados */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { id: 'TODOS', label: 'Todos', count: contadoresBandeja.todos },
                                { id: 'ACTIVOS', label: 'Activos', count: contadoresBandeja.activos },
                                { id: 'CERRADOS', label: 'Cerrados', count: contadoresBandeja.cerrados },
                            ].map((tab) => {
                                const active = bandejaTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setBandejaTab(tab.id as any)}
                                        className={`flex-1 min-w-fit py-1.5 px-2.5 rounded-[8px] border text-[12px] font-medium transition cursor-pointer text-center whitespace-nowrap ${
                                            active
                                                ? 'border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] text-white dark:text-[#0E1A15]'
                                                : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] dark:text-[#9AA39D] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                                        }`}
                                    >
                                        {tab.label} ({tab.count})
                                    </button>
                                );
                            })}
                        </div>

                        {/* Select de Filtrado por Área */}
                        <select
                            value={categoriaFiltro}
                            onChange={(e) => setCategoriaFiltro(e.target.value)}
                            aria-label="Filtrar por área"
                            className="w-full min-w-0 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] text-[13px] text-[#1F2328] dark:text-[#ECEFEC] focus:outline-none focus:border-[#2F6F5E]"
                        >
                            <option value="TODAS">Todas las áreas</option>
                            {categoriasDisponibles.map((cat) => (
                                <option key={cat} value={cat}>
                                    Área: {cat}
                                </option>
                            ))}
                        </select>

                        {/* Botón para filtrar únicamente los tickets no asignados */}
                        <button
                            type="button"
                            onClick={() => setSoloSinAsignar((prev) => !prev)}
                            className={`w-full py-1.5 px-3 rounded-[8px] border text-[12.5px] font-medium transition cursor-pointer flex items-center justify-between ${
                                soloSinAsignar
                                    ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                    : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] dark:text-[#9AA39D] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <span>{soloSinAsignar ? '● Solo no asignados' : '○ Solo no asignados'}</span>
                            <span>{contadoresBandeja.sinAsignar}</span>
                        </button>
                    </div>

                    {/* Lista de Conversaciones */}
                    <div className="flex-1 overflow-y-auto divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                        {ticketsFiltrados.length > 0 ? (
                            ticketsFiltrados.map((ticket) => {
                                const isSelected = ticket.id_ticket === selectedTicketId;
                                const esMio = ticket.id_admin_asignado === adminActual.id;
                                const sinAsignar = ticket.id_admin_asignado === null;
                                const estaResuelto =
                                    ticket.estado_ticket === 'Resuelto' ||
                                    ticket.estado_ticket === 'Cerrado';

                                const textoAsignacion = sinAsignar
                                    ? 'Sin asignar'
                                    : esMio
                                    ? 'Asignado a ti'
                                    : `Atiende: ${ticket.admin_asignado?.nombre_completo?.split(' ')[0]}`;

                                return (
                                    <button
                                        key={ticket.id_ticket}
                                        type="button"
                                        onClick={() => handleSeleccionarTicket(ticket.id_ticket)}
                                        className={`w-full text-left px-3.5 sm:px-4 py-3.5 transition cursor-pointer block ${
                                            isSelected
                                                ? 'bg-[#EDF4F1] dark:bg-[#223029]/80'
                                                : 'bg-transparent hover:bg-[#F7F7F6] dark:hover:bg-[#141714]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <b className="text-[14.5px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] truncate">
                                                {ticket.colaborador?.nombre_completo || 'Colaborador'}
                                            </b>
                                            {estaResuelto && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#2F7D4F]/15 text-[#2F7D4F] dark:text-[#6CC28A] shrink-0">
                                                    Resuelta
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] m-0 mt-0.5 truncate">
                                            {ticket.asunto_resumen}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11.5px]">
                                            <span className="px-2 py-0.5 rounded-[6px] bg-[#F7F7F6] dark:bg-[#141714] border border-[#E9E9E7] dark:border-[#2A302B] text-[#2F6F5E] dark:text-[#6FBFA5] font-medium">
                                                {ticket.categoria_consulta}
                                            </span>

                                            {ticket.colaborador?.zona_geografica_establecimient && (
                                                <span className="px-2 py-0.5 rounded-[6px] bg-[#F7F7F6] dark:bg-[#141714] border border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280] dark:text-[#9AA39D]">
                                                    {ticket.colaborador.zona_geografica_establecimient}
                                                </span>
                                            )}

                                            <span
                                                className={`px-2 py-0.5 rounded-[6px] border font-medium ${
                                                    sinAsignar
                                                        ? 'border-[#B5651D]/30 bg-[#B5651D]/10 text-[#B5651D] dark:text-[#E3A15A]'
                                                        : esMio
                                                        ? 'border-[#2F6F5E]/30 bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                                        : 'border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] text-[#6B7280] dark:text-[#9AA39D]'
                                                }`}
                                            >
                                                {textoAsignacion}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-6 text-center text-[13.5px] text-[#6B7280] dark:text-[#9AA39D]">
                                No hay consultas que coincidan con el filtro seleccionado.
                            </div>
                        )}
                    </div>
                </div>

                {/* =====================================================================
                    PANEL DERECHO: CABECERA LIMPIA + HISTORIAL DE CHAT + INPUT SOBRIO
                ===================================================================== */}
                <div
                    className={`${
                        mostrarChatMovil ? 'flex' : 'hidden lg:flex'
                    } flex-col min-h-0 min-w-0 relative`}
                >
                    {activeTicket ? (
                        <>
                            {/* CABECERA LIMPIA RESPONSIVA */}
                            <header className="px-4 sm:px-5 py-3 border-b border-[#E9E9E7] dark:border-[#2A302B] flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shrink-0">
                                {/* Columna de información: ocupa el espacio principal sin aplastarse */}
                                <div className="flex-1 min-w-0">
                                    {/* Botón Volver visible solo en móvil y tablet (< lg) */}
                                    <button
                                        type="button"
                                        onClick={() => setMostrarChatMovil(false)}
                                        className="lg:hidden inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2F6F5E] dark:text-[#6FBFA5] mb-1.5 cursor-pointer"
                                    >
                                        ← Volver a consultas
                                    </button>

                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0 leading-snug">
                                            {activeTicket.colaborador?.nombre_completo}
                                        </h2>
                                        <span className="text-[12.5px] text-[#6B7280] dark:text-[#9AA39D]">
                                            · {activeTicket.asunto_resumen}
                                        </span>
                                        {activeTicket.calificacion_respuesta && (
                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#B5651D]/15 text-[#B5651D] dark:text-[#E3A15A]">
                                                {activeTicket.calificacion_respuesta}/5 ★
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-[12.5px] text-[#6B7280] dark:text-[#9AA39D] m-0 mt-1 leading-snug">
                                        {activeTicket.colaborador?.zona_geografica_establecimient}
                                        {' · '}
                                        {activeTicket.curso
                                            ? activeTicket.curso.nombre
                                            : activeTicket.categoria_consulta}
                                    </p>
                                </div>

                                {/* Botones de acción: sin shrink-0, compactos y limitados a ~45% en notebook */}
                                <div className="flex flex-wrap items-center md:justify-end gap-1.5 md:max-w-[46%] 2xl:max-w-none">
                                    {activeTicket.colaborador?.id &&
                                        (esSuperAdmin || can('listar_colaboradores')) && (
                                            <Link
                                                href={`/colaboradores/${activeTicket.colaborador.id}`}
                                                className="px-2.5 py-1.5 rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[12px] font-medium text-[#1F2328] dark:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition cursor-pointer whitespace-nowrap"
                                            >
                                                Ver colaborador
                                            </Link>
                                        )}

                                    {puedeMostrarBotonDerivar && (
                                        <button
                                            type="button"
                                            onClick={() => setModalDerivarAbierto(true)}
                                            className="px-2.5 py-1.5 rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[12px] font-medium text-[#1F2328] dark:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition cursor-pointer whitespace-nowrap"
                                        >
                                            Derivar
                                        </button>
                                    )}

                                    {activeTicket.id_admin_asignado === adminActual.id &&
                                        activeTicket.estado_ticket !== 'Resuelto' &&
                                        activeTicket.estado_ticket !== 'Cerrado' && (
                                            <button
                                                type="button"
                                                onClick={handleDevolverACola}
                                                className="px-2.5 py-1.5 rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[12px] font-medium text-[#6B7280] dark:text-[#9AA39D] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition cursor-pointer whitespace-nowrap"
                                            >
                                                Soltar a cola
                                            </button>
                                        )}

                                    {(!atendidoPorOtroCompanero || puedeReasignarAjenos) && (
                                        <>
                                            {activeTicket.estado_ticket !== 'Resuelto' &&
                                            activeTicket.estado_ticket !== 'Cerrado' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCambiarEstado('Resuelto')}
                                                    className="px-3 py-1.5 rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[12px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition cursor-pointer whitespace-nowrap"
                                                >
                                                    Marcar como resuelta
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCambiarEstado('En Curso')}
                                                    className="px-3 py-1.5 rounded-[7px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[12px] font-medium text-[#6B7280] dark:text-[#9AA39D] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] transition cursor-pointer whitespace-nowrap"
                                                >
                                                    Reabrir consulta
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </header>

                            {/* HISTORIAL DE MENSAJES SOBRIO */}
                            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 bg-[#F7F7F6]/40 dark:bg-[#141714]/40">
                                {activeTicket.mensajes.map((msg) => {
                                    const esDelColaborador = msg.id_emisor_usuario === activeTicket.id_usuario;
                                    const horaFormateada = new Date(msg.created_at).toLocaleTimeString(
                                        'es-AR',
                                        { hour: '2-digit', minute: '2-digit' }
                                    );

                                    if (msg.es_nota_interna) {
                                        return (
                                            <div key={msg.id_mensaje} className="flex justify-center">
                                                <div className="max-w-[92%] sm:max-w-[75%] rounded-[10px] border border-[#B5651D]/30 bg-[#B5651D]/10 px-3.5 sm:px-4 py-2.5 text-[12.5px] sm:text-[13px] text-[#B5651D] dark:text-[#E3A15A] break-words">
                                                    <span className="block text-[11px] sm:text-[11.5px] font-semibold mb-0.5">
                                                        Nota interna · {msg.emisor?.nombre_completo} · {horaFormateada}
                                                    </span>
                                                    <p className="m-0 leading-relaxed whitespace-pre-wrap">
                                                        {msg.cuerpo_mensaje}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (esDelColaborador) {
                                        return (
                                            <div key={msg.id_mensaje} className="flex justify-start">
                                                <div className="max-w-[88%] sm:max-w-[75%] lg:max-w-[68%] rounded-[12px] bg-[#F7F7F6] dark:bg-[#222723] border border-[#E9E9E7] dark:border-[#2A302B] px-3.5 sm:px-4 py-2.5 sm:py-3 text-[#1F2328] dark:text-[#ECEFEC] break-words">
                                                    <p className="m-0 text-[14px] sm:text-[14.5px] leading-relaxed whitespace-pre-wrap">
                                                        {msg.cuerpo_mensaje}
                                                    </p>
                                                    <span className="block text-[11px] sm:text-[11.5px] text-[#6B7280] dark:text-[#9AA39D] mt-1.5">
                                                        {horaFormateada}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id_mensaje} className="flex justify-end">
                                            <div className="max-w-[88%] sm:max-w-[75%] lg:max-w-[68%] rounded-[12px] bg-[#EDF4F1] dark:bg-[#223029] border border-[#2F6F5E]/25 px-3.5 sm:px-4 py-2.5 sm:py-3 text-[#1F2328] dark:text-[#ECEFEC] break-words">
                                                <p className="m-0 text-[14px] sm:text-[14.5px] leading-relaxed whitespace-pre-wrap">
                                                    {msg.cuerpo_mensaje}
                                                </p>
                                                <span className="block text-[11px] sm:text-[11.5px] text-[#2F6F5E] dark:text-[#6FBFA5] mt-1.5">
                                                    {horaFormateada} · {msg.emisor?.nombre_completo || 'RRHH'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div ref={chatEndRef} />
                            </div>

                            {/* AVISO DE 30 SEGUNDOS PARA DESHACER Y EDITAR */}
                            {undoState.visible && undoState.id_ticket === activeTicket.id_ticket && (
                                <div className="absolute bottom-32 sm:bottom-20 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-30 bg-[#1F2328] dark:bg-[#ECEFEC] text-white dark:text-[#141714] px-4 py-2.5 rounded-[8px] shadow-md flex items-center justify-between sm:justify-center gap-4 text-[13px]">
                                    <span>Mensaje enviado ({undoState.segundosRestantes}s)</span>
                                    <button
                                        type="button"
                                        onClick={handleDeshacerEnvio}
                                        className="text-[#6FBFA5] dark:text-[#2F6F5E] font-semibold hover:underline cursor-pointer shrink-0"
                                    >
                                        Deshacer y editar
                                    </button>
                                </div>
                            )}

                            {/* BARRA INFERIOR SOBRIA RESPONSIVA */}
                            <div className="p-3 sm:p-4 border-t border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] shrink-0">
                                {atendidoPorOtroCompanero && !esNotaInterna ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-4 py-2.5 rounded-[8px] bg-[#F7F7F6] dark:bg-[#141714] border border-[#E9E9E7] dark:border-[#2A302B] text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                                        <span>
                                            Consulta atendida actualmente por{' '}
                                            <b className="text-[#1F2328] dark:text-[#ECEFEC]">
                                                {activeTicket.admin_asignado?.nombre_completo}
                                            </b>
                                            .
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setEsNotaInterna(true)}
                                                className="flex-1 sm:flex-none px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC] text-[12.5px] font-medium cursor-pointer"
                                            >
                                                Dejar nota interna
                                            </button>
                                            {puedeReasignarAjenos && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAdminDestinoId(String(adminActual.id));
                                                        setModalDerivarAbierto(true);
                                                    }}
                                                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-[8px] border border-[#B3372B]/40 text-[#B3372B] dark:text-[#EE8274] text-[12.5px] font-medium cursor-pointer"
                                                >
                                                    Tomar consulta
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <form
                                        onSubmit={handleEnviarMensaje}
                                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5"
                                    >
                                        <input
                                            ref={inputMensajeRef}
                                            type="text"
                                            value={cuerpoMensaje}
                                            onChange={(e) => setCuerpoMensaje(e.target.value)}
                                            placeholder={
                                                esNotaInterna
                                                    ? 'Escribí una nota interna privada para administración...'
                                                    : 'Escribí tu respuesta'
                                            }
                                            className={`w-full sm:flex-1 min-w-0 px-3.5 sm:px-4 py-2.5 rounded-[8px] text-[14px] border focus:outline-none transition ${
                                                esNotaInterna
                                                    ? 'border-[#B5651D] bg-[#B5651D]/5 text-[#1F2328] dark:text-[#ECEFEC]'
                                                    : 'border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/50 dark:bg-[#141714] focus:border-[#2F6F5E] text-[#1F2328] dark:text-[#ECEFEC]'
                                            }`}
                                        />

                                        <div className="flex items-center gap-2 sm:shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEsNotaInterna(!esNotaInterna)}
                                                className={`flex-1 sm:flex-none px-3 py-2.5 rounded-[8px] border text-[13px] font-medium transition cursor-pointer shrink-0 ${
                                                    esNotaInterna
                                                        ? 'border-[#B5651D] bg-[#B5651D]/15 text-[#B5651D] dark:text-[#E3A15A]'
                                                        : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] dark:text-[#9AA39D] hover:text-[#1F2328]'
                                                }`}
                                            >
                                                Nota interna
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={enviando || !cuerpoMensaje.trim()}
                                                className="flex-1 sm:flex-none px-5 py-2.5 rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14px] font-semibold hover:brightness-95 transition cursor-pointer disabled:opacity-40 shrink-0"
                                            >
                                                Enviar respuesta
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[14px] text-[#6B7280] dark:text-[#9AA39D] gap-3">
                            <p className="m-0">
                                Seleccioná una consulta de la lista izquierda para ver los mensajes.
                            </p>
                            <button
                                type="button"
                                onClick={() => setMostrarChatMovil(false)}
                                className="lg:hidden px-4 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] text-[#2F6F5E] dark:text-[#6FBFA5] font-medium cursor-pointer"
                            >
                                Ver bandeja de consultas
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL SOBRIO DE DERIVACIÓN RESPONSIVO */}
            {modalDerivarAbierto && activeTicket && (
                <div
                    className="fixed inset-0 z-50 bg-[#141916]/40 grid place-items-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setModalDerivarAbierto(false)}
                >
                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                            <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                Derivar Ticket de Consulta #{activeTicket.id_ticket}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalDerivarAbierto(false)}
                                className="text-[#6B7280] hover:text-[#1F2328] text-[20px] leading-none cursor-pointer"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleConfirmarDerivacion} className="space-y-4 sm:space-y-5">
                            <label className="grid gap-1.5 text-[14px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                Administrador destino
                                <select
                                    required
                                    value={adminDestinoId}
                                    onChange={(e) => setAdminDestinoId(e.target.value)}
                                    className="w-full min-w-0 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] text-[#1F2328] dark:text-[#ECEFEC] text-[14px]"
                                >
                                    <option value="">Seleccionar administrador...</option>
                                    {administradores.map((adm) => (
                                        <option key={adm.id} value={adm.id}>
                                            {adm.nombre_completo} ({adm.rol}){' '}
                                            {adm.disponible_soporte ? '· En turno' : '· Fuera de turno'}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="grid gap-1.5 text-[13.5px] font-medium text-[#6B7280] dark:text-[#9AA39D]">
                                Nota interna (opcional)
                                <textarea
                                    rows={3}
                                    value={motivoDerivacion}
                                    onChange={(e) => setMotivoDerivacion(e.target.value)}
                                    placeholder="Motivo de la derivación..."
                                    className="w-full p-3 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#141714] text-[#1F2328] dark:text-[#ECEFEC] text-[13.5px]"
                                />
                            </label>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalDerivarAbierto(false)}
                                    className="w-full sm:w-auto px-4 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] text-[13px] font-medium cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto px-4 py-2 rounded-[8px] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[13px] font-semibold cursor-pointer"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}