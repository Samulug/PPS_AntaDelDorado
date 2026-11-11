import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import { useAuth } from '@/hooks/use-auth';
import {
    ShieldCheck,
    Users,
    Plus,
    Lock,
    CheckCircle2,
    AlertTriangle,
    UserPlus,
    Save,
    Trash2,
    X,
    KeyRound,
} from 'lucide-react';

interface RoleItem {
    id: number;
    name: string;
    permissions: string[];
    is_system: boolean;
}

interface AdminUser {
    id: number;
    nombre_completo: string;
    dni: number;
    legajo: number;
    email: string;
    rol: string;
    zona_geografica_establecimient: string;
    centro_costo: string;
    estado_operativo: 'Activo' | 'Inactivo' | 'Suspendido';
    sso_sincronizado: boolean;
    es_desarrollador: boolean;
}

interface Props {
    roles: RoleItem[];
    allPermissions: string[];
    administradores: AdminUser[];
}

// Agrupación visual de los permisos atómicos por módulo del sistema
const GRUPOS_PERMISOS: {
    modulo: string;
    descripcion: string;
    permisos: { key: string; label: string }[];
}[] = [
    {
        modulo: '1. Dashboard y Analítica',
        descripcion: 'Visualización de KPIs de cumplimiento y descarga de matrices.',
        permisos: [
            { key: 'ver_metricas', label: 'Ver métricas y gráficos del Dashboard' },
            { key: 'exportar_reportes', label: 'Exportar reportes en Excel (.xlsx) y PDF' },
        ],
    },
    {
        modulo: '2. Directorio de Colaboradores',
        descripcion: 'Acceso al padrón de operarios y supervisores de planta.',
        permisos: [
            { key: 'listar_colaboradores', label: 'Ver y buscar colaboradores (Solo lectura)' },
            { key: 'crear_colaborador', label: 'Dar de alta nuevos colaboradores' },
            { key: 'editar_colaborador', label: 'Editar datos de legajo y nodo productivo' },
            { key: 'suspender_colaborador', label: 'Cambiar estado operativo (Vacaciones, Siniestrado, Baja)' },
        ],
    },
    {
        modulo: '3. Cuadrillas de Entrenamiento Preventivo',
        descripcion: 'Armado de grupos operativos y asignación de baterías preventivas.',
        permisos: [
            { key: 'listar_cuadrillas', label: 'Ver listado de cuadrillas' },
            { key: 'crear_cuadrilla', label: 'Crear cuadrillas y asignar cursos' },
            { key: 'editar_cuadrilla', label: 'Editar integrantes o estado de cuadrillas' },
            { key: 'eliminar_cuadrilla', label: 'Eliminar cuadrillas o borradores' },
        ],
    },
    {
        modulo: '4. Catálogo de Cursos y Cuestionarios',
        descripcion: 'Diseño pedagógico, subida multimedia y evaluaciones.',
        permisos: [
            { key: 'listar_cursos', label: 'Ver catálogo de cursos (Solo lectura)' },
            { key: 'crear_curso', label: 'Crear nuevos cursos, módulos y cuestionarios' },
            { key: 'editar_curso', label: 'Editar cursos y cambiar estado (Activo / Borrador / Taller)' },
            { key: 'eliminar_curso', label: 'Eliminar cursos permanentemente' },
            { key: 'previsualizar_curso', label: 'Reproducir y previsualizar material multimedia' },
        ],
    },
    {
        modulo: '5. Bandeja de Consultas (Tickets)',
        descripcion: 'Soporte al operario bajo firma institucional "RRHH".',
        permisos: [
            { key: 'listar_tickets', label: 'Ver bandeja de dudas de operarios' },
            { key: 'responder_tickets', label: 'Responder consultas en nombre de RRHH' },
        ],
    },
    {
        modulo: '6. Centro de Notificaciones Duales',
        descripcion: 'Despacho de alertas Push (FCM) y correo electrónico.',
        permisos: [
            { key: 'listar_notificaciones', label: 'Ver historial de alertas emitidas' },
            { key: 'enviar_notificacion_push', label: 'Disparar notificaciones manuales masivas/segmentadas' },
        ],
    },
    {
        modulo: '7. Seguridad y Gobierno (SuperAdmin)',
        descripcion: 'Control de accesos administrativos y matriz RBAC.',
        permisos: [
            { key: 'listar_roles_admins', label: 'Acceder a Roles y Administradores' },
            { key: 'crear_rol', label: 'Crear nuevos roles personalizados' },
            { key: 'editar_rol', label: 'Eliminar roles personalizados' },
            { key: 'asignar_permisos', label: 'Modificar permisos y gestionar cuentas de Administradores' },
        ],
    },
];

