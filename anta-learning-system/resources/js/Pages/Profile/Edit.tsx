import React, { useState, useRef, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import {
    User,
    ShieldCheck,
    History,
    MessageSquare,
    Bell,
    Lock,
    Camera,
    Laptop,
    Star,
    BookOpen,
    Users,
    UserPlus,
    CheckCircle2,
    Search,
    Mail,
    Smartphone,
    Building2,
    MapPin,
    Calendar,
    IdCard,
    X
} from 'lucide-react';

interface AuditItem {
    id_audit: number;
    accion: string;
    fecha_evento: string;
    estado_resultante: string;
    id_curso?: number | null;
    id_cuadrilla?: number | null;
    id_usuario_afectado?: number | null;
    curso?: {
        id_curso: number;
        nombre: string;
        version_trimestral?: number;
    } | null;
    cuadrilla?: {
        id_cuadrilla: number;
        nombre_cuadrilla: string;
        labor_asociada: string;
    } | null;
    usuario_afectado?: {
        id: number;
        nombre_completo: string;
        dni: number;
        legajo: number;
        rol: string;
        email: string;
        zona_geografica_establecimient: string;
        estado_operativo: string;
        created_at?: string;
    } | null;
}

interface TicketAuditado {
    id_ticket: number;
    mensaje_consulta: string;
    respuesta_admin: string;
    estado_ticket: string;
    calificacion_resuesta: number | null;
    updated_at: string;
    colaborador?: {
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

interface NotificacionLog {
    id_notificacion: number;
    titulo: string;
    mensaje: string;
    fecha_publicacion: string;
    enviado_push: boolean;
    enviado_email: string;
    segmento_destino: string;
}

interface SesionItem {
    id: string;
    ip_address: string;
    user_agent: string;
    is_current_device: boolean;
    last_active: string;
    fecha_exacta: string;
}

interface PerfilAdminProps {
    mustVerifyEmail: boolean;
    status?: string;
    perfilAdmin: {
        id: number;
        nombre_completo: string;
        email: string;
        dni: number | string;
        legajo: number | string;
        rol: string;
        zona_geografica_establecimient: string;
        centro_costo: string;
        estado_operativo: string;
        fecha_ingreso: string;
        id_microsoft_entra?: string | null;
        foto_url?: string | null;
        permisos: string[];
    };
    historialAuditoria: AuditItem[];
    historialAdministradores: AuditItem[];
    metricasSoporte: {
        total_respondidos: number;
        calificacion_promedio: number | null;
        ultimos_tickets: TicketAuditado[];
    };
    notificacionesEmitidas: NotificacionLog[];
    sesionesActivas: SesionItem[];
}

type TabType = 'identidad' | 'trazabilidad' | 'soporte' | 'notificaciones' | 'seguridad' | 'administradores';

export default function ProfileEdit({
    perfilAdmin,
    historialAuditoria = [],
    historialAdministradores = [],
    metricasSoporte,
    notificacionesEmitidas = [],
    sesionesActivas = [],
}: PerfilAdminProps) {
    const { flash } = usePage<any>().props;
    const [activeTab, setActiveTab] = useState<TabType>('identidad');
    const [auditFilter, setAuditFilter] = useState<'TODOS' | 'CURSOS' | 'CUADRILLAS' | 'PERSONAL'>('TODOS');
    const [auditSearch, setAuditSearch] = useState('');
    const [toastMsg, setToastMsg] = useState<string | null>(flash?.success || null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const triggerToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3200);
    };

    // Subida directa de foto de perfil
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        router.post(
            route('profile.update'),
            { _method: 'patch', foto: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => triggerToast('Foto de perfil actualizada.'),
            }
        );
    };

    // Iniciales del administrador si no tiene foto cargada
    const iniciales = useMemo(() => {
        return (perfilAdmin.nombre_completo || 'AD')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }, [perfilAdmin.nombre_completo]);

    // Filtrado de la tabla de Trazabilidad Extensiva
    const auditoriaFiltrada = useMemo(() => {
        return historialAuditoria.filter((item) => {
            if (auditFilter === 'CURSOS' && !item.id_curso) return false;
            if (auditFilter === 'CUADRILLAS' && !item.id_cuadrilla) return false;
            if (auditFilter === 'PERSONAL' && !item.id_usuario_afectado) return false;

            if (auditSearch.trim() !== '') {
                const q = auditSearch.toLowerCase();
                const targetName =
                    item.curso?.nombre ||
                    item.cuadrilla?.nombre_cuadrilla ||
                    item.usuario_afectado?.nombre_completo ||
                    '';
                return (
                    item.accion.toLowerCase().includes(q) ||
                    targetName.toLowerCase().includes(q) ||
                    item.estado_resultante.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [historialAuditoria, auditFilter, auditSearch]);

    const getBadgeColor = (estado: string) => {
        const est = estado.toLowerCase();
        if (est.includes('activo') || est.includes('activa') || est.includes('respondido')) {
            return 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:bg-[#6CC28A]/15 dark:text-[#6CC28A]';
        }
        if (est.includes('borrador') || est.includes('taller') || est.includes('pendiente')) {
            return 'bg-[#B5651D]/12 text-[#B5651D] dark:bg-[#E3A15A]/15 dark:text-[#E3A15A]';
        }
        return 'bg-[#B3372B]/12 text-[#B3372B] dark:bg-[#EE8274]/15 dark:text-[#EE8274]';
    };

    return (
        <AppLayout title="Mi Perfil Administrativo">
            <Head title="Mi Perfil · Panel de RRHH" />

            <div className="space-y-6">
                {/* =====================================================================
                    CABECERA DE IDENTIDAD CORPORATIVA Y FOTO DE PERFIL
                ===================================================================== */}
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            {/* Avatar con botón de edición de foto */}
                            <div className="relative group shrink-0">
                                {perfilAdmin.foto_url ? (
                                    <img
                                        src={perfilAdmin.foto_url}
                                        alt={perfilAdmin.nombre_completo}
                                        className="h-20 w-20 rounded-full object-cover border-2 border-[#2F6F5E]"
                                    />
                                ) : (
                                    <div className="h-20 w-20 rounded-full bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5] flex items-center justify-center text-[24px] font-bold border-2 border-[#2F6F5E]/30">
                                        {iniciales}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Cambiar foto de perfil"
                                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#2F6F5E] text-white flex items-center justify-center shadow-md hover:brightness-95 transition cursor-pointer"
                                >
                                    <Camera className="h-4 w-4" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-[24px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                        {perfilAdmin.nombre_completo}
                                    </h1>
                                    <span className="px-3 py-0.5 rounded-full text-[12px] font-semibold bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                        {perfilAdmin.rol}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-medium ${getBadgeColor(perfilAdmin.estado_operativo)}`}>
                                        {perfilAdmin.estado_operativo}
                                    </span>
                                </div>
                                <p className="text-[14px] text-[#6B7280] dark:text-[#9AA39D] mt-1 mb-0">
                                    {perfilAdmin.email} · Legajo #{perfilAdmin.legajo} · Nodo {perfilAdmin.zona_geografica_establecimient}
                                </p>
                            </div>
                        </div>

                        {/* Indicador de Estado Microsoft Entra ID (SSO) */}
                        <div className="rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] px-4 py-2.5 text-[13px]">
                            <span className="text-[#6B7280] dark:text-[#9AA39D] block">
                                Identidad Corporativa (Microsoft ID)
                            </span>
                            {perfilAdmin.id_microsoft_entra ? (
                                <b className="text-[#2F7D4F] dark:text-[#6CC28A] flex items-center gap-1.5 mt-0.5">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Sincronizado ({perfilAdmin.id_microsoft_entra})
                                </b>
                            ) : (
                                <b className="text-[#B5651D] dark:text-[#E3A15A] block mt-0.5">
                                    Modo Piloto (Autenticación Local Activa)
                                </b>
                            )}
                        </div>
                    </div>

                    {/* NAVEGACIÓN POR PESTAÑAS (TABS) */}
                    {/* Contenedor con scroll horizontal oculto para móviles */}
                    <div className="flex flex-nowrap overflow-x-auto gap-2 border-t border-[#E9E9E7] dark:border-[#2A302B] mt-6 pt-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <button
                            type="button"
                            onClick={() => setActiveTab('identidad')}
                            className={`inline-flex items-center whitespace-nowrap shrink-0 gap-2 px-4 py-2 rounded-[8px] text-[14px] font-medium transition cursor-pointer ${
                                activeTab === 'identidad'
                                    ? 'bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                    : 'text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Mis Datos
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('trazabilidad')}
                            className={`inline-flex items-center whitespace-nowrap shrink-0 gap-2 px-4 py-2 rounded-[8px] text-[14px] font-medium transition cursor-pointer ${
                                activeTab === 'trazabilidad'
                                    ? 'bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                    : 'text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <History className="h-4 w-4" />
                            Auditoría
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('soporte')}
                            className={`inline-flex items-center whitespace-nowrap shrink-0 gap-2 px-4 py-2 rounded-[8px] text-[14px] font-medium transition cursor-pointer ${
                                activeTab === 'soporte'
                                    ? 'bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                    : 'text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <MessageSquare className="h-4 w-4" />
                            Soporte
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('notificaciones')}
                            className={`inline-flex items-center whitespace-nowrap shrink-0 gap-2 px-4 py-2 rounded-[8px] text-[14px] font-medium transition cursor-pointer ${
                                activeTab === 'notificaciones'
                                    ? 'bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                    : 'text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <Bell className="h-4 w-4" />
                            Notificaciones Emitidas
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('seguridad')}
                            className={`inline-flex items-center whitespace-nowrap shrink-0 gap-2 px-4 py-2 rounded-[8px] text-[14px] font-medium transition cursor-pointer ${
                                activeTab === 'seguridad'
                                    ? 'bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                    : 'text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <Lock className="h-4 w-4" />
                            Accesos
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('administradores')}
                            className={`inline-flex items-center whitespace-nowrap shrink-0 gap-2 px-4 py-2 rounded-[8px] text-[14px] font-medium transition cursor-pointer ${
                                activeTab === 'administradores'
                                    ? 'bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                    : 'text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <UserPlus className="h-4 w-4" />
                            Administradores
                        </button>
                    </div>
                </div>

                {/* =====================================================================
                    PESTAÑA 1: IDENTIDAD CORPORATIVA (SOLO LECTURA)
                ===================================================================== */}
                {activeTab === 'identidad' && (
                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm w-full">
                        <div className="flex items-center justify-between border-b border-[#E9E9E7] dark:border-[#2A302B] pb-3 mb-4">
                            <h2 className="text-[17px] font-bold m-0 flex items-center gap-2">
                                <IdCard className="h-5 w-5 text-[#2F6F5E]" />
                                Ficha Corporativa
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-[14px]">
                            <div>
                                <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[12px]">Nombre Completo</span>
                                <b className="font-semibold text-[15px]">{perfilAdmin.nombre_completo}</b>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[12px]">Correo Corporativo</span>
                                <b className="font-semibold text-[15px]">{perfilAdmin.email}</b>
                            </div>
                            <div>
                                <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[12px]">DNI</span>
                                <b className="font-semibold text-[15px]">{perfilAdmin.dni}</b>
                            </div>
                            <div>
                                <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[12px]">N° de Legajo</span>
                                <b className="font-semibold text-[15px]">#{perfilAdmin.legajo}</b>
                            </div>
                            <div>
                                <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[12px]">Fecha de Alta</span>
                                <b className="font-semibold text-[15px] flex items-center gap-1.5 mt-0.5">
                                    <Calendar className="h-4 w-4 text-[#6B7280]" />
                                    {perfilAdmin.fecha_ingreso}
                                </b>
                            </div>
                            <div>
                                <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[12px]">Rol Asignado</span>
                                <b className="font-semibold text-[15px] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                    {perfilAdmin.rol}
                                </b>
                            </div>
                            <div>
                                <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[12px]">Nodo Productivo</span>
                                <b className="font-semibold text-[15px] flex items-center gap-1.5 mt-0.5">
                                    <MapPin className="h-4 w-4 text-[#2F6F5E]" />
                                    {perfilAdmin.zona_geografica_establecimient}
                                </b>
                            </div>
                            <div>
                                <span className="text-[#6B7280] dark:text-[#9AA39D] block text-[12px]">Centro de Costo</span>
                                <b className="font-semibold text-[15px] flex items-center gap-1.5 mt-0.5">
                                    <Building2 className="h-4 w-4 text-[#2F6F5E]" />
                                    {perfilAdmin.centro_costo}
                                </b>
                            </div>
                        </div>
                    </div>
                )}

                {/* =====================================================================
                    PESTAÑA 2: TRAZABILIDAD Y AUDITORÍA
                ===================================================================== */}
                {activeTab === 'trazabilidad' && (
                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm full-w">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div>
                                <h2 className="text-[18px] font-bold m-0">
                                    Historial de Auditoría y Movimientos
                                </h2>
                                <p className="text-[13.5px] text-[#6B7280] dark:text-[#9AA39D] m-0 mt-0.5">
                                    Registro de los cursos subidos, cuadrillas creadas y cambios de estado de personal ejecutados por tu usuario.
                                </p>
                            </div>

                            {/* Filtros rápidos por tipo de entidad auditada */}
                            <div className="flex flex-wrap items-center gap-2">
                                {(['TODOS', 'CURSOS', 'CUADRILLAS', 'PERSONAL'] as const).map((filtro) => (
                                    <button
                                        key={filtro}
                                        type="button"
                                        onClick={() => setAuditFilter(filtro)}
                                        className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium border transition cursor-pointer ${
                                            auditFilter === filtro
                                                ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                                : 'border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280]'
                                        }`}
                                    >
                                        {filtro === 'TODOS' ? 'Todos' : filtro.charAt(0) + filtro.slice(1).toLowerCase()}
                                    </button>
                                ))}

                                <div className="relative">
                                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                                    <input
                                        type="search"
                                        value={auditSearch}
                                        onChange={(e) => setAuditSearch(e.target.value)}
                                        placeholder="Buscar acción o recurso..."
                                        className="pl-9 pr-3 py-1.5 text-[13.5px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C]"
                                    />
                                    {auditSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setAuditSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2328]"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px]">
                            <table className="w-full border-collapse text-left text-[14px]">
                                <thead>
                                    <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/40">
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Fecha y Hora</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Categoría</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Objetivo / Entidad Afectada</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Acción Ejecutada</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280] text-right">Estado Resultante</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                                    {auditoriaFiltrada.length > 0 ? (
                                        auditoriaFiltrada.map((item) => {
                                            const esCurso = Boolean(item.id_curso);
                                            const esCuadrilla = Boolean(item.id_cuadrilla);
                                            const categoria = esCurso
                                                ? 'Curso'
                                                : esCuadrilla
                                                ? 'Cuadrilla'
                                                : 'Personal';

                                            const nombreObjetivo = esCurso
                                                ? item.curso?.nombre || `Curso #${item.id_curso}`
                                                : esCuadrilla
                                                ? item.cuadrilla?.nombre_cuadrilla || `Cuadrilla #${item.id_cuadrilla}`
                                                : item.usuario_afectado?.nombre_completo || `Usuario #${item.id_usuario_afectado}`;

                                            return (
                                                <tr key={item.id_audit} className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714]">
                                                    <td className="py-3 px-4 whitespace-nowrap text-[#6B7280]">
                                                        {new Date(item.fecha_evento).toLocaleString('es-AR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                                                            {esCurso && <BookOpen className="h-3.5 w-3.5 text-[#2F6F5E]" />}
                                                            {esCuadrilla && <Users className="h-3.5 w-3.5 text-[#B5651D]" />}
                                                            {!esCurso && !esCuadrilla && <User className="h-3.5 w-3.5 text-[#2F6F5E]" />}
                                                            {categoria}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold">
                                                        {nombreObjetivo}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {item.accion}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${getBadgeColor(item.estado_resultante)}`}>
                                                            {item.estado_resultante}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 px-4 text-center text-[#6B7280]">
                                                No se registran movimientos de auditoría para el filtro seleccionado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* =====================================================================
                    PESTAÑA 3: SOPORTE (TICKETS AUDITADOS)
                ===================================================================== */}
                {activeTab === 'soporte' && (
                    <div className="space-y-6 w-full max-w-6xl">
                        {/* KPIs de Tickets Auditados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] block">
                                        Tickets Respondidos Personalmente (Firma anónima "RRHH")
                                    </span>
                                    <b className="text-[32px] font-bold text-[#1F2328] dark:text-[#ECEFEC] mt-1 block">
                                        {metricasSoporte.total_respondidos}
                                    </b>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5] flex items-center justify-center shrink-0">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] block">
                                        Calificación Interna Promedio (Feedback del Operario)
                                    </span>
                                    <b className="text-[32px] font-bold text-[#1F2328] dark:text-[#ECEFEC] mt-1 flex items-center gap-2">
                                        {metricasSoporte.calificacion_promedio !== null
                                            ? `${metricasSoporte.calificacion_promedio} / 5.0`
                                            : 'Sin calificar'}
                                        <Star className="h-6 w-6 text-[#E3A15A] fill-[#E3A15A]" />
                                    </b>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-[#B5651D]/10 text-[#B5651D] flex items-center justify-center shrink-0">
                                    <Star className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        {/* Últimos Tickets Respondidos por este Admin */}
                        <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm full-w">
                            <h2 className="text-[17px] font-bold m-0 mb-1">
                                Historial de Consultas Respondidas
                            </h2>
                            <p className="text-[13.5px] text-[#6B7280] dark:text-[#9AA39D] m-0 mb-4">
                                Aunque el operario visualiza la respuesta firmada genéricamente por "RRHH", aquí se auditan tus intervenciones individuales.
                            </p>

                            <div className="overflow-x-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px]">
                                <table className="w-full border-collapse text-left text-[14px]">
                                    <thead>
                                        <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/40">
                                            <th className="py-3 px-4 font-medium text-[#6B7280]">Colaborador / Curso</th>
                                            <th className="py-3 px-4 font-medium text-[#6B7280]">Duda Planteada</th>
                                            <th className="py-3 px-4 font-medium text-[#6B7280]">Tu Respuesta</th>
                                            <th className="py-3 px-4 font-medium text-[#6B7280] text-right">Calificación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                                        {metricasSoporte.ultimos_tickets.length > 0 ? (
                                            metricasSoporte.ultimos_tickets.map((t) => (
                                                <tr key={t.id_ticket} className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714]">
                                                    <td className="py-3 px-4">
                                                        <b className="block whitespace-nowrap">{t.colaborador?.nombre_completo || 'Operario'}</b>
                                                        <small className="text-[#6B7280] whitespace-nowrap">{t.curso?.nombre || 'Consulta General'}</small>
                                                    </td>
                                                    <td className="py-3 px-4 min-w-[200px]" title={t.mensaje_consulta}>
                                                        {t.mensaje_consulta}
                                                    </td>
                                                    <td className="py-3 px-4 min-w-[200px] text-[#6B7280]" title={t.respuesta_admin}>
                                                        {t.respuesta_admin || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                                                        {t.calificacion_resuesta ? `${t.calificacion_resuesta} ★` : 'Pendiente'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-6 px-4 text-center text-[#6B7280]">
                                                    Aún no has respondido tickets de soporte.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* =====================================================================
                    PESTAÑA 4: NOTIFICACIONES EMITIDAS
                ===================================================================== */}
                {activeTab === 'notificaciones' && (
                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm full-w">
                        <h2 className="text-[17px] font-bold m-0 mb-1 flex items-center gap-2">
                            <Bell className="h-5 w-5 text-[#2F6F5E]" />
                            Registro de Notificaciones Emitidas (Push y Correo)
                        </h2>
                        <p className="text-[13.5px] text-[#6B7280] dark:text-[#9AA39D] m-0 mb-4">
                            Historial de alertas manuales masivas o segmentadas disparadas desde tu cuenta ante emergencias climáticas, avisos o cambios de turno.
                        </p>

                        <div className="overflow-x-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px]">
                            <table className="w-full border-collapse text-left text-[14px]">
                                <thead>
                                    <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/40">
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Fecha</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Título y Mensaje</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Segmento Destino</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280] text-right">Canales Disparados</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                                    {notificacionesEmitidas.length > 0 ? (
                                        notificacionesEmitidas.map((n) => (
                                            <tr key={n.id_notificacion} className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714]">
                                                <td className="py-3 px-4 whitespace-nowrap text-[#6B7280]">
                                                    {new Date(n.fecha_publicacion).toLocaleDateString('es-AR')}
                                                </td>
                                                <td className="py-3 px-4 min-w-[200px]">
                                                    <b className="block">{n.titulo}</b>
                                                    <small className="text-[#6B7280] line-clamp-2">{n.mensaje}</small>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className="px-2.5 py-0.5 rounded-md bg-[#F7F7F6] dark:bg-[#141714] text-[12.5px] font-medium">
                                                        {n.segmento_destino}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-2">
                                                        {n.enviado_push && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#2F7D4F]/12 text-[#2F7D4F]">
                                                                <Smartphone className="h-3 w-3" /> Push
                                                            </span>
                                                        )}
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-[#EDF4F1] text-[#2F6F5E]">
                                                            <Mail className="h-3 w-3" /> {n.enviado_email}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-6 px-4 text-center text-[#6B7280]">
                                                No has emitido notificaciones manuales hasta el momento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* =====================================================================
                    PESTAÑA 5: GESTIÓN DE SEGURIDAD Y LOG DE SESIONES
                ===================================================================== */}
                {activeTab === 'seguridad' && (
                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm full-w">
                        <h2 className="text-[17px] font-bold m-0 mb-1 flex items-center gap-2">
                            <Laptop className="h-5 w-5 text-[#2F6F5E]" />
                            Historial de Accesos (Log de Sesión)
                        </h2>
                        <p className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] m-0 mb-5">
                            Registro de solo lectura con la fecha, hora, dirección IP y dispositivo de tus sesiones recientes.
                        </p>

                        <div className="space-y-3">
                            {sesionesActivas.length > 0 ? (
                                sesionesActivas.map((ses) => (
                                    <div
                                        key={ses.id}
                                        className="flex items-center justify-between p-4 rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/50 dark:bg-[#141714]/50"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Laptop className="h-5 w-5 text-[#2F6F5E] shrink-0" />
                                            <div>
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <b className="text-[14px] font-semibold">
                                                        {ses.user_agent}
                                                    </b>
                                                    {ses.is_current_device && (
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2F7D4F]/15 text-[#2F7D4F]">
                                                            Sesión actual
                                                        </span>
                                                    )}
                                                </div>
                                                <small className="text-[12.5px] text-[#6B7280] block mt-0.5">
                                                    IP: {ses.ip_address || '127.0.0.1'} · Última actividad: {ses.fecha_exacta} ({ses.last_active})
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[14px] text-[#6B7280]">
                                    No hay registros de sesión disponibles en base de datos.
                                </p>
                            )}
                        </div>
                    </div>
                )}
                
                {/* =====================================================================
                    PESTAÑA 6: ADMINISTRADORES AGREGADOS
                ===================================================================== */}
                {activeTab === 'administradores' && (
                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] p-6 shadow-sm full-w">
                        <h2 className="text-[17px] font-bold m-0 mb-1 flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-[#2F6F5E]" />
                            Historial de Administradores Agregados al Sistema
                        </h2>
                        <p className="text-[13.5px] text-[#6B7280] dark:text-[#9AA39D] m-0 mb-4">
                            Registro de cuentas con privilegios administrativos (SuperAdmin, Lic_RRHH, Lic_HyS) dadas de alta o autorizadas por tu perfil.
                        </p>

                        <div className="overflow-x-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px]">
                            <table className="w-full border-collapse text-left text-[14px]">
                                <thead>
                                    <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/40">
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Administrador</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">DNI / Legajo</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Rol Asignado</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Nodo</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280]">Fecha de Evento</th>
                                        <th className="py-3 px-4 font-medium text-[#6B7280] text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                                    {historialAdministradores.length > 0 ? (
                                        historialAdministradores.map((adm) => (
                                            <tr key={adm.id_audit} className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714]">
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <b className="block">{adm.usuario_afectado?.nombre_completo}</b>
                                                    <small className="text-[#6B7280]">{adm.usuario_afectado?.email}</small>
                                                </td>
                                                <td className="py-3 px-4 text-[#6B7280] whitespace-nowrap">
                                                    DNI {adm.usuario_afectado?.dni} · Leg. #{adm.usuario_afectado?.legajo}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-[#2F6F5E] dark:text-[#6FBFA5] whitespace-nowrap">
                                                    {adm.usuario_afectado?.rol}
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    {adm.usuario_afectado?.zona_geografica_establecimient}
                                                </td>
                                                <td className="py-3 px-4 text-[#6B7280] whitespace-nowrap">
                                                    {new Date(adm.fecha_evento).toLocaleDateString('es-AR')}
                                                </td>
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${getBadgeColor(adm.estado_resultante)}`}>
                                                        {adm.estado_resultante}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-6 px-4 text-center text-[#6B7280]">
                                                Aún no has dado de alta nuevos administradores desde esta cuenta.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* TOAST FLOTANTE DE CONFIRMACIÓN CON ANIMACIÓN */}
            {toastMsg && (
                <div
                    role="status"
                    className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#1F2328] text-white px-5 py-3 rounded-[10px] shadow-lg text-[14px] font-medium animate-in slide-in-from-bottom-5 fade-in duration-200"
                >
                    {toastMsg}
                </div>
            )}
        </AppLayout>
    );
}