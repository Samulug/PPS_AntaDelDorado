import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import { ShieldCheck, Save, ArrowLeft } from 'lucide-react';

const GRUPOS_PERMISOS = [
    {
        modulo: '1. Dashboard y Analítica',
        permisos: [
            { key: 'ver_metricas', label: 'Ver métricas y gráficos del Dashboard' },
            { key: 'exportar_reportes', label: 'Exportar reportes en Excel (.xlsx) y PDF' },
        ],
    },
    {
        modulo: '2. Directorio de Colaboradores',
        permisos: [
            { key: 'listar_colaboradores', label: 'Ver y buscar colaboradores' },
            { key: 'crear_colaborador', label: 'Dar de alta nuevos colaboradores' },
            { key: 'editar_colaborador', label: 'Editar datos de legajo' },
            { key: 'suspender_colaborador', label: 'Cambiar estado operativo' },
        ],
    },
    {
        modulo: '3. Cuadrillas de Entrenamiento Preventivo',
        permisos: [
            { key: 'listar_cuadrillas', label: 'Ver listado de cuadrillas' },
            { key: 'crear_cuadrilla', label: 'Crear cuadrillas y asignar cursos' },
            { key: 'editar_cuadrilla', label: 'Editar integrantes o estado' },
            { key: 'eliminar_cuadrilla', label: 'Eliminar cuadrillas o borradores' },
        ],
    },
    {
        modulo: '4. Catálogo de Cursos y Cuestionarios',
        permisos: [
            { key: 'listar_cursos', label: 'Ver catálogo de cursos' },
            { key: 'crear_curso', label: 'Crear cursos, módulos y cuestionarios' },
            { key: 'editar_curso', label: 'Editar cursos y cambiar estado' },
            { key: 'eliminar_curso', label: 'Eliminar cursos permanentemente' },
            { key: 'previsualizar_curso', label: 'Reproducir material multimedia' },
        ],
    },
    {
        modulo: '5. Bandeja de Consultas (Tickets)',
        permisos: [
            { key: 'listar_tickets', label: 'Ver bandeja de dudas de operarios' },
            { key: 'responder_tickets', label: 'Responder consultas (RRHH)' },
        ],
    },
    {
        modulo: '6. Centro de Notificaciones',
        permisos: [
            { key: 'listar_notificaciones', label: 'Ver historial de alertas' },
            { key: 'enviar_notificacion_push', label: 'Disparar notificaciones manuales' },
        ],
    },
    {
        modulo: '7. Seguridad y Gobierno',
        permisos: [
            { key: 'listar_roles_admins', label: 'Acceder a Roles y Administradores' },
            { key: 'crear_rol', label: 'Crear nuevos roles personalizados' },
            { key: 'editar_rol', label: 'Eliminar roles personalizados' },
            { key: 'asignar_permisos', label: 'Gestionar permisos y cuentas' },
        ],
    },
];

export default function CreateRole() {
    const [newRoleName, setNewRoleName] = useState('');
    const [newRolePerms, setNewRolePerms] = useState<string[]>(['ver_metricas']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;
        setIsSubmitting(true);
        router.post('/roles', { name: newRoleName, permissions: newRolePerms }, {
            onError: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout
            title="Crear Rol"
            breadcrumbs={[
                { title: 'Roles y accesos', href: '/roles' },
                { title: 'Nuevo Rol' },
            ]}
        >
            <Head title="Crear Rol · Panel de RRHH" />

            <div className="w-full max-w-[840px] mx-auto bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-sm flex flex-col min-h-[calc(100vh-140px)]">
                <header className="px-8 py-5 border-b border-[#E9E9E7] dark:border-[#2A302B] flex items-center gap-4">
                    <Link
                        href="/roles"
                        className="w-9 h-9 grid place-items-center rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] text-[#6B7280]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-[19px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                            Crear nuevo rol de gestión
                        </h2>
                        <span className="text-[13px] text-[#6B7280]">
                            Personaliza los permisos operativos para un nuevo perfil en el sistema.
                        </span>
                    </div>
                </header>

                <form onSubmit={handleCreateRole} className="flex-1 flex flex-col">
                    <div className="flex-1 p-8 overflow-y-auto space-y-6">
                        <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                            Nombre identificador del Rol
                            <input
                                type="text"
                                required
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="Ej. Auditor_Externo o Gerente_Planta"
                                className="px-4 py-3 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] text-[15px] outline-none focus:border-[#2F6F5E]"
                            />
                        </label>

                        <div>
                            <span className="text-[14.5px] font-semibold block mb-3 text-[#1F2328] dark:text-[#ECEFEC]">
                                Selecciona los permisos iniciales del rol:
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {GRUPOS_PERMISOS.map((grupo, idx) => (
                                    <div key={idx} className="border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px] p-4">
                                        <b className="text-[13px] font-semibold text-[#6B7280] block mb-2">{grupo.modulo}</b>
                                        <div className="space-y-2">
                                            {grupo.permisos.map((p) => {
                                                const checked = newRolePerms.includes(p.key);
                                                return (
                                                    <label key={p.key} className="flex items-start gap-2.5 text-[13px] cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => setNewRolePerms((prev) => 
                                                                checked ? prev.filter((item) => item !== p.key) : [...prev, p.key]
                                                            )}
                                                            className="accent-[#2F6F5E] w-4 h-4 mt-0.5"
                                                        />
                                                        <span>{p.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <footer className="px-8 py-5 border-t border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] flex justify-end gap-3">
                        <Link
                            href="/roles"
                            className="px-5 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] font-medium text-[#6B7280]"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-[#2F6F5E] text-white text-[14px] font-semibold disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSubmitting ? 'Creando...' : 'Crear Rol'}
                        </button>
                    </footer>
                </form>
            </div>
        </AppLayout>
    );
}