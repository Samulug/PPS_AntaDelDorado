import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
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
    Upload,
} from 'lucide-react';

export default function UpdateCurso({ cursoEditable, cursosDisponibles = [] }: any) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [reqSearch, setReqSearch] = useState('');

    // Extraer módulos y cuestionario existentes del cursoEditable
    const { initialModulos, initialCuestionario } = useMemo(() => {
        const mods: any[] = [];
        let quizEncontrado: any = null;

        (cursoEditable?.modulos || []).forEach((m: any, idx: number) => {
            const contenidos: any[] = [];
            (m.lecciones || []).forEach((l: any) => {
                if (l.tipo_recurso === 'Cuestionario' && l.cuestionario) {
                    quizEncontrado = l.cuestionario;
                } else {
                    contenidos.push({
                        titulo: l.titulo,
                        tipo_recurso:
                            l.tipo_recurso === 'Video' ? 'Video' : 'Presentacion_Filminas',
                        archivo_nombre: l.id_sharepoint_item || 'Archivo_Adjunto.pptx',
                    });
                }
            });

            mods.push({
                titulo: m.titulo || `Módulo ${idx + 1}`,
                dia_liberacion: m.dia_liberacion || idx + 1,
                contenidos,
            });
        });

        if (mods.length === 0) {
            mods.push({
                titulo: 'Módulo 1',
                dia_liberacion: 1,
                contenidos: [],
            });
        }

        const quiz = quizEncontrado
            ? {
                  puntaje_min_aprobacion: quizEncontrado.puntaje_min_aprobacion ?? 70,
                  orden_aleatorio: Boolean(quizEncontrado.orden_aleatorio),
                  cantidad_preguntas_mostrar: quizEncontrado.cantidad_preguntas_mostrar ?? 1,
                  preguntas:
                      quizEncontrado.preguntas && quizEncontrado.preguntas.length > 0
                          ? quizEncontrado.preguntas.map((p: any) => ({
                                enunciado: p.enunciado,
                                explicacion_refuerzo: p.explicacion_refuerzo || '',
                                opciones:
                                    p.opciones && p.opciones.length >= 2
                                        ? p.opciones.map((o: any) => ({
                                              texto_opcion: o.texto_opcion,
                                              es_correcta: Boolean(o.es_correcta),
                                          }))
                                        : [
                                              { texto_opcion: '', es_correcta: true },
                                              { texto_opcion: '', es_correcta: false },
                                          ],
                            }))
                          : [
                                {
                                    enunciado: '',
                                    explicacion_refuerzo: '',
                                    opciones: [
                                        { texto_opcion: '', es_correcta: true },
                                        { texto_opcion: '', es_correcta: false },
                                    ],
                                },
                            ],
              }
            : {
                  puntaje_min_aprobacion: 70,
                  orden_aleatorio: true,
                  cantidad_preguntas_mostrar: 1,
                  preguntas: [
                      {
                          enunciado: '',
                          explicacion_refuerzo: '',
                          opciones: [
                              { texto_opcion: '', es_correcta: true },
                              { texto_opcion: '', es_correcta: false },
                          ],
                      },
                  ],
              };

        return { initialModulos: mods, initialCuestionario: quiz };
    }, [cursoEditable]);

    const [wizardData, setWizardData] = useState({
        id_curso: cursoEditable.id_curso,
        nombre: cursoEditable.nombre || '',
        descripcion: cursoEditable.descripcion || '',
        tiempo_vigencia: cursoEditable.tiempo_vigencia
            ? String(cursoEditable.tiempo_vigencia).slice(0, 10)
            : '',
        estado_curso: (cursoEditable.estado_curso || 'Activo') as
            | 'Activo'
            | 'Borrador'
            | 'Inactivo',
        id_curso_req: cursoEditable.id_curso_req ?? null,
        modulos: initialModulos,
        cuestionario: initialCuestionario,
    });

    const triggerToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3200);
    };

    const handleClose = () => router.visit(`/cursos/${cursoEditable.id_curso}`);

    // Funciones de edición de Módulos y Cuestionario
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
            modulos: prev.modulos.filter((_: any, i: number) => i !== mIdx),
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
            copia[mIdx] = {
                ...copia[mIdx],
                contenidos: [
                    ...copia[mIdx].contenidos,
                    {
                        titulo:
                            tipo === 'Video'
                                ? 'Nuevo Video de Capacitación'
                                : 'Nueva Presentación PowerPoint',
                        tipo_recurso: tipo,
                        archivo_nombre:
                            tipo === 'Video' ? 'Video_Seguridad.mp4' : 'Diapositivas.pptx',
                    },
                ],
            };
            return { ...prev, modulos: copia };
        });
    };

    const updateContenido = (mIdx: number, cIdx: number, field: string, val: string) => {
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
                contenidos: copia[mIdx].contenidos.filter((_: any, i: number) => i !== cIdx),
            };
            return { ...prev, modulos: copia };
        });
    };

    const addPregunta = () => {
        setWizardData((prev) => {
            const nuevas = [
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
                    preguntas: nuevas,
                    cantidad_preguntas_mostrar: nuevas.length,
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
            const nuevas = prev.cuestionario.preguntas.filter((_: any, i: number) => i !== pIdx);
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
            return { ...prev, cuestionario: { ...prev.cuestionario, preguntas } };
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
        if (wizardData.cuestionario.preguntas[pIdx].opciones.length <= 2) {
            triggerToast('Cada pregunta debe tener al menos 2 opciones.');
            return;
        }
        setWizardData((prev) => {
            const preguntas = [...prev.cuestionario.preguntas];
            const nuevasOpciones = preguntas[pIdx].opciones.filter(
                (_: any, i: number) => i !== oIdx
            );
            if (!nuevasOpciones.some((o: any) => o.es_correcta)) {
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
            const opciones = preguntas[pIdx].opciones.map((op: any, i: number) => ({
                ...op,
                es_correcta: i === oIdx,
            }));
            preguntas[pIdx] = { ...preguntas[pIdx], opciones };
            return { ...prev, cuestionario: { ...prev.cuestionario, preguntas } };
        });
    };

    const handleFinish = (e: React.FormEvent) => {
        e.preventDefault();
        if (!wizardData.nombre.trim() || !wizardData.tiempo_vigencia) {
            setStep(1);
            triggerToast('Completá el nombre y la fecha de vencimiento.');
            return;
        }
        setIsSubmitting(true);
        router.put(`/cursos/${wizardData.id_curso}`, { ...wizardData }, {
            onError: () => {
                setIsSubmitting(false);
                triggerToast('Error al actualizar el curso.');
            },
        });
    };

    const filteredRequisitos = useMemo(() => {
        const q = reqSearch.toLowerCase().trim();
        return cursosDisponibles.filter((c: any) => !q || c.nombre.toLowerCase().includes(q));
    }, [cursosDisponibles, reqSearch]);

    return (
        <AppLayout
            title={`Editar ${wizardData.nombre}`}
            breadcrumbs={[
                { title: 'Cursos y contenido', href: '/cursos' },
                { title: wizardData.nombre, href: `/cursos/${wizardData.id_curso}` },
                { title: 'Editar' },
            ]}
        >
            <Head title={`Editar ${wizardData.nombre} · Panel de RRHH`} />

            <div className="w-full max-w-[840px] mx-auto bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-sm flex flex-col min-h-[calc(100vh-140px)]">
                
                {/* HEADER COMPACTO CON SALTO LIBRE */}
                <header className="px-8 py-5 border-b border-[#E9E9E7] dark:border-[#2A302B] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-9 h-9 grid place-items-center rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] text-[#6B7280] cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-[18px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                Edición de curso
                            </h2>
                            <span className="text-[12px] text-[#6B7280] flex items-center gap-1 mt-0.5 font-medium">
                                <Save className="w-3 h-3 text-[#2F6F5E]" />
                                Navegación libre entre secciones habilitada
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
                            return (
                                <button
                                    key={item.s}
                                    type="button"
                                    onClick={() => setStep(item.s as 1 | 2 | 3)}
                                    className={`px-3 py-1.5 rounded-[8px] border text-[13px] font-semibold flex items-center gap-2 cursor-pointer ${
                                        active
                                            ? 'border-[#2F6F5E] bg-[#EDF4F1] text-[#2F6F5E]'
                                            : done
                                            ? 'border-[#2F7D4F]/40 bg-[#2F7D4F]/10 text-[#2F7D4F]'
                                            : 'border-[#E9E9E7] text-[#6B7280] bg-white'
                                    }`}
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

                {/* CUERPO INTERACTIVO */}
                <div className="flex-1 p-8 md:p-10 overflow-y-auto">
                    {step === 1 && (
                        <div className="grid gap-6 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="grid gap-2 text-[14px] font-medium">
                                    Nombre del curso
                                    <input
                                        type="text"
                                        required
                                        value={wizardData.nombre}
                                        onChange={(e) =>
                                            setWizardData({ ...wizardData, nombre: e.target.value })
                                        }
                                        className="px-4 py-2.5 border border-[#E9E9E7] rounded-[10px] text-[15px]"
                                    />
                                </label>

                                <label className="grid gap-2 text-[14px] font-medium">
                                    Fecha de vencimiento
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
                                        className="px-4 py-2.5 border border-[#E9E9E7] rounded-[10px] text-[15px]"
                                    />
                                </label>
                            </div>

                            <label className="grid gap-2 text-[14px] font-medium">
                                Descripción
                                <textarea
                                    rows={2}
                                    value={wizardData.descripcion}
                                    onChange={(e) =>
                                        setWizardData({ ...wizardData, descripcion: e.target.value })
                                    }
                                    className="px-4 py-2.5 border border-[#E9E9E7] rounded-[10px] text-[14px]"
                                />
                            </label>

                            <div className="flex flex-col gap-3">
                                <h4 className="text-[15px] font-semibold m-0">
                                    Curso requerido para desbloquear este curso
                                </h4>
                                <input
                                    type="search"
                                    value={reqSearch}
                                    onChange={(e) => setReqSearch(e.target.value)}
                                    placeholder="Buscar curso requisito..."
                                    className="h-[38px] px-3.5 py-1.5 border border-[#E9E9E7] rounded-[8px] text-[14px]"
                                />

                                <div className="max-h-[190px] overflow-y-auto border border-[#E9E9E7] rounded-[10px] p-3 grid gap-2">
                                    <label
                                        className={`flex items-center gap-3 p-2.5 rounded-[8px] border cursor-pointer text-[14px] ${
                                            wizardData.id_curso_req === null
                                                ? 'border-[#2F6F5E] bg-[#EDF4F1] font-semibold text-[#2F6F5E]'
                                                : 'border-[#E9E9E7]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            checked={wizardData.id_curso_req === null}
                                            onChange={() =>
                                                setWizardData({ ...wizardData, id_curso_req: null })
                                            }
                                            className="accent-[#2F6F5E]"
                                        />
                                        <span>Sin curso previo requerido</span>
                                    </label>

                                    {filteredRequisitos.map((req: any) => (
                                        <label
                                            key={req.id_curso}
                                            className={`flex items-center gap-3 p-2.5 rounded-[8px] border cursor-pointer text-[14px] ${
                                                wizardData.id_curso_req === req.id_curso
                                                    ? 'border-[#2F6F5E] bg-[#EDF4F1] font-semibold text-[#2F6F5E]'
                                                    : 'border-[#E9E9E7]'
                                            }`}
                                        >
                                            <input
                                                type="radio"
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
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid gap-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[20px] font-bold m-0">
                                    Módulos y Contenido (PowerPoint / Video)
                                </h3>
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
                                {wizardData.modulos.map((mod: any, mIdx: number) => (
                                    <div
                                        key={mIdx}
                                        className="border border-[#E9E9E7] rounded-[12px] p-5 bg-[#F7F7F6]/50 grid gap-4"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 flex-1">
                                                <span className="px-2.5 py-1 rounded-[6px] bg-[#2F6F5E] text-white text-[12px] font-bold">
                                                    Módulo {mIdx + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={mod.titulo}
                                                    onChange={(e) =>
                                                        updateModuloTitulo(mIdx, e.target.value)
                                                    }
                                                    className="w-full px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] bg-white font-semibold text-[15px]"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeModulo(mIdx)}
                                                className="p-2 text-[#B3372B] cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="grid gap-2.5">
                                            {mod.contenidos.map((cont: any, cIdx: number) => (
                                                <div
                                                    key={cIdx}
                                                    className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto_auto] items-center gap-2.5 bg-white p-3 rounded-[8px] border border-[#E9E9E7]"
                                                >
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#EDF4F1] text-[#2F6F5E]">
                                                        {cont.tipo_recurso === 'Video' ? (
                                                            <>
                                                                <Video className="h-3.5 w-3.5" />
                                                                Video
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Presentation className="h-3.5 w-3.5" />
                                                                PowerPoint
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
                                                        className="px-3 py-1.5 rounded-[6px] border border-[#E9E9E7] text-[14px]"
                                                    />

                                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#E9E9E7] bg-[#F7F7F6] text-[12px] cursor-pointer truncate max-w-[200px]">
                                                        <Upload className="h-3.5 w-3.5 text-[#2F6F5E] shrink-0" />
                                                        <span className="truncate">
                                                            {cont.archivo_nombre}
                                                        </span>
                                                        <input
                                                            type="file"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    updateContenido(
                                                                        mIdx,
                                                                        cIdx,
                                                                        'archivo_nombre',
                                                                        file.name
                                                                    );
                                                                }
                                                            }}
                                                            className="hidden"
                                                        />
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeContenido(mIdx, cIdx)}
                                                        className="p-1.5 text-[#6B7280] hover:text-[#B3372B] cursor-pointer"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    addContenido(mIdx, 'Presentacion_Filminas')
                                                }
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] bg-white text-[13px] font-medium cursor-pointer"
                                            >
                                                <Presentation className="h-4 w-4 text-[#B5651D]" />
                                                + PowerPoint
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addContenido(mIdx, 'Video')}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] bg-white text-[13px] font-medium cursor-pointer"
                                            >
                                                <Video className="h-4 w-4 text-[#2F6F5E]" />
                                                + Video
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="grid gap-6 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F7F7F6] p-4 rounded-[12px] border border-[#E9E9E7]">
                                <label className="grid gap-1.5 text-[13px] font-medium text-[#6B7280]">
                                    Puntaje mínimo (%)
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
                                        className="px-3 py-1.5 rounded-[8px] border bg-white text-[15px] font-bold"
                                    />
                                </label>

                                <label className="grid gap-1.5 text-[13px] font-medium text-[#6B7280]">
                                    Preguntas a mostrar (de{' '}
                                    {wizardData.cuestionario.preguntas.length})
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
                                        className="px-3 py-1.5 rounded-[8px] border bg-white text-[15px] font-bold"
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
                                    <span className="text-[14px] font-semibold">
                                        Mezclar preguntas (Shuffle)
                                    </span>
                                </label>
                            </div>

                            <div className="grid gap-4">
                                {wizardData.cuestionario.preguntas.map(
                                    (preg: any, pIdx: number) => (
                                        <div
                                            key={pIdx}
                                            className="border-l-4 border-l-[#2F6F5E] border border-[#E9E9E7] rounded-[10px] p-4 bg-white grid gap-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[13px] font-bold text-[#2F6F5E]">
                                                    Pregunta #{pIdx + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removePregunta(pIdx)}
                                                    className="text-[12px] text-[#B3372B] hover:underline cursor-pointer"
                                                >
                                                    Quitar pregunta
                                                </button>
                                            </div>

                                            <input
                                                type="text"
                                                value={preg.enunciado}
                                                onChange={(e) =>
                                                    updatePreguntaEnunciado(pIdx, e.target.value)
                                                }
                                                className="px-3.5 py-2 rounded-[8px] border bg-[#F7F7F6] text-[14.5px] font-medium"
                                            />

                                            <div className="grid gap-2 pl-2">
                                                {preg.opciones.map((op: any, oIdx: number) => (
                                                    <div
                                                        key={oIdx}
                                                        className="flex items-center gap-2.5"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`edit_correcta_${pIdx}`}
                                                            checked={op.es_correcta}
                                                            onChange={() =>
                                                                markOpcionCorrecta(pIdx, oIdx)
                                                            }
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
                                                            className={`flex-1 px-3 py-1.5 rounded-[8px] border text-[14px] ${
                                                                op.es_correcta
                                                                    ? 'border-[#2F6F5E] bg-[#EDF4F1]/60 font-medium'
                                                                    : 'border-[#E9E9E7]'
                                                            }`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOpcion(pIdx, oIdx)}
                                                            className="p-1 text-[#6B7280] hover:text-[#B3372B] cursor-pointer"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => addOpcion(pIdx)}
                                                className="justify-self-start text-[13px] font-medium text-[#2F6F5E] hover:underline cursor-pointer"
                                            >
                                                + Añadir opción
                                            </button>
                                        </div>
                                    )
                                )}

                                <button
                                    type="button"
                                    onClick={addPregunta}
                                    className="justify-self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] border border-[#2F6F5E] text-[#2F6F5E] text-[13.5px] font-semibold cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Añadir otra pregunta
                                </button>
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-[#F7F7F6] border rounded-[10px]">
                                <span className="font-semibold text-[14px]">Estado al guardar:</span>
                                <select
                                    value={wizardData.estado_curso}
                                    onChange={(e) =>
                                        setWizardData({
                                            ...wizardData,
                                            estado_curso: e.target.value as any,
                                        })
                                    }
                                    className="flex-1 px-3 py-2 rounded-[8px] border bg-white font-bold"
                                >
                                    <option value="Activo">Activo</option>
                                    <option value="Borrador">Borrador</option>
                                    <option value="Inactivo">Inactivo</option>
                                </select>
                            </label>
                        </div>
                    )}
                </div>

                <footer className="px-8 py-5 border-t border-[#E9E9E7] bg-[#F7F7F6] flex justify-between gap-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-[10px] border bg-white font-medium text-[#6B7280] cursor-pointer"
                    >
                        Cancelar
                    </button>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            disabled={step === 1}
                            onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                            className="px-5 py-2.5 rounded-[10px] border bg-white font-semibold flex gap-2 items-center disabled:opacity-50 cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Anterior
                        </button>

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
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
                                className="px-5 py-2.5 rounded-[10px] bg-[#2F6F5E] text-white font-semibold flex gap-2 items-center cursor-pointer"
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