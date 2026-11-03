import React, { useState, useEffect, useMemo } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/app-layout';
import { Save, X, CheckCircle2, ArrowRight, ArrowLeft, BookOpen, Clock } from 'lucide-react';

// (Mismas Interfaces que en Index: Colaborador, CursoSimple)
const NODOS = ['Las Lajitas', 'Finca Norte', 'Finca Valle', 'Planta de empaque', 'Anta', 'Coronel Mollinedo', 'Laguna Verde'];
const ROLES = ['Operario', 'Supervisor'];
const DRAFT_KEY = 'anta_cuadrilla_create_draft_v2';

export default function CreateCuadrilla({ users = [], cursosDisponibles = [] }: any) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Filtros Paso 2 y 3
    const [s2Search, setS2Search] = useState('');
    const [s2Nodo, setS2Nodo] = useState('Todos');
    const [s2Rol, setS2Rol] = useState('Todos');
    const [s3Search, setS3Search] = useState('');

    const [wizardData, setWizardData] = useState({
        id_cuadrilla: null as number | null,
        nombre_cuadrilla: '',
        labor_asociada: '',
        estado: 'Activa' as 'Activa' | 'Borrador' | 'Inactiva',
        colaboradores: [] as number[],
        cursos: [] as number[],
    });

    const [recoveryBanner, setRecoveryBanner] = useState<any>(null);

    // Recuperación Local
    useEffect(() => {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.nombre_cuadrilla?.trim()) {
                setRecoveryBanner(parsed);
            }
        }
    }, []);

    // Autoguardado Local
    useEffect(() => {
        if (wizardData.nombre_cuadrilla.trim() !== '') {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(wizardData));
        }
    }, [wizardData]);

    const triggerToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const syncDraft = async () => {
        if (!wizardData.nombre_cuadrilla.trim()) return;
        setIsSavingDraft(true);
        try {
            const res = await axios.post('/cuadrillas/borrador', wizardData);
            if (res.data) {
                setWizardData(prev => ({ ...prev, id_cuadrilla: res.data.id_cuadrilla }));
                setLastSavedTime(res.data.updated_at);
            }
        } catch {
            triggerToast('Progreso resguardado localmente.');
        } finally {
            setIsSavingDraft(false);
        }
    };

    // Botón Siguiente (ESTRICTO)
    const handleNext = async () => {
        if (step === 1) {
            if (!wizardData.nombre_cuadrilla.trim() || !wizardData.labor_asociada.trim()) {
                triggerToast('Completá el Nombre y la Labor para avanzar.');
                return;
            }
            await syncDraft();
            setStep(2);
        } else if (step === 2) {
            if (wizardData.colaboradores.length === 0) {
                triggerToast('Seleccioná al menos 1 colaborador.');
                return;
            }
            await syncDraft();
            setStep(3);
        }
    };

    // Botón Salir (Fuerza redirección a la tabla)
    const handleClose = async () => {
        if (wizardData.nombre_cuadrilla.trim() !== '') {
            await syncDraft();
        }
        localStorage.removeItem(DRAFT_KEY);
        router.visit('/cuadrillas'); // Impacta inmediatamente en la tabla
    };

    // Finalizar
    const handleFinish = (e: React.FormEvent) => {
        e.preventDefault();
        if (!wizardData.nombre_cuadrilla.trim() || !wizardData.labor_asociada.trim()) {
            setStep(1); return triggerToast('Faltan datos en el Paso 1');
        }
        if (wizardData.colaboradores.length === 0) {
            setStep(2); return triggerToast('Faltan colaboradores');
        }

        setIsSubmitting(true);
        router.post('/cuadrillas', { ...wizardData }, {
            onSuccess: () => {
                localStorage.removeItem(DRAFT_KEY);
                // La redirección nativa del Backend ('redirect()->route(...)') actualizará la tabla
            },
            onError: () => {
                setIsSubmitting(false);
                triggerToast('Error al guardar, verificá los datos.');
            }
        });
    };

    const toggleColab = (id: number) => {
        setWizardData(prev => ({
            ...prev,
            colaboradores: prev.colaboradores.includes(id) ? prev.colaboradores.filter(c => c !== id) : [...prev.colaboradores, id]
        }));
    };

    const filteredUsers = useMemo(() => {
        const q = s2Search.toLowerCase().trim();
        return users.filter((u: any) => {
            const mText = !q || `${u.nombre_completo} ${u.dni} ${u.legajo}`.toLowerCase().includes(q);
            const mNodo = s2Nodo === 'Todos' || u.zona_geografica_establecimient === s2Nodo;
            const mRol = s2Rol === 'Todos' || u.rol === s2Rol;
            return mText && mNodo && mRol;
        });
    }, [users, s2Search, s2Nodo, s2Rol]);

    return (
        <AppLayout title="Nueva Cuadrilla" breadcrumbs={[{ title: 'Cuadrillas', href: '/cuadrillas' }, { title: 'Nueva cuadrilla' }]}>
            <Head title="Nueva Cuadrilla · Panel de RRHH" />

            {/* BANNER DE RECUPERACIÓN LOCAL */}
            {recoveryBanner && (
                <div className="mb-6 rounded-[12px] bg-[#B5651D]/10 px-5 py-4 flex items-center justify-between border border-[#B5651D]/40">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-[#B5651D]" />
                        <div className="text-[14px]">
                            <b className="font-semibold text-[#1F2328] dark:text-[#ECEFEC]">Borrador no enviado: "{recoveryBanner.nombre_cuadrilla}"</b>
                            <span className="block text-[#6B7280]">Recuperamos tus datos para que puedas continuar.</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setWizardData(recoveryBanner); setRecoveryBanner(null); }} className="px-3 py-1.5 bg-[#2F6F5E] text-white rounded-[8px] text-[13px] font-medium">Recuperar datos</button>
                        <button onClick={() => { localStorage.removeItem(DRAFT_KEY); setRecoveryBanner(null); }} className="px-3 py-1.5 border border-[#E9E9E7] bg-white text-[#6B7280] rounded-[8px] text-[13px]">Descartar</button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-[800px] mx-auto bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-sm flex flex-col min-h-[calc(100vh-140px)]">
                {/* HEADER COMPACTO Y STEPPER */}
                <header className="px-8 py-5 border-b border-[#E9E9E7] dark:border-[#2A302B] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={handleClose} title="Salir y guardar borrador" className="w-9 h-9 grid place-items-center rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] text-[#6B7280]">
                            <X className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-[18px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">Nueva cuadrilla</h2>
                            <span className="text-[12px] text-[#6B7280] flex items-center gap-1 mt-0.5 font-medium">
                                <Save className="w-3 h-3 text-[#2F6F5E]" />
                                {isSavingDraft ? 'Guardando...' : lastSavedTime ? `Borrador: ${lastSavedTime}` : 'Autoguardado activo'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {[
                            { s: 1, l: 'Labor' },
                            { s: 2, l: `Integrantes (${wizardData.colaboradores.length})` },
                            { s: 3, l: `Cursos (${wizardData.cursos.length})` },
                        ].map((item) => {
                            const active = step === item.s;
                            const done = step > item.s;
                            // RESTRICTIVO: En creación, no podés cliquear pestañas futuras si no cumplís
                            const unlocked = done || active || 
                                (item.s === 2 && wizardData.nombre_cuadrilla.trim() && wizardData.labor_asociada.trim()) ||
                                (item.s === 3 && wizardData.colaboradores.length > 0);

                            return (
                                <button
                                    key={item.s}
                                    disabled={!unlocked}
                                    onClick={() => setStep(item.s as 1|2|3)}
                                    className={`px-3 py-1.5 rounded-[8px] border text-[13px] font-semibold flex items-center gap-2 ${active ? 'border-[#2F6F5E] bg-[#EDF4F1] text-[#2F6F5E]' : done ? 'border-[#2F7D4F]/40 bg-[#2F7D4F]/10 text-[#2F7D4F]' : 'border-[#E9E9E7] text-[#6B7280] bg-white'} disabled:opacity-50`}
                                >
                                    <span className={`w-5 h-5 grid place-items-center rounded-full text-[12px] text-white ${active ? 'bg-[#2F6F5E]' : done ? 'bg-[#2F7D4F]' : 'bg-[#6B7280]'}`}>{item.s}</span>
                                    <span className="hidden sm:inline">{item.l}</span>
                                </button>
                            );
                        })}
                    </div>
                </header>

                {/* CUERPO DEL WIZARD */}
                <div className="flex-1 p-8 md:p-8 overflow-y-auto">
                    {/* PASO 1 */}
                    {step === 1 && (
                        <div className="grid gap-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">Definí el nombre y la labor</h3>
                                <p className="text-[#6B7280] text-[15px] mt-1 mb-0">Justificá la creación de este grupo operativo.</p>
                            </div>
                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Nombre de la cuadrilla
                                <input type="text" value={wizardData.nombre_cuadrilla} onChange={e => setWizardData({...wizardData, nombre_cuadrilla: e.target.value})} placeholder="Ej. Cuadrilla 1 - Poda Lote Norte" className="px-4 py-3 border border-[#E9E9E7] rounded-[10px] text-[15px] text-[#1F2328] outline-none focus:border-[#2F6F5E]" />
                            </label>
                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Labor asociada
                                <input type="text" value={wizardData.labor_asociada} onChange={e => setWizardData({...wizardData, labor_asociada: e.target.value})} placeholder="Ej. Uso obligatorio de guantes anticorte" className="px-4 py-3 border border-[#E9E9E7] rounded-[10px] text-[15px] text-[#1F2328] outline-none focus:border-[#2F6F5E]" />
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

                    {/* PASO 3 */}
                    {step === 3 && (
                        <div className="grid gap-6 animate-in fade-in duration-300">
                            <h3 className="text-[20px] font-bold m-0">Asignar batería preventiva</h3>
                            
                            <input type="search" value={s3Search} onChange={e => setS3Search(e.target.value)} placeholder="Buscar curso..." className="px-4 py-2 border rounded-[10px] text-[#1F2328] outline-none" />

                            <div className="h-[280px] overflow-y-auto border border-[#E9E9E7] rounded-[12px] p-3 grid gap-2 content-start">
                                {cursosDisponibles.filter((c: any) => c.nombre.toLowerCase().includes(s3Search.toLowerCase())).map((c: any) => {
                                    const checked = wizardData.cursos.includes(c.id_curso);
                                    return (
                                        <label key={c.id_curso} className={`flex gap-3 p-3 border rounded-[8px]  cursor-pointer ${checked ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#1B1F1C]' : 'border-[#E9E9E7] '}`}>
                                            <input type="checkbox" checked={checked} onChange={() => setWizardData(prev => ({...prev, cursos: prev.cursos.includes(c.id_curso) ? prev.cursos.filter(id => id !== c.id_curso) : [...prev.cursos, c.id_curso]}))} className="accent-[#2F6F5E] w-4.5 h-4.5 mt-1" />
                                            <div><b className="text-[14px]  flex items-center gap-2"><BookOpen className="w-4 h-4"/>{c.nombre}</b></div>
                                        </label>
                                    );
                                })}
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-[#F7F7F6] dark:bg-[#1B1F1C] border rounded-[10px]">
                                <span className="font-semibold text-[14px]">Estado al guardar:</span>
                                <select value={wizardData.estado} onChange={e => setWizardData({...wizardData, estado: e.target.value as any})} className="flex-1 px-3 py-2 rounded-[8px] text-[#1F2328] border outline-none font-bold">
                                    <option value="Activa">Activar y Publicar</option>
                                    <option value="Borrador">Mantener en Borrador</option>
                                </select>
                            </label>
                        </div>
                    )}
                </div>

                {/* FOOTER BOTONES */}
                <footer className="px-8 py-5 border-t border-[#E9E9E7] bg-[#F7F7F6] dark:bg-[#1B1F1C] flex justify-between gap-4">
                    <button onClick={handleClose} className="px-5 py-2.5 rounded-[10px] border bg-white font-medium text-[#6B7280] dark:text-[#1F2328]">Salir</button>
                    
                    <div className="flex gap-3">
                        <button disabled={step === 1} onClick={() => setStep(s => s-1 as 1|2|3)} className="px-5 py-2.5 rounded-[10px] border dark:bg-[#1B1F1C] bg-white font-semibold flex gap-2 items-center disabled:opacity-50"><ArrowLeft className="w-4 h-4 "/>Anterior</button>
                        
                        {step < 3 ? (
                            <button onClick={handleNext} disabled={isSavingDraft} className="px-5 py-2.5 rounded-[10px] bg-[#2F6F5E] text-white font-semibold flex gap-2 items-center disabled:opacity-50">Siguiente <ArrowRight className="w-4 h-4"/></button>
                        ) : (
                            <button onClick={handleFinish} disabled={isSubmitting} className="px-5 py-2.5 rounded-[10px] bg-[#2F6F5E] text-white font-semibold flex gap-2 items-center"><CheckCircle2 className="w-5 h-5"/>{isSubmitting ? 'Guardando...' : 'Finalizar'}</button>
                        )}
                    </div>
                </footer>
            </div>
            {toastMsg && <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#1F2328] text-white px-5 py-3 rounded-[10px] shadow-lg text-[14px] font-medium">{toastMsg}</div>}
        </AppLayout>
    );
}