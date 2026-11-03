import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import { Save, X, CheckCircle2, ArrowRight, ArrowLeft, BookOpen } from 'lucide-react';

interface Colaborador {
    id: number;
    nombre_completo: string;
    dni: number | string;
    legajo: number | string;
    rol: 'Operario' | 'Supervisor';
    zona_geografica_establecimient: string;
    centro_costo?: string;
    estado_operativo?: string;
}

interface CursoSimple {
    id_curso: number;
    nombre: string;
    descripcion?: string;
}

interface CuadrillaEditable {
    id_cuadrilla: number;
    nombre_cuadrilla: string;
    labor_asociada?: string;
    estado: 'Borrador' | 'Activa' | 'Inactiva' | boolean;
    cursos_borrador_json?: number[];
    colaboradores: { id: number }[];
    progresos_cursos?: { id_progreso: number; id_curso: number }[];
}

interface Props {
    cuadrillaEditable: CuadrillaEditable;
    users?: Colaborador[];
    cursosDisponibles?: CursoSimple[];
}

interface WizardData {
    id_cuadrilla: number;
    nombre_cuadrilla: string;
    labor_asociada: string;
    estado: 'Activa' | 'Borrador' | 'Inactiva';
    colaboradores: number[];
    cursos: number[];
}

const NODOS = ['Las Lajitas', 'Finca Norte', 'Finca Valle', 'Planta de empaque', 'Anta', 'Coronel Mollinedo', 'Laguna Verde'];
const ROLES = ['Operario', 'Supervisor'];

