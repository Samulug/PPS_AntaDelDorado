import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import { UserPlus, CheckCircle2, ArrowLeft } from 'lucide-react';

const NODOS = [
    'Las Lajitas',
    'Anta',
    'Coronel Mollinedo',
    'Laguna Verde',
    'Planta de empaque',
];

export default function CreateAdmin({ rolesDisponibles = [] }: { rolesDisponibles: string[] }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adminForm, setAdminForm] = useState({
        nombre_completo: '',
        dni: '',
        legajo: '',
        email: '',
        rol: rolesDisponibles.length > 0 ? rolesDisponibles[0] : 'Lic_RRHH',
        zona_geografica_establecimient: 'Las Lajitas',
        centro_costo: 'Recursos Humanos',
    });

    const handleCreateAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        router.post('/roles/administradores', adminForm, {
            onError: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout
            title="Nuevo Administrador"
            breadcrumbs={[
                { title: 'Roles y accesos', href: '/roles' },
                { title: 'Nuevo Administrador' },
            ]}
        >
            <Head title="Nuevo Administrador · Panel de RRHH" />

            <div className="w-full max-w-[700px] mx-auto bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-sm flex flex-col min-h-[calc(100vh-140px)]">
                <header className="px-8 py-5 border-b border-[#E9E9E7] dark:border-[#2A302B] flex items-center gap-4">
                    <Link
                        href="/roles"
                        className="w-9 h-9 grid place-items-center rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] text-[#6B7280]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-[19px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                            Autorizar nuevo Administrador
                        </h2>
                        <span className="text-[13px] text-[#6B7280]">
                            El usuario iniciará sesión con su cuenta corporativa de Microsoft SSO.
                        </span>
                    </div>
                </header>

                <form onSubmit={handleCreateAdmin} className="flex-1 flex flex-col">
                    <div className="flex-1 p-8 grid grid-cols-1 sm:grid-cols-2 gap-5 text-[14px]">
                        <label className="sm:col-span-2 grid gap-1.5 font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                            Nombre y Apellido
                            <input
                                type="text"
                                required
                                autoFocus
                                value={adminForm.nombre_completo}
                                onChange={(e) => setAdminForm({ ...adminForm, nombre_completo: e.target.value })}
                                placeholder="Ej. Lic. Carolina Gómez"
                                className="px-4 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                            />
                        </label>

                        <label className="sm:col-span-2 grid gap-1.5 font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                            Correo Corporativo (Microsoft Entra ID)
                            <input
                                type="email"
                                required
                                value={adminForm.email}
                                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                                placeholder="usuario@antadeldorado.com"
                                className="px-4 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                            />
                        </label>

                        <label className="grid gap-1.5 font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                            DNI
                            <input
                                type="number"
                                required
                                value={adminForm.dni}
                                onChange={(e) => setAdminForm({ ...adminForm, dni: e.target.value })}
                                className="px-4 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                            />
                        </label>

                        <label className="grid gap-1.5 font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                            N° de Legajo
                            <input
                                type="number"
                                required
                                value={adminForm.legajo}
                                onChange={(e) => setAdminForm({ ...adminForm, legajo: e.target.value })}
                                className="px-4 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                            />
                        </label>

                        <label className="grid gap-1.5 font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                            Rol de Gestión Asignado
                            <select
                                value={adminForm.rol}
                                onChange={(e) => setAdminForm({ ...adminForm, rol: e.target.value })}
                                className="px-4 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] font-semibold text-[#2F6F5E] outline-none focus:border-[#2F6F5E]"
                            >
                                {rolesDisponibles.map((rolName) => (
                                    <option key={rolName} value={rolName}>
                                        {rolName}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="grid gap-1.5 font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                            Nodo Productivo Base
                            <select
                                value={adminForm.zona_geografica_establecimient}
                                onChange={(e) => setAdminForm({ ...adminForm, zona_geografica_establecimient: e.target.value })}
                                className="px-4 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] outline-none focus:border-[#2F6F5E]"
                            >
                                {NODOS.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
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
                            <UserPlus className="w-4 h-4" />
                            {isSubmitting ? 'Procesando...' : 'Dar de alta (SSO)'}
                        </button>
                    </footer>
                </form>
            </div>
        </AppLayout>
    );
}