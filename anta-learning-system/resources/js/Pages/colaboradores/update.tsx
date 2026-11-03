import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import { ArrowLeft, Save } from 'lucide-react';

interface Colaborador {
    id: number;
    nombre_completo: string;
    dni: number | string;
    legajo: number | string;
    email: string;
    rol: 'Operario' | 'Supervisor';
    zona_geografica_establecimient: string;
    centro_costo: string;
    estado_operativo: string;
}

interface Props {
    colaborador: Colaborador;
}

const NODOS = ['Las Lajitas', 'Finca Norte', 'Finca Valle', 'Planta de empaque', 'Anta', 'Coronel Mollinedo', 'Laguna Verde'];
const DEPS = ['Cosecha', 'Empaque', 'Mantenimiento', 'Logística'];
const ESTADOS = ['Activo', 'Suspendido', 'Inactivo', 'Vacaciones', 'Lesionado', 'Siniestrado'];

export default function ColaboradorUpdate({ colaborador }: Props) {
    const form = useForm({
        nombre_completo: colaborador.nombre_completo || '',
        dni: colaborador.dni || '',
        legajo: colaborador.legajo || '',
        email: colaborador.email || '',
        rol: colaborador.rol || 'Operario',
        zona_geografica_establecimient: colaborador.zona_geografica_establecimient || NODOS[0],
        centro_costo: colaborador.centro_costo || DEPS[0],
        estado_operativo: colaborador.estado_operativo || 'Activo',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/colaboradores/${colaborador.id}`);
    };

    return (
        <AppLayout
            title={`Editar ${colaborador.nombre_completo}`}
            breadcrumbs={[
                { title: 'Colaboradores', href: '/colaboradores' },
                { title: colaborador.nombre_completo, href: `/colaboradores/${colaborador.id}` },
                { title: 'Editar datos' },
            ]}
        >
            <Head title={`Editar ${colaborador.nombre_completo} · Panel de RRHH`} />

            <div className="w-full max-w-[760px] mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href={`/colaboradores/${colaborador.id}`}
                        className="p-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] hover:text-[#1F2328] transition"
                        title="Volver al detalle"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-[24px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                            Modificar datos del colaborador
                        </h1>
                        <p className="text-[14px] text-[#6B7280] dark:text-[#9AA39D] m-0">
                            Corregí datos de legajo, contacto o asignación operativa en caso de error.
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
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                />
                                {form.errors.nombre_completo && (
                                    <span className="text-[12px] text-[#B3372B]">{form.errors.nombre_completo}</span>
                                )}
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Correo electrónico
                                <input
                                    type="email"
                                    required
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                />
                                {form.errors.email && (
                                    <span className="text-[12px] text-[#B3372B]">{form.errors.email}</span>
                                )}
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                DNI
                                <input
                                    type="number"
                                    required
                                    value={form.data.dni}
                                    onChange={(e) => form.setData('dni', e.target.value)}
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                />
                                {form.errors.dni && (
                                    <span className="text-[12px] text-[#B3372B]">{form.errors.dni}</span>
                                )}
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Legajo
                                <input
                                    type="number"
                                    required
                                    value={form.data.legajo}
                                    onChange={(e) => form.setData('legajo', e.target.value)}
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                />
                                {form.errors.legajo && (
                                    <span className="text-[12px] text-[#B3372B]">{form.errors.legajo}</span>
                                )}
                            </label>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Rol operativo
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
                                Nodo productivo
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

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
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

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Estado operativo
                                <select
                                    value={form.data.estado_operativo}
                                    onChange={(e) => form.setData('estado_operativo', e.target.value)}
                                    className="px-3.5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] focus:border-[#2F6F5E] outline-none"
                                >
                                    {ESTADOS.map((est) => (
                                        <option key={est} value={est}>
                                            {est}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-[#E9E9E7] dark:border-[#2A302B] flex items-center justify-end gap-3">
                            <Link
                                href={`/colaboradores/${colaborador.id}`}
                                className="px-5 py-2.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] text-[14px] font-medium text-[#6B7280] hover:bg-[#F7F7F6]"
                            >
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[8px] bg-[#2F6F5E] text-white text-[14px] font-semibold hover:bg-[#2F7D4F] transition disabled:opacity-50 cursor-pointer"
                            >
                                <Save className="h-4 w-4" />
                                {form.processing ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}