export default function UpdateCuadrilla({
    cuadrillaEditable,
    users = [],
    cursosDisponibles = [],
}: Props) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Filtros de búsqueda para las tarjetas 2 y 3
    const [s2Search, setS2Search] = useState('');
    const [s2Nodo, setS2Nodo] = useState('Todos');
    const [s2Rol, setS2Rol] = useState('Todos');
    const [s3Search, setS3Search] = useState('');

    // Resolver cursos iniciales guardados en la BD
    const initialCursos: number[] = useMemo(() => {
        if (cuadrillaEditable.cursos_borrador_json && cuadrillaEditable.cursos_borrador_json.length > 0) {
            return cuadrillaEditable.cursos_borrador_json;
        }
        return (cuadrillaEditable.progresos_cursos || []).map((p) => p.id_curso);
    }, [cuadrillaEditable]);

    // Resolver estado operativo inicial
    const initialEstado: 'Activa' | 'Borrador' | 'Inactiva' = useMemo(() => {
        if (cuadrillaEditable.estado === 'Inactiva' || cuadrillaEditable.estado === false) return 'Inactiva';
        if (cuadrillaEditable.estado === 'Borrador') return 'Borrador';
        return 'Activa';
    }, [cuadrillaEditable.estado]);

    // Estado principal del formulario
    const [wizardData, setWizardData] = useState<WizardData>({
        id_cuadrilla: cuadrillaEditable.id_cuadrilla,
        nombre_cuadrilla: cuadrillaEditable.nombre_cuadrilla || '',
        labor_asociada: cuadrillaEditable.labor_asociada || '',
        estado: initialEstado,
        colaboradores: (cuadrillaEditable.colaboradores || []).map((c) => c.id),
        cursos: initialCursos,
    });

    const triggerToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const handleClose = () => router.visit('/cuadrillas');

    const handleNext = () => {
        if (step === 1 && (!wizardData.nombre_cuadrilla.trim() || !wizardData.labor_asociada.trim())) {
            triggerToast('Completá el Nombre y la Labor para avanzar.');
            return;
        }
        if (step === 2 && wizardData.colaboradores.length === 0) {
            triggerToast('Seleccioná al menos 1 colaborador.');
            return;
        }
        setStep((s) => (s < 3 ? s + 1 : 3) as 1 | 2 | 3);
    };

    const handleFinish = (e: React.FormEvent) => {
        e.preventDefault();

        if (!wizardData.nombre_cuadrilla.trim() || !wizardData.labor_asociada.trim()) {
            setStep(1);
            triggerToast('Falta el Nombre o la Labor asociada en el Paso 1.');
            return;
        }
        if (wizardData.colaboradores.length === 0) {
            setStep(2);
            triggerToast('Seleccioná al menos 1 colaborador en el Paso 2.');
            return;
        }

        setIsSubmitting(true);
        router.put(`/cuadrillas/${wizardData.id_cuadrilla}`, { ...wizardData }, {
            onSuccess: () => {
                // Redirección gestionada por el backend hacia cuadrillas.index
            },
            onError: () => {
                setIsSubmitting(false);
                triggerToast('Error al guardar. Verificá los datos ingresados.');
            },
        });
    };

    // Corrección del error de tipo any implícito: (c: number) => c !== id
    const toggleColab = (id: number) => {
        setWizardData((prev) => ({
            ...prev,
            colaboradores: prev.colaboradores.includes(id)
                ? prev.colaboradores.filter((c: number) => c !== id)
                : [...prev.colaboradores, id],
        }));
    };

    // Corrección para selección de cursos: (cId: number) => cId !== idCurso
    const toggleCurso = (idCurso: number) => {
        setWizardData((prev) => ({
            ...prev,
            cursos: prev.cursos.includes(idCurso)
                ? prev.cursos.filter((cId: number) => cId !== idCurso)
                : [...prev.cursos, idCurso],
        }));
    };

    const filteredUsers = useMemo(() => {
        const q = s2Search.toLowerCase().trim();
        return users.filter((u) => {
            const mText = !q || `${u.nombre_completo} ${u.dni} ${u.legajo}`.toLowerCase().includes(q);
            const mNodo = s2Nodo === 'Todos' || u.zona_geografica_establecimient === s2Nodo;
            const mRol = s2Rol === 'Todos' || u.rol === s2Rol;
            return mText && mNodo && mRol;
        });
    }, [users, s2Search, s2Nodo, s2Rol]);

    return (
        <AppLayout
            title="Edición de Cuadrilla"
            breadcrumbs={[
                { title: 'Cuadrillas', href: '/cuadrillas' },
                { title: 'Editar cuadrilla' },
            ]}

            
        >
            <Head title="Edición de Cuadrilla · Panel de RRHH" />

            <div className="w-full max-w-[800px] mx-auto bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-sm flex flex-col min-h-[calc(100vh-140px)]">
                {/* HEADER COMPACTO Y NAVEGACIÓN LIBRE ENTRE PESTAÑAS */}
                <header className="px-8 py-3 border-b border-[#E9E9E7] dark:border-[#2A302B] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            title="Volver a la tabla (sin guardar)"
                            className="w-9 h-9 grid place-items-center rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] text-[#6B7280] cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-[18px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                Edición de cuadrilla
                            </h2>
                            <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] flex items-center gap-1 mt-0.5 font-medium">
                                <Save className="w-3 h-3 text-[#2F6F5E]" />
                                Modo edición (los cambios impactan al finalizar)
                            </span>
                        </div>
                    </div>

                    {/* Stepper horizontal: al ser Edición, no tiene restricciones de clic */}
                    <div className="flex items-center gap-1.5">
                        {[
                            { s: 1, l: 'Titulo' },
                            { s: 2, l: `Integrantes (${wizardData.colaboradores.length})` },
                            { s: 3, l: `Cursos (${wizardData.cursos.length})` },
                        ].map((item) => {
                            const active = step === item.s;
                            const done = step > item.s;

                            return (
                                <button
                                    key={item.s}
                                    type="button"
                                    onClick={() => setStep(item.s as 1 | 2 | 3)}
                                    className={`px-3 py-1.5 rounded-[8px] border text-[12px] font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                                        active
                                            ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                            : done
                                            ? 'border-[#2F7D4F]/40 bg-[#2F7D4F]/10 text-[#2F7D4F] dark:text-[#6CC28A]'
                                            : 'border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280] dark:text-[#9AA39D] bg-white dark:bg-[#1B1F1C]'
                                    }`}
                                >
                                    <span
                                        className={`w-5 h-5 grid place-items-center rounded-full text-[12px] font-bold ${
                                            active
                                                ? 'bg-[#2F6F5E] text-white'
                                                : done
                                                ? 'bg-[#2F7D4F] text-white'
                                                : 'bg-[#E9E9E7] dark:bg-[#2A302B] text-[#6B7280]'
                                        }`}
                                    >
                                        {item.s}
                                    </span>
                                    <span className="hidden sm:inline">{item.l}</span>
                                </button>
                            );
                        })}
                    </div>
                </header>

                {/* CUERPO DEL WIZARD */}
                <div className="flex-1 p-6 md:p-6.5 overflow-y-auto">
                    {/* PASO 1: NOMBRE Y LABOR */}
                    {step === 1 && (
                        <div className="grid gap-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                    Definí el nombre y la labor
                                </h3>
                                <p className="text-[#6B7280] dark:text-[#9AA39D] text-[15px] mt-1 mb-0">
                                    Modificá los datos básicos del grupo operativo.
                                </p>
                            </div>
                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Nombre de la cuadrilla
                                <input
                                    type="text"
                                    required
                                    value={wizardData.nombre_cuadrilla}
                                    onChange={(e) =>
                                        setWizardData({ ...wizardData, nombre_cuadrilla: e.target.value })
                                    }
                                    placeholder="Ej. Cuadrilla 1 - Poda Lote Norte"
                                    className="px-4 py-3 border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] rounded-[10px] text-[15px] outline-none focus:border-[#2F6F5E]"
                                />
                            </label>
                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Labor asociada
                                <input
                                    type="text"
                                    required
                                    value={wizardData.labor_asociada}
                                    onChange={(e) =>
                                        setWizardData({ ...wizardData, labor_asociada: e.target.value })
                                    }
                                    placeholder="Ej. Uso obligatorio de guantes anticorte"
                                    className="px-4 py-3 border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] rounded-[10px] text-[15px] outline-none focus:border-[#2F6F5E]"
                                />
                            </label>
                        </div>
                    )}

                    {/* PASO 2 */}
                    {step === 2 && (
                        <div className="flex flex-col gap-4 animate-in fade-in duration-300 h-[480px]">
                            {/* Título (Fijo, no se deforma) */}
                            <div className="shrink-0">
                                <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                    Seleccioná los integrantes
                                </h3>
                                <p className="text-[13px] text-[#6B7280] dark:text-[#9AA39D] mt-0.5 mb-0">
                                    Filtrá por nodo o rol para encontrar al personal de campo.
                                </p>
                            </div>
                            
                            {/* Barra de Filtros e Inputs (shrink-0 garantiza que NUNCA crezca en vertical) */}
                            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#F7F7F6] dark:bg-[#1B1F1C] p-3 rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B]">
                                <input 
                                    type="search" 
                                    value={s2Search} 
                                    onChange={e => setS2Search(e.target.value)} 
                                    placeholder="Buscar DNI o nombre..." 
                                    className="h-[38px] px-3 py-1.5 border border-[#E9E9E7] dark:border-[#2A302B] rounded-[8px] outline-none text-[#1F2328] dark:text-[#ECEFEC] bg-white dark:bg-[#141714] text-[14px] focus:border-[#2F6F5E]" 
                                />
                                <select 
                                    value={s2Nodo} 
                                    onChange={e => setS2Nodo(e.target.value)} 
                                    className="h-[38px] px-3 py-1.5 border border-[#E9E9E7] dark:border-[#2A302B] rounded-[8px] text-[#1F2328] dark:text-[#ECEFEC] bg-white dark:bg-[#141714] outline-none text-[14px] focus:border-[#2F6F5E]"
                                >
                                    <option value="Todos">Todos los Nodos</option>
                                    {NODOS.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <select 
                                    value={s2Rol} 
                                    onChange={e => setS2Rol(e.target.value)} 
                                    className="h-[38px] px-3 py-1.5 border border-[#E9E9E7] dark:border-[#2A302B] rounded-[8px] text-[#1F2328] dark:text-[#ECEFEC] bg-white dark:bg-[#141714] outline-none text-[14px] focus:border-[#2F6F5E]"
                                >
                                    <option value="Todos">Todos los Roles</option>
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>

                            {/* Contenedor scrolleable con min-h-0 y mensaje cuando no hay resultados */}
                            <div className="flex-1 min-h-0 overflow-y-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-3 grid sm:grid-cols-2 gap-2 content-start shadow-inner">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((u: any) => {
                                        const checked = wizardData.colaboradores.includes(u.id);
                                        return (
                                            <label 
                                                key={u.id} 
                                                className={`flex items-center gap-3 p-3 border rounded-[8px] cursor-pointer transition-colors ${
                                                    checked 
                                                        ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029]' 
                                                        : 'border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] dark:hover:bg-[#141714]'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={checked} 
                                                    onChange={() => toggleColab(u.id)} 
                                                    className="accent-[#2F6F5E] w-4.5 h-4.5 shrink-0" 
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <b className={`text-[14px] block truncate ${checked ? 'text-[#2F6F5E] dark:text-[#6FBFA5]' : 'text-[#1F2328] dark:text-[#ECEFEC]'}`}>
                                                        {u.nombre_completo}
                                                    </b>
                                                    <span className="block text-[12px] text-[#6B7280] dark:text-[#9AA39D] truncate">
                                                        {u.rol} · {u.zona_geografica_establecimient}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full py-16 text-center text-[#6B7280] dark:text-[#9AA39D] text-[14px]">
                                        No se encontraron colaboradores con los filtros aplicados.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PASO 3: CURSOS Y ESTADO FINAL */}
                    {step === 3 && (
                        <div className="grid gap-6 animate-in fade-in duration-300">
                            <h3 className="text-[20px] font-bold m-0 text-[#1F2328] dark:text-[#ECEFEC]">
                                Modificar batería preventiva
                            </h3>

                            <input
                                type="search"
                                value={s3Search}
                                onChange={(e) => setS3Search(e.target.value)}
                                placeholder="Buscar curso..."
                                className="px-4 py-2 border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] rounded-[10px] outline-none text-[14px]"
                            />

                            <div className="h-[280px] overflow-y-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-3 grid gap-2 content-start">
                                {cursosDisponibles
                                    .filter((c) => c.nombre.toLowerCase().includes(s3Search.toLowerCase()))
                                    .map((c) => {
                                        const checked = wizardData.cursos.includes(c.id_curso);
                                        return (
                                            <label
                                                key={c.id_curso}
                                                className={`flex gap-3 p-3 border rounded-[8px] cursor-pointer transition ${
                                                    checked
                                                        ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029]'
                                                        : 'border-[#E9E9E7] dark:border-[#2A302B]'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCurso(c.id_curso)}
                                                    className="accent-[#2F6F5E] w-4.5 h-4.5 mt-1"
                                                />
                                                <div>
                                                    <b className="text-[14px] flex items-center gap-2 text-[#1F2328] dark:text-[#ECEFEC]">
                                                        <BookOpen className="w-4 h-4 text-[#2F6F5E]" />
                                                        {c.nombre}
                                                    </b>
                                                    {c.descripcion && (
                                                        <p className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] m-0 mt-1">
                                                            {c.descripcion}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-[#F7F7F6] dark:bg-[#141714] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px]">
                                <span className="font-semibold text-[14px] text-[#1F2328] dark:text-[#ECEFEC]">
                                    Estado al guardar:
                                </span>
                                <select
                                    value={wizardData.estado}
                                    onChange={(e) =>
                                        setWizardData({ ...wizardData, estado: e.target.value as any })
                                    }
                                    className="flex-1 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] outline-none font-bold text-[#1F2328] dark:text-[#ECEFEC]"
                                >
                                    <option value="Activa">Activa (Publicar)</option>
                                    <option value="Borrador">Mantener en Borrador</option>
                                    <option value="Inactiva">Inactiva</option>
                                </select>
                            </label>
                        </div>
                    )}
                </div>

                {/* FOOTER BOTONES */}
                <footer className="px-8 py-5 border-t border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] flex justify-between gap-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] font-medium text-[#6B7280] dark:text-[#9AA39D] cursor-pointer"
                    >
                        Salir sin guardar
                    </button>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            disabled={step === 1}
                            onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                            className="px-5 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] font-semibold flex gap-2 items-center text-[#1F2328] dark:text-[#ECEFEC] disabled:opacity-50 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Anterior
                        </button>

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-5 py-2.5 rounded-[10px] bg-[#2F6F5E] text-white font-semibold flex gap-2 items-center cursor-pointer"
                            >
                                Siguiente
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleFinish}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-[10px] bg-[#2F6F5E] text-white font-semibold flex gap-2 items-center cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        )}
                    </div>
                </footer>
            </div>

            {toastMsg && (
                <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#1F2328] text-white px-5 py-3 rounded-[10px] shadow-lg text-[14px] font-medium">
                    {toastMsg}
                </div>
            )}
        </AppLayout>
    );
}