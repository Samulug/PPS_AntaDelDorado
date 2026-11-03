import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import { ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react';

const NODOS = ['Las Lajitas', 'Finca Norte', 'Finca Valle', 'Planta de empaque', 'Anta', 'Coronel Mollinedo', 'Laguna Verde'];
const DEPS = ['Cosecha', 'Empaque', 'Mantenimiento', 'Logística'];

export default function ColaboradorCreate() {
    const form = useForm({
        nombre_completo: '',
        dni: '',
        legajo: '',
        email: '',
        rol: 'Operario',
        zona_geografica_establecimient: NODOS[0],
        centro_costo: DEPS[0],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/colaboradores');
    };

    return (
        <AppLayout
            title="Nuevo Colaborador"
            breadcrumbs={[
                { title: 'Colaboradores', href: '/colaboradores' },
                { title: 'Nuevo colaborador' },
            ]}
        >
            <Head title="Nuevo Colaborador · Panel de RRHH" />

            <div className="w-full max-w-[760px] mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href="/colaboradores"
                        className="p-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] transition"
                        title="Volver al listado"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-[24px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                            Alta de colaborador
                        </h1>
                        <p className="text-[14px] text-[#6B7280] dark:text-[#9AA39D] m-0">
                            Registrá un nuevo colaborador operativo en el sistema de onboarding.
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-sm overflow-hidden">

                    <form onSubmit={handleSubmit} className="p-8 grid gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Nombre completo
                                <input
                                    type="text"
                                    required
                                    value={form.data.nombre_completo}
                                    onChange={(e) => form.setData('nombre_completo', e.target.value)}
                                    placeholder="Ej. Marcos Ledesma"
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                />
                                {form.errors.nombre_completo && (
                                    <span className="text-[12px] text-[#B3372B]">{form.errors.nombre_completo}</span>
                                )}
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Correo electrónico corporativo
                                <input
                                    type="email"
                                    required
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    placeholder="operario@antadorado.com.ar"
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                />
                                {form.errors.email && (
                                    <span className="text-[12px] text-[#B3372B]">{form.errors.email}</span>
                                )}
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                DNI (Sin puntos)
                                <input
                                    type="number"
                                    required
                                    value={form.data.dni}
                                    onChange={(e) => form.setData('dni', e.target.value)}
                                    placeholder="Ej. 30412887"
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                />
                                {form.errors.dni && (
                                    <span className="text-[12px] text-[#B3372B]">{form.errors.dni}</span>
                                )}
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Número de legajo
                                <input
                                    type="number"
                                    required
                                    value={form.data.legajo}
                                    onChange={(e) => form.setData('legajo', e.target.value)}
                                    placeholder="Ej. 1042"
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                />
                                {form.errors.legajo && (
                                    <span className="text-[12px] text-[#B3372B]">{form.errors.legajo}</span>
                                )}
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Rol asignado
                                <select
                                    value={form.data.rol}
                                    onChange={(e) => form.setData('rol', e.target.value as any)}
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                >
                                    <option value="Operario">Operario</option>
                                    <option value="Supervisor">Supervisor</option>
                                </select>
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Nodo productivo / Planta
                                <select
                                    value={form.data.zona_geografica_establecimient}
                                    onChange={(e) => form.setData('zona_geografica_establecimient', e.target.value)}
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                >
                                    {NODOS.map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC] sm:col-span-2">
                                Departamento / Centro de costo
                                <select
                                    value={form.data.centro_costo}
                                    onChange={(e) => form.setData('centro_costo', e.target.value)}
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                >
                                    {DEPS.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-[#E9E9E7] dark:border-[#2A302B] flex items-center justify-end gap-3">
                            <Link
                                href="/colaboradores"
                                className="px-5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] text-[14px] font-medium text-[#6B7280] hover:bg-[#F7F7F6]"
                            >
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[8px] bg-[#2F6F5E] text-white text-[14px] font-semibold hover:bg-[#2F7D4F] transition disabled:opacity-50 cursor-pointer"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {form.processing ? 'Registrando...' : 'Dar de alta'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}