const NODOS = [
    'Las Lajitas',
    'Anta',
    'Coronel Mollinedo',
    'Laguna Verde',
    'Planta de empaque',
];

export default function RolesIndex({ roles = [], administradores = [] }: Props) {
    const { can, user: currentUser } = useAuth();
    const { flash, errors } = usePage<any>().props;

    const [activeTab, setActiveTab] = useState<'matriz' | 'administradores'>('matriz');
    const [selectedRoleId, setSelectedRoleId] = useState<number>(
        roles.find((r) => r.name === 'Lic_RRHH')?.id || roles[0]?.id || 0
    );

    const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
    const [checkedPermissions, setCheckedPermissions] = useState<string[]>(
        selectedRole?.permissions || []
    );
    const [isSavingPerms, setIsSavingPerms] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    useEffect(() => {
        if (selectedRole) {
            setCheckedPermissions(selectedRole.permissions);
        }
    }, [selectedRoleId, roles]);

    useEffect(() => {
        if (flash?.success) {
            setToastMsg(flash.success);
            setTimeout(() => setToastMsg(null), 3200);
        }
    }, [flash]);

    const togglePermission = (permKey: string) => {
        if (!selectedRole || selectedRole.name === 'SuperAdmin' || !can('asignar_permisos')) {
            return;
        }
        setCheckedPermissions((prev) =>
            prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
        );
    };

    const handleSavePermissions = () => {
        if (!selectedRole || selectedRole.name === 'SuperAdmin') return;
        setIsSavingPerms(true);
        router.put(
            `/roles/${selectedRole.id}/permissions`,
            { permissions: checkedPermissions },
            {
                preserveScroll: true,
                onFinish: () => setIsSavingPerms(false),
            }
        );
    };


    const handleDeleteRole = (role: RoleItem) => {
        if (role.is_system) return;
        router.delete(`/roles/${role.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedRoleId(roles[0]?.id || 0);
            },
        });
    };


    const handleUpdateAdmin = (admin: AdminUser, nuevoRol: string, nuevoEstado: string) => {
        router.patch(
            `/roles/administradores/${admin.id}`,
            {
                rol: nuevoRol,
                estado_operativo: nuevoEstado,
            },
            { preserveScroll: true }
        );
    };

    return (
        <AppLayout title="Roles y Accesos">
            <Head title="Roles y Accesos · Panel de RRHH" />

            {/* ENCABEZADO */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div className="flex-1 min-w-[260px]">
                    <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-1">
                        Roles y permisos granulares
                    </h1>
                    <p className="text-[#6B7280] dark:text-[#9AA39D] text-[15px] m-0">
                        Configuración de qué puede observar, tocar y solicitar cada perfil administrativo en el sistema.
                    </p>
                </div>

                {/* Selector de Pestañas y Acciones Principales */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="inline-flex rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] p-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('matriz')}
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] text-[14px] font-medium transition cursor-pointer ${
                                activeTab === 'matriz'
                                    ? 'bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                    : 'text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Matriz de Permisos
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('administradores')}
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] text-[14px] font-medium transition cursor-pointer ${
                                activeTab === 'administradores'
                                    ? 'bg-[#2F6F5E] text-white dark:bg-[#6FBFA5] dark:text-[#0E1A15]'
                                    : 'text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                            }`}
                        >
                            <Users className="h-4 w-4" />
                            Administradores ({administradores.length})
                        </button>
                    </div>

                    {activeTab === 'matriz' && can('crear_rol') && (
                        <Link
                            href="/roles/create"
                            className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 rounded-[8px] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14px] font-medium hover:brightness-95 transition cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Crear rol
                        </Link>
                    )}

                    {activeTab === 'administradores' && can('asignar_permisos') && (
                        <Link
                            href="/administradores/create"
                            className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 rounded-[8px] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14px] font-medium hover:brightness-95 transition cursor-pointer"
                        >
                            <UserPlus className="h-4 w-4" />
                            Nuevo administrador (SSO)
                        </Link>
                    )}
                </div>
            </div>

            {/* ALERTA DE ERRORES DE POLÍTICA / VALIDACIÓN */}
            {Object.keys(errors || {}).length > 0 && (
                <div className="mb-6 p-4 rounded-[12px] border border-[#B3372B]/30 bg-[#B3372B]/10 text-[#B3372B] dark:text-[#EE8274] text-[14px] flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                        {Object.values(errors).map((err: any, i) => (
                            <div key={i} className="font-medium">
                                {err}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* =====================================================================
                PESTAÑA 1: MATRIZ DE ROLES Y PERMISOS GRANULARES
            ===================================================================== */}
            {activeTab === 'matriz' && (
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
                    {/* Columna Izquierda: Lista de Roles */}
                    <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-4 space-y-2">
                        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280] px-2 block mb-2">
                            Roles de Gestión Web
                        </span>

                        {roles.map((r) => {
                            const active = r.id === selectedRole?.id;
                            return (
                                <div
                                    key={r.id}
                                    onClick={() => setSelectedRoleId(r.id)}
                                    className={`flex items-center justify-between p-3 rounded-[10px] border transition cursor-pointer ${
                                        active
                                            ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                            : 'border-transparent hover:bg-[#F7F7F6] dark:hover:bg-[#141714]'
                                    }`}
                                >
                                    <div>
                                        <b className="text-[15px] font-semibold block">{r.name}</b>
                                        <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D]">
                                            {r.permissions.length} permisos activos
                                        </span>
                                    </div>

                                    {!r.is_system && can('editar_rol') && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteRole(r);
                                            }}
                                            title="Eliminar rol personalizado"
                                            className="p-1.5 text-[#6B7280] hover:text-[#B3372B] rounded-[6px]"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        <div className="pt-3 mt-3 border-t border-[#E9E9E7] dark:border-[#2A302B] px-2 text-[12.5px] text-[#6B7280]">
                            <p className="m-0">
                                <b>Nota arquitectónica:</b> Los permisos atómicos están vinculados a los controladores del sistema. Puedes crear nuevos roles combinando estos permisos.
                            </p>
                        </div>
                    </div>

                    {/* Columna Derecha: Checkboxes de Permisos Granulares por Módulo */}
                    {selectedRole && (
                        <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] overflow-hidden">
                            <div className="px-7 py-5 border-b border-[#E9E9E7] dark:border-[#2A302B] flex flex-wrap items-center justify-between gap-4 bg-[#F7F7F6]/50 dark:bg-[#141714]/40">
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-[19px] font-bold m-0">
                                            Permisos del rol: {selectedRole.name}
                                        </h2>
                                        {selectedRole.name === 'SuperAdmin' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#2F6F5E]/15 text-[#2F6F5E] dark:text-[#6FBFA5]">
                                                <Lock className="h-3 w-3" /> Acceso Total Inmutable
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[13.5px] text-[#6B7280] m-0 mt-0.5">
                                        Marca o desmarca las acciones que este perfil puede observar y solicitar en cada pantalla.
                                    </p>
                                </div>

                                {selectedRole.name !== 'SuperAdmin' && can('asignar_permisos') && (
                                    <button
                                        type="button"
                                        disabled={isSavingPerms}
                                        onClick={handleSavePermissions}
                                        className="inline-flex items-center gap-2 min-h-[38px] px-5 py-2 rounded-[8px] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14px] font-semibold hover:brightness-95 transition cursor-pointer disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        {isSavingPerms ? 'Guardando...' : 'Guardar cambios del rol'}
                                    </button>
                                )}
                            </div>

                            <div className="p-7 grid gap-6">
                                {GRUPOS_PERMISOS.map((grupo) => (
                                    <div
                                        key={grupo.modulo}
                                        className="border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-5"
                                    >
                                        <div className="mb-3">
                                            <h3 className="text-[15px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                                {grupo.modulo}
                                            </h3>
                                            <p className="text-[13px] text-[#6B7280] m-0">
                                                {grupo.descripcion}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {grupo.permisos.map((perm) => {
                                                const isChecked =
                                                    selectedRole.name === 'SuperAdmin' ||
                                                    checkedPermissions.includes(perm.key);
                                                const isDisabled =
                                                    selectedRole.name === 'SuperAdmin' ||
                                                    !can('asignar_permisos');

                                                return (
                                                    <label
                                                        key={perm.key}
                                                        className={`flex items-start gap-3 p-3 rounded-[8px] border text-[13.5px] transition ${
                                                            isChecked
                                                                ? 'border-[#2F6F5E]/50 bg-[#EDF4F1]/60 dark:bg-[#223029]/50'
                                                                : 'border-[#E9E9E7] dark:border-[#2A302B]'
                                                        } ${
                                                            isDisabled
                                                                ? 'opacity-75 cursor-not-allowed'
                                                                : 'cursor-pointer hover:border-[#2F6F5E]'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            disabled={isDisabled}
                                                            onChange={() => togglePermission(perm.key)}
                                                            className="accent-[#2F6F5E] w-4 h-4 mt-0.5 shrink-0"
                                                        />
                                                        <div className="leading-snug">
                                                            <b className="font-medium text-[#1F2328] dark:text-[#ECEFEC] block">
                                                                {perm.label}
                                                            </b>
                                                            <code className="text-[11px] text-[#6B7280]">
                                                                {perm.key}
                                                            </code>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* =====================================================================
                PESTAÑA 2: EQUIPO DE ADMINISTRADORES (MICROSOFT SSO)
            ===================================================================== */}
            {activeTab === 'administradores' && (
                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] overflow-hidden">
                    <div className="px-7 py-5 border-b border-[#E9E9E7] dark:border-[#2A302B] flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-[17px] font-bold m-0">
                                Cuentas Administrativas Autorizadas
                            </h2>
                            <p className="text-[13.5px] text-[#6B7280] m-0 mt-0.5">
                                Estos usuarios acceden al panel web mediante su correo corporativo de Microsoft Entra ID (Single Sign-On).
                            </p>
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse text-left text-[14px]">
                            <thead>
                                <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/50">
                                    <th className="py-3 px-5 font-medium text-[#6B7280]">
                                        Administrador y Correo Microsoft
                                    </th>
                                    <th className="py-3 px-4 font-medium text-[#6B7280]">
                                        Legajo / Nodo
                                    </th>
                                    <th className="py-3 px-4 font-medium text-[#6B7280]">
                                        Estado SSO
                                    </th>
                                    <th className="py-3 px-4 font-medium text-[#6B7280]">
                                        Rol Asignado
                                    </th>
                                    <th className="py-3 px-5 font-medium text-[#6B7280] text-right">
                                        Estado Operativo
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B]">
                                {administradores.map((adm) => {
                                    const esMiUsuario = currentUser?.id === adm.id;
                                    // Si el objetivo es el Desarrollador y yo no soy el Desarrollador, bloqueo total en UI
                                    const bloqueadoPorModoDios = adm.es_desarrollador && !esMiUsuario;

                                    return (
                                        <tr
                                            key={adm.id}
                                            className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors"
                                        >
                                            <td className="py-3.5 px-5 align-middle">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <b className="font-semibold text-[#1F2328] dark:text-[#ECEFEC]">
                                                        {adm.nombre_completo}
                                                    </b>
                                                    {adm.es_desarrollador && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2F6F5E] text-white">
                                                            <KeyRound className="h-3 w-3" /> Creador / Dev
                                                        </span>
                                                    )}
                                                    {esMiUsuario && (
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                                            Tú
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[12.5px] text-[#6B7280] block">
                                                    {adm.email}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 align-middle">
                                                <span className="font-medium block">
                                                    Legajo #{adm.legajo} · DNI {adm.dni}
                                                </span>
                                                <span className="text-[12px] text-[#6B7280]">
                                                    {adm.zona_geografica_establecimient} ({adm.centro_costo})
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 align-middle">
                                                {adm.sso_sincronizado ? (
                                                    <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#2F7D4F] dark:text-[#6CC28A]">
                                                        <CheckCircle2 className="h-4 w-4" /> Vinculado
                                                    </span>
                                                ) : (
                                                    <span className="text-[12.5px] text-[#6B7280]">
                                                        Pendiente 1° ingreso
                                                    </span>
                                                )}
                                            </td>

                                            {/* Selector de Rol */}
                                            <td className="py-3.5 px-4 align-middle">
                                                {bloqueadoPorModoDios || esMiUsuario || !can('asignar_permisos') ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#F7F7F6] dark:bg-[#141714] text-[13px] font-semibold text-[#2F6F5E] dark:text-[#6FBFA5]">
                                                        <Lock className="h-3.5 w-3.5" />
                                                        {adm.rol}
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={adm.rol}
                                                        onChange={(e) =>
                                                            handleUpdateAdmin(
                                                                adm,
                                                                e.target.value,
                                                                adm.estado_operativo
                                                            )
                                                        }
                                                        className="px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13.5px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] cursor-pointer"
                                                    >
                                                        {roles.map((r) => (
                                                            <option key={r.id} value={r.name}>
                                                                {r.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>

                                            {/* Selector de Estado Operativo */}
                                            <td className="py-3.5 px-5 align-middle text-right">
                                                {bloqueadoPorModoDios || esMiUsuario || !can('asignar_permisos') ? (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#2F7D4F]/12 text-[#2F7D4F]">
                                                        {adm.estado_operativo}
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={adm.estado_operativo}
                                                        onChange={(e) =>
                                                            handleUpdateAdmin(
                                                                adm,
                                                                adm.rol,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="px-3 py-1 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] font-medium cursor-pointer"
                                                    >
                                                        <option value="Activo">Activo</option>
                                                        <option value="Suspendido">Suspendido</option>
                                                        <option value="Inactivo">Inactivo</option>
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {toastMsg && (
                <div
                    role="status"
                    className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#1F2328] text-white px-5 py-3 rounded-[10px] shadow-lg text-[14px] font-medium"
                >
                    {toastMsg}
                </div>
            )}
        </AppLayout>
    );
}