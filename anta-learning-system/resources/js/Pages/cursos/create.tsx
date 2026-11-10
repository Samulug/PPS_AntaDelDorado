import React, { useState, useEffect, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/app-layout';
import ModalPrevisualizadorMultimedia from '@/Components/ModalPrevisualizadorMultimedia';
import {
    Save,
    X,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Plus,
    Trash2,
    Video,
    Presentation,
    Clock,
    Upload,
    Play,
    FolderOpen,
} from 'lucide-react';

interface CursoReqItem {
    id_curso: number;
    nombre: string;
}

interface ContenidoItem {
    titulo: string;
    tipo_recurso: 'Video' | 'Presentacion_Filminas';
    archivo_nombre: string;
    url_streaming?: string | null;
    peso_mb?: number;
}

interface ModuloForm {
    titulo: string;
    dia_liberacion: number;
    contenidos: ContenidoItem[];
}

interface OpcionForm {
    texto_opcion: string;
    es_correcta: boolean;
}

interface PreguntaForm {
    enunciado: string;
    explicacion_refuerzo: string;
    opciones: OpcionForm[];
}

interface CuestionarioForm {
    puntaje_min_aprobacion: number;
    orden_aleatorio: boolean;
    cantidad_preguntas_mostrar: number;
    preguntas: PreguntaForm[];
}

interface CursoWizardData {
    id_curso: number | null;
    nombre: string;
    descripcion: string;
    tiempo_vigencia: string;
    estado_curso: 'Activo' | 'Borrador' | 'Inactivo';
    id_curso_req: number | null;
    modulos: ModuloForm[];
    cuestionario: CuestionarioForm;
    [key: string]: any;
}

interface Props {
    cursosDisponibles: CursoReqItem[];
    repositorioSharepoint?: any[];
}

const DRAFT_STORAGE_KEY = 'anta_curso_create_draft_v1';

export default function CreateCurso({ cursosDisponibles = [], repositorioSharepoint = [] }: Props) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Buscador de curso correlativo en Sección 1
    const [reqSearch, setReqSearch] = useState('');

    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [repoCatalogo, setRepoCatalogo] = useState<any[]>(repositorioSharepoint);
    const [previewItem, setPreviewItem] = useState<ContenidoItem | null>(null);


    // Estado inicial con 1 Módulo y 1 Pregunta por defecto
    const [wizardData, setWizardData] = useState<CursoWizardData>({
        id_curso: null,
        nombre: '',
        descripcion: '',
        tiempo_vigencia: '',
        estado_curso: 'Activo',
        id_curso_req: null,
        modulos: [
            {
                titulo: 'Módulo 1: Introducción y Conceptos Clave',
                dia_liberacion: 1,
                contenidos: [
                    {
                        titulo: 'Presentación Inicial del Módulo',
                        tipo_recurso: 'Presentacion_Filminas',
                        archivo_nombre: 'Capacitacion_Inicial.pptx',
                    },
                ],
            },
        ],
        cuestionario: {
            puntaje_min_aprobacion: 70,
            orden_aleatorio: true,
            cantidad_preguntas_mostrar: 1,
            preguntas: [
                {
                    enunciado: '',
                    explicacion_refuerzo: 'Repasá las filminas del Módulo 1.',
                    opciones: [
                        { texto_opcion: '', es_correcta: true },
                        { texto_opcion: '', es_correcta: false },
                    ],
                },
            ],
        },
    });

const triggerToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3200);
    };

    // Limpiar cualquier residuo viejo que haya quedado en el navegador
    useEffect(() => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
            // Ignorar
        }
    }, []);

    // Sincronizar Borrador con el Backend (Supabase) recibiendo el estado más reciente
    const syncDraft = async (customData?: CursoWizardData): Promise<number | null> => {
        const payload = customData ?? wizardData;

        // Evitamos crear un borrador si el usuario abrió la pantalla y salió sin escribir nada ni subir archivos
        const tieneContenidoSubido = payload.modulos.some((m) =>
            m.contenidos.some(
                (c) =>
                    c.archivo_nombre !== 'Capacitacion_Inicial.pptx' &&
                    c.archivo_nombre !== 'Video_Seguridad.mp4' &&
                    c.archivo_nombre !== 'Diapositivas_EPP.pptx'
            )
        );

        if (!payload.nombre.trim() && !tieneContenidoSubido && !payload.id_curso) {
            return null;
        }

        setIsSavingDraft(true);
        try {
            const res = await axios.post('/cursos/borrador', payload);
            if (res.data?.id_curso) {
                setWizardData((prev) => ({
                    ...prev,
                    id_curso: res.data.id_curso,
                    nombre: prev.nombre.trim() ? prev.nombre : res.data.nombre,
                }));
                setLastSavedTime(res.data.updated_at);
                return res.data.id_curso;
            }
        } catch (error) {
            console.error('Error guardando borrador:', error);
            triggerToast('No se pudo guardar el borrador en el servidor.');
        } finally {
            setIsSavingDraft(false);
        }
        return payload.id_curso;
    };

    const handleFileUpload = async (mIdx: number, cIdx: number, file: File) => {
        const key = `${mIdx}-${cIdx}`;
        setUploadingKey(key);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('archivo', file);

        try {
            const res = await axios.post('/cursos/multimedia/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        setUploadProgress(
                            Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        );
                    }
                },
            });

            if (res.data?.ok && res.data?.archivo) {
                const subido = res.data.archivo;

                // Construimos el nuevo estado inmediatamente para enviarlo al borrador en BD
                const copiaModulos = [...wizardData.modulos];
                const copiaContenidos = [...copiaModulos[mIdx].contenidos];
                copiaContenidos[cIdx] = {
                    ...copiaContenidos[cIdx],
                    archivo_nombre: subido.id_sharepoint_item,
                    url_streaming: subido.url_streaming,
                    peso_mb: subido.peso_mb,
                };
                copiaModulos[mIdx] = { ...copiaModulos[mIdx], contenidos: copiaContenidos };

                const nuevoWizardData: CursoWizardData = {
                    ...wizardData,
                    modulos: copiaModulos,
                };

                setWizardData(nuevoWizardData);
                setRepoCatalogo((prev) => [subido, ...prev]);

                // Autoguardamos en la BD apenas se sube el video/PDF para que no se pierda el vínculo
                await syncDraft(nuevoWizardData);

                triggerToast(
                    `Archivo "${subido.id_sharepoint_item}" (${subido.peso_mb} MB) subido y guardado en borrador.`
                );
            }
        } catch (err: any) {
            const msg =
                err.response?.data?.message ||
                'Error al subir el archivo. Verificá que sea .mp4 o .pdf (máx. 150MB).';
            triggerToast(msg);
        } finally {
            setUploadingKey(null);
            setUploadProgress(0);
        }
    };

    // =========================================================================
    // MANEJADORES DE MÓDULOS Y ADJUNTOS (SECCIÓN 2)
    // =========================================================================
    const addModulo = () => {
        setWizardData((prev) => ({
            ...prev,
            modulos: [
                ...prev.modulos,
                {
                    titulo: `Módulo ${prev.modulos.length + 1}`,
                    dia_liberacion: prev.modulos.length + 1,
                    contenidos: [],
                },
            ],
        }));
    };

    const removeModulo = (mIdx: number) => {
        if (wizardData.modulos.length <= 1) {
            triggerToast('El curso debe tener al menos 1 módulo.');
            return;
        }
        setWizardData((prev) => ({
            ...prev,
            modulos: prev.modulos.filter((_, i: number) => i !== mIdx),
        }));
    };

    const updateModuloTitulo = (mIdx: number, titulo: string) => {
        setWizardData((prev) => {
            const copia = [...prev.modulos];
            copia[mIdx] = { ...copia[mIdx], titulo };
            return { ...prev, modulos: copia };
        });
    };

    const addContenido = (mIdx: number, tipo: 'Video' | 'Presentacion_Filminas') => {
        setWizardData((prev) => {
            const copia = [...prev.modulos];
            const nuevo: ContenidoItem = {
                titulo: tipo === 'Video' ? 'Nuevo Video de Capacitación' : 'Nueva Presentación PowerPoint',
                tipo_recurso: tipo,
                archivo_nombre: tipo === 'Video' ? 'Video_Seguridad.mp4' : 'Diapositivas_EPP.pptx',
            };
            copia[mIdx] = {
                ...copia[mIdx],
                contenidos: [...copia[mIdx].contenidos, nuevo],
            };
            return { ...prev, modulos: copia };
        });
    };

    const updateContenido = (mIdx: number, cIdx: number, field: keyof ContenidoItem, val: string) => {
        setWizardData((prev) => {
            const copia = [...prev.modulos];
            const contenidos = [...copia[mIdx].contenidos];
            contenidos[cIdx] = { ...contenidos[cIdx], [field]: val };
            copia[mIdx] = { ...copia[mIdx], contenidos };
            return { ...prev, modulos: copia };
        });
    };

    const removeContenido = (mIdx: number, cIdx: number) => {
        setWizardData((prev) => {
            const copia = [...prev.modulos];
            copia[mIdx] = {
                ...copia[mIdx],
                contenidos: copia[mIdx].contenidos.filter((_, i: number) => i !== cIdx),
            };
            return { ...prev, modulos: copia };
        });
    };

    // =========================================================================
    // MANEJADORES DEL CUESTIONARIO (SECCIÓN 3)
    // =========================================================================
    const addPregunta = () => {
        setWizardData((prev) => {
            const nuevasPreguntas: PreguntaForm[] = [
                ...prev.cuestionario.preguntas,
                {
                    enunciado: '',
                    explicacion_refuerzo: 'Repasá el material del curso.',
                    opciones: [
                        { texto_opcion: '', es_correcta: true },
                        { texto_opcion: '', es_correcta: false },
                    ],
                },
            ];
            return {
                ...prev,
                cuestionario: {
                    ...prev.cuestionario,
                    preguntas: nuevasPreguntas,
                    cantidad_preguntas_mostrar: nuevasPreguntas.length,
                },
            };
        });
    };

    const removePregunta = (pIdx: number) => {
        if (wizardData.cuestionario.preguntas.length <= 1) {
            triggerToast('El cuestionario debe tener al menos 1 pregunta.');
            return;
        }
        setWizardData((prev) => {
            const nuevas = prev.cuestionario.preguntas.filter((_, i: number) => i !== pIdx);
            return {
                ...prev,
                cuestionario: {
                    ...prev.cuestionario,
                    preguntas: nuevas,
                    cantidad_preguntas_mostrar: Math.min(
                        prev.cuestionario.cantidad_preguntas_mostrar,
                        nuevas.length
                    ),
                },
            };
        });
    };

    const updatePreguntaEnunciado = (pIdx: number, enunciado: string) => {
        setWizardData((prev) => {
            const preguntas = [...prev.cuestionario.preguntas];
            preguntas[pIdx] = { ...preguntas[pIdx], enunciado };
            return {
                ...prev,
                cuestionario: { ...prev.cuestionario, preguntas },
            };
        });
    };

    const addOpcion = (pIdx: number) => {
        setWizardData((prev) => {
            const preguntas = [...prev.cuestionario.preguntas];
            preguntas[pIdx] = {
                ...preguntas[pIdx],
                opciones: [
                    ...preguntas[pIdx].opciones,
                    { texto_opcion: '', es_correcta: false },
                ],
            };
            return { ...prev, cuestionario: { ...prev.cuestionario, preguntas } };
        });
    };

    const removeOpcion = (pIdx: number, oIdx: number) => {
        const opcionesActuales = wizardData.cuestionario.preguntas[pIdx].opciones;
        if (opcionesActuales.length <= 2) {
            triggerToast('Cada pregunta debe tener al menos 2 respuestas posibles.');
            return;
        }
        setWizardData((prev) => {
            const preguntas = [...prev.cuestionario.preguntas];
            let nuevasOpciones = preguntas[pIdx].opciones.filter((_, i: number) => i !== oIdx);
            if (!nuevasOpciones.some((o) => o.es_correcta)) {
                nuevasOpciones[0].es_correcta = true;
            }
            preguntas[pIdx] = { ...preguntas[pIdx], opciones: nuevasOpciones };
            return { ...prev, cuestionario: { ...prev.cuestionario, preguntas } };
        });
    };

    const updateOpcionTexto = (pIdx: number, oIdx: number, texto_opcion: string) => {
        setWizardData((prev) => {
            const preguntas = [...prev.cuestionario.preguntas];
            const opciones = [...preguntas[pIdx].opciones];
            opciones[oIdx] = { ...opciones[oIdx], texto_opcion };
            preguntas[pIdx] = { ...preguntas[pIdx], opciones };
            return { ...prev, cuestionario: { ...prev.cuestionario, preguntas } };
        });
    };

    const markOpcionCorrecta = (pIdx: number, oIdx: number) => {
        setWizardData((prev) => {
            const preguntas = [...prev.cuestionario.preguntas];
            const opciones = preguntas[pIdx].opciones.map((op, i: number) => ({
                ...op,
                es_correcta: i === oIdx,
            }));
            preguntas[pIdx] = { ...preguntas[pIdx], opciones };
            return { ...prev, cuestionario: { ...prev.cuestionario, preguntas } };
        });
    };

    // =========================================================================
    // NAVEGACIÓN ENTRE SECCIONES Y GUARDADO FINAL
    // =========================================================================
    const handleNext = async () => {
        if (step === 1) {
            if (!wizardData.nombre.trim() || !wizardData.tiempo_vigencia) {
                triggerToast('Completá el nombre del curso y su fecha de vencimiento.');
                return;
            }
            await syncDraft(wizardData);
            setStep(2);
        } else if (step === 2) {
            const sinTitulo = wizardData.modulos.some((m) => !m.titulo.trim());
            if (sinTitulo) {
                triggerToast('Todos los módulos deben tener un título.');
                return;
            }
            await syncDraft(wizardData);
            setStep(3);
        }
    };

    const handleClose = async () => {
        await syncDraft(wizardData);
        router.visit('/cursos', {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handleFinish = (e: React.FormEvent) => {
        e.preventDefault();

        if (!wizardData.nombre.trim() || !wizardData.tiempo_vigencia) {
            setStep(1);
            triggerToast('Completá el nombre y fecha de vencimiento en la Sección 1.');
            return;
        }

        const pregIncompleta = wizardData.cuestionario.preguntas.some(
            (p) => !p.enunciado.trim() || p.opciones.some((o) => !o.texto_opcion.trim())
        );
        if (pregIncompleta) {
            setStep(3);
            triggerToast('Completá el texto de todas las preguntas y sus respuestas.');
            return;
        }

        setIsSubmitting(true);
        router.post('/cursos', { ...wizardData }, {
            onError: () => {
                setIsSubmitting(false);
                triggerToast('Error al guardar el curso. Revisá los campos.');
            },
        });
    };

    const filteredRequisitos = useMemo(() => {
        const q = reqSearch.toLowerCase().trim();
        return cursosDisponibles.filter((c) => !q || c.nombre.toLowerCase().includes(q));
    }, [cursosDisponibles, reqSearch]);

    return (
        <AppLayout
            title="Nuevo Curso"
            breadcrumbs={[
                { title: 'Cursos y contenido', href: '/cursos' },
                { title: 'Nuevo curso' },
            ]}
        >
            <Head title="Nuevo Curso · Panel de RRHH" />

        

            <div className="w-full max-w-[840px] mx-auto bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-sm flex flex-col min-h-[calc(100vh-140px)]">
                
                {/* HEADER COMPACTO Y STEPPER */}
                <header className="px-8 py-5 border-b border-[#E9E9E7] dark:border-[#2A302B] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            title="Guardar borrador y salir"
                            className="w-9 h-9 grid place-items-center rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] text-[#6B7280] cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-[18px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                Crear nuevo curso
                            </h2>
                            <span className="text-[12px] text-[#6B7280] flex items-center gap-1 mt-0.5 font-medium">
                                <Save className="w-3 h-3 text-[#2F6F5E]" />
                                {isSavingDraft
                                    ? 'Guardando borrador...'
                                    : lastSavedTime
                                    ? `Borrador guardado a las ${lastSavedTime}`
                                    : 'Autoguardado de borrador activo'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {[
                            { s: 1, l: 'Datos y Vigencia' },
                            { s: 2, l: `Módulos (${wizardData.modulos.length})` },
                            { s: 3, l: `Cuestionario (${wizardData.cuestionario.preguntas.length})` },
                        ].map((item) => {
                            const active = step === item.s;
                            const done = step > item.s;
                            const unlocked =
                                done ||
                                active ||
                                (item.s === 2 &&
                                    Boolean(wizardData.nombre.trim()) &&
                                    Boolean(wizardData.tiempo_vigencia)) ||
                                (item.s === 3 &&
                                    Boolean(wizardData.nombre.trim()) &&
                                    Boolean(wizardData.tiempo_vigencia) &&
                                    wizardData.modulos.length > 0);

                            return (
                                <button
                                    key={item.s}
                                    type="button"
                                    disabled={!unlocked}
                                    onClick={() => setStep(item.s as 1 | 2 | 3)}
                                    className={`px-3 py-1.5 rounded-[8px] border text-[13px] font-semibold flex items-center gap-2 ${
                                        active
                                            ? 'border-[#2F6F5E] bg-[#EDF4F1] text-[#2F6F5E]'
                                            : done
                                            ? 'border-[#2F7D4F]/40 bg-[#2F7D4F]/10 text-[#2F7D4F]'
                                            : 'border-[#E9E9E7] text-[#6B7280] bg-white'
                                    } disabled:opacity-50 cursor-pointer`}
                                >
                                    <span
                                        className={`w-5 h-5 grid place-items-center rounded-full text-[11px] text-white ${
                                            active
                                                ? 'bg-[#2F6F5E]'
                                                : done
                                                ? 'bg-[#2F7D4F]'
                                                : 'bg-[#6B7280]'
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

                {/* CUERPO INTERACTIVO POR SECCIÓN */}
                <div className="flex-1 p-8 md:p-10 overflow-y-auto">
                    
                    {/* SECCIÓN 1: NOMBRE, VENCIMIENTO Y CURSO REQUERIDO */}
                    {step === 1 && (
                        <div className="grid gap-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                    Sección 1: Identidad, Vencimiento y Correlatividad
                                </h3>
                                <p className="text-[#6B7280] text-[14px] mt-1 mb-0">
                                    Definí los datos principales del curso y si requiere aprobar otro curso previamente.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                    Nombre del curso
                                    <input
                                        type="text"
                                        required
                                        value={wizardData.nombre}
                                        onChange={(e) =>
                                            setWizardData({ ...wizardData, nombre: e.target.value })
                                        }
                                        placeholder="Ej. Uso Seguro de Maquinaria Agrícola"
                                        className="px-4 py-2.5 border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px] text-[15px] bg-white dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                                    />
                                </label>

                                <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                    Fecha de vencimiento / vigencia
                                    <input
                                        type="date"
                                        required
                                        value={wizardData.tiempo_vigencia}
                                        onChange={(e) =>
                                            setWizardData({
                                                ...wizardData,
                                                tiempo_vigencia: e.target.value,
                                            })
                                        }
                                        className="px-4 py-2.5 border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px] text-[15px] bg-white dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                                    />
                                </label>
                            </div>

                            <label className="grid gap-2 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                Descripción breve
                                <textarea
                                    rows={2}
                                    value={wizardData.descripcion}
                                    onChange={(e) =>
                                        setWizardData({ ...wizardData, descripcion: e.target.value })
                                    }
                                    placeholder="Objetivo pedagógico del curso para el operario..."
                                    className="px-4 py-2.5 border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px] text-[14px] bg-white dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                                />
                            </label>

                            {/* Selección por búsqueda del Curso Requerido */}
                            <div className="flex flex-col gap-3">
                                <div className="shrink-0">
                                    <h4 className="text-[15px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                        Curso requerido para desbloquear este curso (Correlatividad)
                                    </h4>
                                    <p className="text-[13px] text-[#6B7280] m-0">
                                        Buscá y seleccioná un curso si el colaborador debe completarlo antes de acceder.
                                    </p>
                                </div>

                                <input
                                    type="search"
                                    value={reqSearch}
                                    onChange={(e) => setReqSearch(e.target.value)}
                                    placeholder="Buscar curso requisito por nombre..."
                                    className="shrink-0 h-[38px] px-3.5 py-1.5 border border-[#E9E9E7] dark:border-[#2A302B] rounded-[8px] text-[14px] bg-[#F7F7F6] dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                                />

                                <div className="max-h-[190px] overflow-y-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px] p-3 grid gap-2 content-start">
                                    <label
                                        className={`flex items-center gap-3 p-2.5 rounded-[8px] border cursor-pointer text-[14px] ${
                                            wizardData.id_curso_req === null
                                                ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] font-semibold text-[#2F6F5E]'
                                                : 'border-[#E9E9E7] dark:border-[#2A302B]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="curso_req"
                                            checked={wizardData.id_curso_req === null}
                                            onChange={() =>
                                                setWizardData({ ...wizardData, id_curso_req: null })
                                            }
                                            className="accent-[#2F6F5E]"
                                        />
                                        <span>Sin curso previo requerido (Acceso libre desde el ingreso)</span>
                                    </label>

                                    {filteredRequisitos.length > 0 ? (
                                        filteredRequisitos.map((req) => (
                                            <label
                                                key={req.id_curso}
                                                className={`flex items-center gap-3 p-2.5 rounded-[8px] border cursor-pointer text-[14px] ${
                                                    wizardData.id_curso_req === req.id_curso
                                                        ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] font-semibold text-[#2F6F5E]'
                                                        : 'border-[#E9E9E7] dark:border-[#2A302B]'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="curso_req"
                                                    checked={wizardData.id_curso_req === req.id_curso}
                                                    onChange={() =>
                                                        setWizardData({
                                                            ...wizardData,
                                                            id_curso_req: req.id_curso,
                                                        })
                                                    }
                                                    className="accent-[#2F6F5E]"
                                                />
                                                <span>{req.nombre}</span>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="py-4 text-center text-[13px] text-[#6B7280]">
                                            No se encontraron cursos con ese nombre.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 2: ESTRUCTURA DE MÓDULOS Y CONTENIDO (POWERPOINT / VIDEO) */}
                    {step === 2 && (
                        <div className="grid gap-6 animate-in fade-in duration-200">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                        Sección 2: Estructura de Módulos y Contenido
                                    </h3>
                                    <p className="text-[#6B7280] text-[14px] mt-1 mb-0">
                                        Organizá los módulos del curso y adjuntá presentaciones PowerPoint o Videos.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={addModulo}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#2F6F5E] text-white text-[13.5px] font-semibold cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Agregar módulo
                                </button>
                            </div>

                            <div className="grid gap-5">
                                {wizardData.modulos.map((mod, mIdx) => (
                                    <div
                                        key={mIdx}
                                        className="border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-5 bg-[#F7F7F6]/50 dark:bg-[#141714]/50 grid gap-4"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 flex-1">
                                                <span className="px-2.5 py-1 rounded-[6px] bg-[#2F6F5E] text-white text-[12px] font-bold shrink-0">
                                                    Módulo {mIdx + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={mod.titulo}
                                                    onChange={(e) =>
                                                        updateModuloTitulo(mIdx, e.target.value)
                                                    }
                                                    placeholder="Título del módulo..."
                                                    className="w-full px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] font-semibold text-[15px]"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removeModulo(mIdx)}
                                                className="p-2 rounded-[8px] text-[#B3372B] hover:bg-[#B3372B]/10 cursor-pointer"
                                                title="Eliminar módulo"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Lista de contenidos adjuntos (Videos / PowerPoints) */}
                                        <div className="grid gap-2.5">
                                            {mod.contenidos.map((cont, cIdx) => {
                                                const isUploadingThis = uploadingKey === `${mIdx}-${cIdx}`;
                                                const repoMatch = repoCatalogo.find(
                                                    (r) => r.id_sharepoint_item === cont.archivo_nombre
                                                );
                                                const resolvedUrl =
                                                    cont.url_streaming || repoMatch?.url_streaming || null;

                                                return (
                                                    <div
                                                        key={cIdx}
                                                        className="grid grid-cols-1 sm:grid-cols-[135px_1fr_auto_auto_auto] items-center gap-2.5 bg-white dark:bg-[#1B1F1C] p-3 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B]"
                                                    >
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]">
                                                            {cont.tipo_recurso === 'Video' ? (
                                                                <>
                                                                    <Video className="h-3.5 w-3.5" />
                                                                    Video (.mp4)
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Presentation className="h-3.5 w-3.5" />
                                                                    PDF / Filminas
                                                                </>
                                                            )}
                                                        </span>

                                                        <input
                                                            type="text"
                                                            value={cont.titulo}
                                                            onChange={(e) =>
                                                                updateContenido(
                                                                    mIdx,
                                                                    cIdx,
                                                                    'titulo',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="Título de la lección..."
                                                            className="px-3 py-1.5 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-transparent text-[14px]"
                                                        />

                                                        {/* Botón de Subida Real desde PC al Repositorio */}
                                                        <label
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border text-[12px] cursor-pointer truncate max-w-[210px] ${
                                                                resolvedUrl
                                                                    ? 'border-[#2F7D4F]/40 bg-[#2F7D4F]/10 text-[#2F7D4F] font-semibold'
                                                                    : 'border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] text-[#1F2328] dark:text-[#ECEFEC]'
                                                            }`}
                                                            title={
                                                                resolvedUrl
                                                                    ? `Subido y verificado: ${cont.archivo_nombre}`
                                                                    : 'Subir archivo desde tu computadora'
                                                            }
                                                        >
                                                            <Upload className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate">
                                                                {isUploadingThis
                                                                    ? `Subiendo ${uploadProgress}%...`
                                                                    : cont.archivo_nombre || 'Subir archivo'}
                                                            </span>
                                                            <input
                                                                type="file"
                                                                disabled={isUploadingThis}
                                                                accept={
                                                                    cont.tipo_recurso === 'Video'
                                                                        ? 'video/mp4,.mp4'
                                                                        : '.pdf,.ppt,.pptx'
                                                                }
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleFileUpload(mIdx, cIdx, file);
                                                                    }
                                                                }}
                                                                className="hidden"
                                                            />
                                                        </label>

                                                        {/* Botón para Probar / Reproducir el archivo subido */}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPreviewItem({
                                                                    ...cont,
                                                                    url_streaming: resolvedUrl,
                                                                })
                                                            }
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border text-[12px] font-medium cursor-pointer ${
                                                                resolvedUrl
                                                                    ? 'border-[#2F6F5E] bg-[#EDF4F1] text-[#2F6F5E]'
                                                                    : 'border-[#E9E9E7] text-[#6B7280] bg-white'
                                                            }`}
                                                            title="Verificar y reproducir archivo"
                                                        >
                                                            <Play className="h-3.5 w-3.5" />
                                                            Probar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => removeContenido(mIdx, cIdx)}
                                                            className="p-1.5 text-[#6B7280] hover:text-[#B3372B] cursor-pointer"
                                                            title="Quitar contenido"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Botones para adjuntar PowerPoint o Video al módulo */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addContenido(mIdx, 'Presentacion_Filminas')
                                                }
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] font-medium hover:border-[#2F6F5E] cursor-pointer"
                                            >
                                                <Presentation className="h-4 w-4 text-[#B5651D]" />
                                                + Adjuntar PowerPoint
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => addContenido(mIdx, 'Video')}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] font-medium hover:border-[#2F6F5E] cursor-pointer"
                                            >
                                                <Video className="h-4 w-4 text-[#2F6F5E]" />
                                                + Adjuntar Video
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 3: CUESTIONARIO (NOTA MÍNIMA, SHUFFLE, BANCO DE PREGUNTAS) */}
                    {step === 3 && (
                        <div className="grid gap-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                    Sección 3: Configuración del Cuestionario
                                </h3>
                                <p className="text-[#6B7280] text-[14px] mt-1 mb-0">
                                    Configurá las reglas de aprobación, orden aleatorio (shuffle) y las preguntas del examen.
                                </p>
                            </div>

                            {/* Reglas del cuestionario */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F7F7F6] dark:bg-[#141714] p-4 rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B]">
                                <label className="grid gap-1.5 text-[13px] font-medium text-[#6B7280]">
                                    Puntaje mínimo de aprobación (%)
                                    <input
                                        type="number"
                                        min={10}
                                        max={100}
                                        value={wizardData.cuestionario.puntaje_min_aprobacion}
                                        onChange={(e) =>
                                            setWizardData({
                                                ...wizardData,
                                                cuestionario: {
                                                    ...wizardData.cuestionario,
                                                    puntaje_min_aprobacion: Number(e.target.value),
                                                },
                                            })
                                        }
                                        className="px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] font-bold text-[#1F2328] dark:text-[#ECEFEC]"
                                    />
                                </label>

                                <label className="grid gap-1.5 text-[13px] font-medium text-[#6B7280]">
                                    Preguntas a mostrar (de {wizardData.cuestionario.preguntas.length}{' '}
                                    creadas)
                                    <input
                                        type="number"
                                        min={1}
                                        max={wizardData.cuestionario.preguntas.length}
                                        value={wizardData.cuestionario.cantidad_preguntas_mostrar}
                                        onChange={(e) =>
                                            setWizardData({
                                                ...wizardData,
                                                cuestionario: {
                                                    ...wizardData.cuestionario,
                                                    cantidad_preguntas_mostrar: Math.min(
                                                        wizardData.cuestionario.preguntas.length,
                                                        Math.max(1, Number(e.target.value))
                                                    ),
                                                },
                                            })
                                        }
                                        className="px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] font-bold text-[#1F2328] dark:text-[#ECEFEC]"
                                    />
                                </label>

                                <label className="flex items-center gap-3 pt-4 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={wizardData.cuestionario.orden_aleatorio}
                                        onChange={(e) =>
                                            setWizardData({
                                                ...wizardData,
                                                cuestionario: {
                                                    ...wizardData.cuestionario,
                                                    orden_aleatorio: e.target.checked,
                                                },
                                            })
                                        }
                                        className="accent-[#2F6F5E] w-4.5 h-4.5"
                                    />
                                    <span className="text-[14px] font-semibold text-[#1F2328] dark:text-[#ECEFEC]">
                                        Mezclar preguntas (Shuffle)
                                    </span>
                                </label>
                            </div>

                            {/* Banco de Preguntas */}
                            <div className="grid gap-4">
                                {wizardData.cuestionario.preguntas.map((preg, pIdx) => (
                                    <div
                                        key={pIdx}
                                        className="border-l-4 border-l-[#2F6F5E] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px] p-4 bg-white dark:bg-[#1B1F1C] grid gap-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[13px] font-bold text-[#2F6F5E]">
                                                Pregunta #{pIdx + 1}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removePregunta(pIdx)}
                                                className="text-[12px] text-[#B3372B] hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Quitar pregunta
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            value={preg.enunciado}
                                            onChange={(e) =>
                                                updatePreguntaEnunciado(pIdx, e.target.value)
                                            }
                                            placeholder="Escribí el enunciado de la pregunta..."
                                            className="px-3.5 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] text-[14.5px] font-medium"
                                        />

                                        {/* Opciones de respuesta */}
                                        <div className="grid gap-2 pl-2">
                                            {preg.opciones.map((op, oIdx) => (
                                                <div
                                                    key={oIdx}
                                                    className="flex items-center gap-2.5"
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`correcta_p_${pIdx}`}
                                                        checked={op.es_correcta}
                                                        onChange={() =>
                                                            markOpcionCorrecta(pIdx, oIdx)
                                                        }
                                                        title="Marcar como respuesta correcta"
                                                        className="accent-[#2F6F5E] w-4 h-4 cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={op.texto_opcion}
                                                        onChange={(e) =>
                                                            updateOpcionTexto(
                                                                pIdx,
                                                                oIdx,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder={`Opción ${oIdx + 1}${
                                                            op.es_correcta ? ' (Correcta)' : ''
                                                        }`}
                                                        className={`flex-1 px-3 py-1.5 rounded-[8px] border text-[14px] ${
                                                            op.es_correcta
                                                                ? 'border-[#2F6F5E] bg-[#EDF4F1]/60 dark:bg-[#223029]/50 font-medium'
                                                                : 'border-[#E9E9E7] dark:border-[#2A302B]'
                                                        }`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOpcion(pIdx, oIdx)}
                                                        className="p-1 text-[#6B7280] hover:text-[#B3372B] cursor-pointer"
                                                        title="Eliminar opción"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <button
                                                type="button"
                                                onClick={() => addOpcion(pIdx)}
                                                className="text-[13px] font-medium text-[#2F6F5E] hover:underline cursor-pointer"
                                            >
                                                + Añadir opción de respuesta
                                            </button>
                                            <small className="text-[11.5px] text-[#6B7280]">
                                                Marcá con el círculo la respuesta correcta
                                            </small>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addPregunta}
                                    className="justify-self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] border border-[#2F6F5E] text-[#2F6F5E] text-[13.5px] font-semibold hover:bg-[#EDF4F1] cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Añadir otra pregunta al banco
                                </button>
                            </div>

                            {/* Selector de estado al guardar */}
                            <label className="flex items-center gap-3 p-4 bg-[#F7F7F6] dark:bg-[#141714] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[10px]">
                                <span className="font-semibold text-[14px]">
                                    Estado al finalizar:
                                </span>
                                <select
                                    value={wizardData.estado_curso}
                                    onChange={(e) =>
                                        setWizardData({
                                            ...wizardData,
                                            estado_curso: e.target.value as any,
                                        })
                                    }
                                    className="flex-1 px-3 py-2 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] font-bold text-[14px]"
                                >
                                    <option value="Activo">Activo (Publicar en el catálogo)</option>
                                    <option value="Borrador">Dejar guardado en Borrador</option>
                                    <option value="Inactivo">Guardar como Inactivo</option>
                                </select>
                            </label>
                        </div>
                    )}
                </div>

                {/* FOOTER DEL WIZARD */}
                <footer className="px-8 py-5 border-t border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] flex justify-between gap-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] font-medium text-[#6B7280] cursor-pointer"
                    >
                        Guardar borrador y salir
                    </button>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            disabled={step === 1}
                            onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                            className="px-5 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] font-semibold flex gap-2 items-center disabled:opacity-50 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Anterior
                        </button>

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={isSavingDraft}
                                className="px-5 py-2.5 rounded-[10px] bg-[#2F6F5E] text-white font-semibold flex gap-2 items-center disabled:opacity-50 cursor-pointer"
                            >
                                Siguiente
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleFinish}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-[10px] bg-[#2F6F5E] text-white font-semibold flex gap-2 items-center disabled:opacity-50 cursor-pointer"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                {isSubmitting ? 'Guardando...' : 'Finalizar y Crear Curso'}
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
        <ModalPrevisualizadorMultimedia
            isOpen={Boolean(previewItem)}
            onClose={() => setPreviewItem(null)}
            tituloLeccion={previewItem?.titulo || ''}
            tipoRecurso={previewItem?.tipo_recurso || 'Video'}
            archivoNombre={previewItem?.archivo_nombre || ''}
            urlStreaming={previewItem?.url_streaming || null}
        />
        </AppLayout>
    );
}