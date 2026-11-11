import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@/hooks/use-auth';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/app-layout';
import {
    Search,
    Filter,
    RotateCcw,
    Users,
    Edit3,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertTriangle,
    BookOpen,
    X,
    Save,
} from 'lucide-react';

interface Colaborador {
    id: number;
    nombre_completo: string;
    dni: number | string;
    legajo: number | string;
    rol: 'Operario' | 'Supervisor';
    zona_geografica_establecimient: string;
    centro_costo: string;
    estado_operativo: string;
}

interface CursoSimple {
    id_curso: number;
    nombre: string;
    descripcion?: string;
    tiempo_vigencia?: string;
}

interface ProgresoCursoItem {
    id_progreso: number;
    id_curso: number;
    curso?: CursoSimple;
}

interface Cuadrilla {
    id_cuadrilla: number;
    nombre_cuadrilla: string;
    labor_asociada: string;
    fecha_creacion: string;
    estado: 'Borrador' | 'Activa' | 'Inactiva' | boolean;
    cursos_borrador_json?: number[];
    colaboradores: Colaborador[];
    progresos_cursos?: ProgresoCursoItem[];
}

interface Props {
    cuadrillas: Cuadrilla[];
    users: Colaborador[];
    cursosDisponibles: CursoSimple[];
}

const NODOS = [
    'Las Lajitas',
    'Finca Norte',
    'Finca Valle',
    'Planta de empaque',
    'Anta',
    'Coronel Mollinedo',
    'Laguna Verde',
];
const ROLES_COLAB = ['Operario', 'Supervisor'];
const LOCAL_STORAGE_DRAFT_KEY = 'anta_cuadrilla_wizard_draft_v1';

export default function CuadrillasIndex({
    cuadrillas = [],
    users = [],
    cursosDisponibles = [],
}: Props) {
    const { flash } = usePage<any>().props;
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const {can} = useAuth();
    const triggerToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3200);
    };

    useEffect(() => {
        if (flash?.success) {
            triggerToast(flash.success);
        }
    }, [flash]);

    // Normaliza el estado por si hay registros antiguos booleanos
    const normalizeEstado = (est: Cuadrilla['estado']): 'Borrador' | 'Activa' | 'Inactiva' => {
        if (est === 'Borrador') return 'Borrador';
        if (est === false || est === 'Inactiva') return 'Inactiva';
        return 'Activa';
    };

    // =========================================================================
    // 1. FILTROS Y PAGINACIÓN DE LA TABLA DE CUADRILLAS
    // =========================================================================
    const [showCuadSearch, setShowCuadSearch] = useState(false);
    const cuadSearchInputRef = useRef<HTMLInputElement>(null);

    const [cuadDraft, setCuadDraft] = useState({
        search: '',
        sort: 'az' as 'az' | 'za',
        rol: 'Todos',
        nodo: 'Todos',
        estado: 'Todos',
    });

    const [cuadApplied, setCuadApplied] = useState({
        search: '',
        sort: 'az' as 'az' | 'za',
        rol: 'Todos',
        nodo: 'Todos',
        estado: 'Todos',
    });

    const [cuadPage, setCuadPage] = useState(1);
    const [cuadPerPage, setCuadPerPage] = useState(5);

    const applyCuadFilters = () => {
        setCuadApplied({ ...cuadDraft });
        setCuadPage(1);
    };

    const resetCuadFilters = () => {
        const clean = {
            search: '',
            sort: 'az' as const,
            rol: 'Todos',
            nodo: 'Todos',
            estado: 'Todos',
        };
        setCuadDraft(clean);
        setCuadApplied(clean);
        setShowCuadSearch(false);
        setCuadPage(1);
    };

const processedCuadrillas = useMemo(() => {
        const q = cuadApplied.search.toLowerCase().trim();

        const filtered = cuadrillas.filter((c) => {
            const miembrosNombres = (c.colaboradores || []).map((m) => m.nombre_completo).join(' ');
            const nodosCuadrilla = Array.from(
                new Set((c.colaboradores || []).map((m) => m.zona_geografica_establecimient))
            );
            const rolesCuadrilla = Array.from(
                new Set((c.colaboradores || []).map((m) => m.rol))
            );
            
            // CORRECCIÓN: Usamos normalizeEstado para detectar correctamente el Borrador
            const estadoTexto = normalizeEstado(c.estado);

            const matchText =
                !q ||
                `${c.nombre_cuadrilla} ${c.labor_asociada || ''} ${miembrosNombres} ${nodosCuadrilla.join(' ')} ${estadoTexto}`
                    .toLowerCase()
                    .includes(q);

            const matchRol =
                cuadApplied.rol === 'Todos' || rolesCuadrilla.includes(cuadApplied.rol as any);
            const matchNodo =
                cuadApplied.nodo === 'Todos' || nodosCuadrilla.includes(cuadApplied.nodo);
            const matchEstado =
                cuadApplied.estado === 'Todos' || estadoTexto === cuadApplied.estado;

            return matchText && matchRol && matchNodo && matchEstado;
        });

        filtered.sort((a, b) => {
            const cmp = a.nombre_cuadrilla.localeCompare(b.nombre_cuadrilla, 'es', {
                sensitivity: 'base',
            });
            return cuadApplied.sort === 'az' ? cmp : -cmp;
        });

        return filtered;
    }, [cuadrillas, cuadApplied]);

    const cuadTotalPages = Math.max(1, Math.ceil(processedCuadrillas.length / cuadPerPage));
    const paginatedCuadrillas = useMemo(() => {
        const start = (cuadPage - 1) * cuadPerPage;
        return processedCuadrillas.slice(start, start + cuadPerPage);
    }, [processedCuadrillas, cuadPage, cuadPerPage]);

    // =========================================================================
    // 2. WIZARD PROCEDIMENTAL DE 3 PASOS + AUTOGUARDADO EN "BORRADOR"
    // =========================================================================
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

    // Estado del formulario procedimental
    const [wizardData, setWizardData] = useState<{
        id_cuadrilla: number | null;
        nombre_cuadrilla: string;
        labor_asociada: string;
        estado: 'Borrador' | 'Activa' | 'Inactiva';
        colaboradores: number[];
        cursos: number[];
    }>({
        id_cuadrilla: null,
        nombre_cuadrilla: '',
        labor_asociada: '',
        estado: 'Activa',
        colaboradores: [],
        cursos: [],
    });

    // Filtros rápidos dentro del Paso 2 (Buscador de colaboradores)
    const [step2Search, setStep2Search] = useState('');
    const [step2Nodo, setStep2Nodo] = useState('Todos');
    const [step2Rol, setStep2Rol] = useState('Todos');

    // Filtro rápido dentro del Paso 3 (Buscador de cursos)
    const [step3Search, setStep3Search] = useState('');

    // Recuperación automática desde localStorage si se apagó la PC o se cortó el internet
    const [localRecoveryBanner, setLocalRecoveryBanner] = useState<any | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_DRAFT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.nombre_cuadrilla?.trim()) {
                    setLocalRecoveryBanner(parsed);
                }
            }
        } catch {
            // Ignorar errores de lectura de storage
        }
    }, []);

    // Guarda instantáneamente en localStorage cada vez que el usuario modifica datos en el Wizard
    useEffect(() => {
        if (showWizard && wizardData.nombre_cuadrilla.trim() !== '') {
            try {
                localStorage.setItem(
                    LOCAL_STORAGE_DRAFT_KEY,
                    JSON.stringify({
                        ...wizardData,
                        step: wizardStep,
                        savedAt: new Date().toLocaleTimeString(),
                    })
                );
            } catch {
                // Ignorar si storage está lleno
            }
        }
    }, [wizardData, wizardStep, showWizard]);

    // Función que sincroniza el Borrador en Supabase (Backend)
    // 1. Sincronización en base de datos: ÚNICAMENTE cuando el usuario decide salir
    const syncDraftToDatabase = async (datosActuales = wizardData): Promise<number | null> => {
        if (!datosActuales.nombre_cuadrilla.trim()) return null;

        setIsSavingDraft(true);
        try {
            const res = await axios.post('/cuadrillas/borrador', datosActuales);
            
            if (res.data) {
                setWizardData((prev) => ({
                    ...prev,
                    id_cuadrilla: res.data.id_cuadrilla,
                }));
                setLastSavedTime(res.data.updated_at);
                return res.data.id_cuadrilla;
            }
        } catch (error) {
            triggerToast('Sin conexión: Progreso resguardado localmente en el navegador.');
        } finally {
            setIsSavingDraft(false);
        }
        return datosActuales.id_cuadrilla;
    };

    // 2. Transición entre tarjetas: 100% en cliente (0 peticiones a Supabase)
    const handleNextStep = () => {
        if (wizardStep === 1) {
            if (!wizardData.nombre_cuadrilla.trim() || !wizardData.labor_asociada.trim()) {
                triggerToast('Completá el nombre y la labor para continuar.');
                return;
            }
            // Avanza instantáneamente sin tocar la red
            setWizardStep(2);
        } else if (wizardStep === 2) {
            if (wizardData.colaboradores.length === 0) {
                triggerToast('Seleccioná al menos 1 colaborador.');
                return;
            }
            // Avanza instantáneamente sin tocar la red
            setWizardStep(3);
        }
    };


    // Abrir Wizard desde cero
    const openNewWizard = () => {
        setWizardStep(1);
        setLastSavedTime(null);
        setStep2Search('');
        setStep2Nodo('Todos');
        setStep2Rol('Todos');
        setStep3Search('');
        setWizardData({
            id_cuadrilla: null,
            nombre_cuadrilla: '',
            labor_asociada: '',
            estado: 'Activa',
            colaboradores: [],
            cursos: [],
        });
        setShowWizard(true);
    };

    // Retomar un Borrador o Editar una Cuadrilla existente
    const openResumeOrEditWizard = (cuad: Cuadrilla, initialStep: 1 | 2 | 3 = 1) => {
        const cursosPrevios =
            cuad.cursos_borrador_json && cuad.cursos_borrador_json.length > 0
                ? cuad.cursos_borrador_json
                : Array.from(
                      new Set(
                          (cuad.progresos_cursos || []).map((p) => p.id_curso)
                      )
                  );

        setWizardStep(initialStep);
        setLastSavedTime(null);
        setStep2Search('');
        setStep2Nodo('Todos');
        setStep2Rol('Todos');
        setStep3Search('');
        setWizardData({
            id_cuadrilla: cuad.id_cuadrilla,
            nombre_cuadrilla: cuad.nombre_cuadrilla,
            labor_asociada: cuad.labor_asociada || '',
            estado:
                normalizeEstado(cuad.estado) === 'Inactiva'
                    ? 'Inactiva'
                    : 'Activa',
            colaboradores: (cuad.colaboradores || []).map((c) => c.id),
            cursos: cursosPrevios,
        });
        setShowWizard(true);
    };

    // Avanzar de tarjeta autoguardando en estado "Borrador"
    // Avanzar de tarjeta con validaciones estrictas de creación y autoguardado en Borrador


    // Función para cambiar el estado desde la tabla directamente
    const handleQuickStateChange = (cuad: Cuadrilla, nuevoEstado: string) => {
        // Validar que no se active un borrador vacío
        if (nuevoEstado === 'Activa' && (!cuad.colaboradores || cuad.colaboradores.length === 0)) {
            triggerToast('No podés activar una cuadrilla sin integrantes.');
            return;
        }

        // Obtener los cursos previos según el estado
        const cursosGuardados = cuad.cursos_borrador_json && cuad.cursos_borrador_json.length > 0
            ? cuad.cursos_borrador_json
            : (cuad.progresos_cursos || []).map((p) => p.id_curso);

        router.put(
            `/cuadrillas/${cuad.id_cuadrilla}`,
            {
                nombre_cuadrilla: cuad.nombre_cuadrilla,
                labor_asociada: cuad.labor_asociada || '',
                estado: nuevoEstado,
                colaboradores: (cuad.colaboradores || []).map((c) => c.id),
                cursos: cursosGuardados,
            },
            {
                preserveScroll: true,
                onSuccess: () => triggerToast(`Estado actualizado a ${nuevoEstado}`),
                onError: () => triggerToast('Ocurrió un error al actualizar el estado.'),
            }
        );
    };

    // Cerrar el modal guardando automáticamente como "Borrador" si ya escribió un nombre
    const handleCloseWizardWithDraftSave = async () => {
        if (wizardData.nombre_cuadrilla.trim() !== '') {
            await syncDraftToDatabase(wizardData);
            triggerToast('Progreso guardado en estado "Borrador".');
        }
        setShowWizard(false);
    };

    // Publicación final en el Paso 3
    const handleFinishWizard = (e: React.FormEvent) => {
        e.preventDefault();

        if (!wizardData.nombre_cuadrilla.trim() || !wizardData.labor_asociada.trim()) {
            triggerToast('Completá el nombre de la cuadrilla y la labor en el Paso 1.');
            setWizardStep(1);
            return;
        }
        if (wizardData.colaboradores.length === 0) {
            triggerToast('Seleccioná al menos 1 colaborador en el Paso 2.');
            setWizardStep(2);
            return;
        }

        setIsSubmittingFinal(true);

        router.post(
            '/cuadrillas',
            {
                ...wizardData,
                estado: wizardData.estado === 'Inactiva' ? 'Inactiva' : 'Activa',
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
                    setLocalRecoveryBanner(null);
                    setShowWizard(false);
                    setIsSubmittingFinal(false);
                },
                onError: () => {
                    setIsSubmittingFinal(false);
                    triggerToast('Verificá los datos antes de finalizar.');
                },
            }
        );
    };

    const toggleColaborador = (id: number) => {
        setWizardData((prev) => ({
            ...prev,
            colaboradores: prev.colaboradores.includes(id)
                ? prev.colaboradores.filter((item) => item !== id)
                : [...prev.colaboradores, id],
        }));
    };

    const toggleCurso = (idCurso: number) => {
        setWizardData((prev) => ({
            ...prev,
            cursos: prev.cursos.includes(idCurso)
                ? prev.cursos.filter((item) => item !== idCurso)
                : [...prev.cursos, idCurso],
        }));
    };

    // =========================================================================
    // 3. MODAL DE ELIMINACIÓN CON DOBLE VERIFICACIÓN
    // =========================================================================
    const [deleteTarget, setDeleteTarget] = useState<Cuadrilla | null>(null);
    const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
    const [deleteChecked, setDeleteChecked] = useState(false);

    const openDeleteDoubleCheck = (cuad: Cuadrilla) => {
        setDeleteTarget(cuad);
        setDeleteConfirmStep(1);
        setDeleteChecked(false);
    };

    const executeConfirmedDelete = () => {
        if (!deleteTarget || !deleteChecked) return;

        router.delete(`/cuadrillas/${deleteTarget.id_cuadrilla}`, {
            preserveScroll: true,
            onSuccess: () => {
                // Si el borrador eliminado estaba en localStorage, limpiarlo también
                if (
                    localRecoveryBanner?.nombre_cuadrilla ===
                    deleteTarget.nombre_cuadrilla
                ) {
                    localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
                    setLocalRecoveryBanner(null);
                }
                setDeleteTarget(null);
                triggerToast('Cuadrilla eliminada permanentemente.');
            },
        });
    };

    // =========================================================================
    // 4. HELPERS VISUALES
    // =========================================================================
    const getChipClasses = (estado: 'Borrador' | 'Activa' | 'Inactiva') => {
        if (estado === 'Activa') {
            return 'bg-[#2F7D4F]/12 text-[#2F7D4F] dark:bg-[#6CC28A]/15 dark:text-[#6CC28A]';
        }
        if (estado === 'Borrador') {
            return 'bg-[#B5651D]/15 text-[#B5651D] dark:bg-[#E3A15A]/15 dark:text-[#E3A15A]';
        }
        return 'bg-[#B3372B]/12 text-[#B3372B] dark:bg-[#EE8274]/15 dark:text-[#EE8274]';
    };

    const filteredUsersStep2 = useMemo(() => {
        const q = step2Search.toLowerCase().trim();
        return users.filter((u) => {
            const matchText =
                !q ||
                `${u.nombre_completo} ${u.dni} ${u.legajo}`
                    .toLowerCase()
                    .includes(q);
            const matchNodo =
                step2Nodo === 'Todos' ||
                u.zona_geografica_establecimient === step2Nodo;
            const matchRol = step2Rol === 'Todos' || u.rol === step2Rol;
            return matchText && matchNodo && matchRol;
        });
    }, [users, step2Search, step2Nodo, step2Rol]);

    return (
        <AppLayout title="Cuadrillas de Entrenamiento">
            <Head title="Cuadrillas de Entrenamiento · Panel de RRHH" />

            {/* BANNER DE RECUPERACIÓN ANTE CORTE DE LUZ / CIERRE INESPERADO */}
            {localRecoveryBanner && !showWizard && (
                <div className="mb-6 rounded-[12px] border border-[#B5651D]/40 bg-[#B5651D]/10 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-[#B5651D] shrink-0" />
                        <div className="text-[14px]">
                            <b className="font-semibold text-[#1F2328] dark:text-[#ECEFEC]">
                                Creación interrumpida detectada: "{localRecoveryBanner.nombre_cuadrilla}"
                            </b>
                            <span className="block text-[#6B7280] dark:text-[#9AA39D]">
                                Tenés un borrador guardado automáticamente ({localRecoveryBanner.colaboradores?.length || 0} colaboradores seleccionados).
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setWizardData({
                                    id_cuadrilla: localRecoveryBanner.id_cuadrilla || null,
                                    nombre_cuadrilla: localRecoveryBanner.nombre_cuadrilla || '',
                                    labor_asociada: localRecoveryBanner.labor_asociada || '',
                                    estado: 'Activa',
                                    colaboradores: localRecoveryBanner.colaboradores || [],
                                    cursos: localRecoveryBanner.cursos || [],
                                });
                                setWizardStep(localRecoveryBanner.step || 1);
                                setShowWizard(true);
                            }}
                            className="px-3.5 py-1.5 rounded-[8px] bg-[#2F6F5E] text-white text-[13px] font-medium cursor-pointer"
                        >
                            Retomar donde quedé
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.removeItem(LOCAL_STORAGE_DRAFT_KEY);
                                setLocalRecoveryBanner(null);
                            }}
                            className="px-3 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] text-[#6B7280] cursor-pointer"
                        >
                            Descartar aviso
                        </button>
                    </div>
                </div>
            )}

            {/* ENCABEZADO DE PÁGINA */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div className="flex-1 min-w-[260px]">
                    <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-1">
                        Cuadrillas de Entrenamiento
                    </h1>
                    <p className="text-[#6B7280] dark:text-[#9AA39D] text-[15px] m-0">
                        Agrupamiento operativo paso a paso con resguardo automático de borradores.
                    </p>
                
                </div>
                {can('crear_cuadrilla') && (
                    <Link
                        href="/cuadrillas/create"
                        className="inline-flex items-center gap-2 min-h-[38px] px-[18px] py-[7px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] text-white dark:text-[#0E1A15] font-medium text-[15px] hover:brightness-95 transition cursor-pointer"
                    >
                        <Users className="h-4 w-4" />
                        Nueva cuadrilla
                    </Link>
                )}
            </div>

            {/* CONTENEDOR DE FILTROS Y TABLA COMPACTA */}
            <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] overflow-hidden">
                {/* BARRA DE FILTROS EN UNA SOLA LÍNEA */}
                <div className="p-5 md:px-7 border-b border-[#E9E9E7] dark:border-[#2A302B]">
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setShowCuadSearch((prev) => {
                                    const next = !prev;
                                    if (next)
                                        setTimeout(
                                            () => cuadSearchInputRef.current?.focus(),
                                            50
                                        );
                                    return next;
                                });
                            }}
                            title="Buscar por texto"
                            className={`inline-flex items-center justify-center min-h-[38px] px-2.5 py-[7px] rounded-[8px] border transition cursor-pointer shrink-0 ${
                                showCuadSearch || cuadDraft.search
                                    ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                    : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280]'
                            }`}
                        >
                            <Search className="h-4 w-4" />
                        </button>

                        {showCuadSearch && (
                            <div className="relative flex-1 min-w-[180px]">
                                <input
                                    ref={cuadSearchInputRef}
                                    type="search"
                                    value={cuadDraft.search}
                                    onChange={(e) =>
                                        setCuadDraft({ ...cuadDraft, search: e.target.value })
                                    }
                                    onKeyDown={(e) => e.key === 'Enter' && applyCuadFilters()}
                                    placeholder="Buscar cuadrilla, labor o integrante..."
                                    className="w-full pl-3 pr-8 py-[7px] min-h-[38px] rounded-[8px] border border-[#2F6F5E] bg-white dark:bg-[#1B1F1C] text-[14px] focus:outline-none"
                                />
                            </div>
                        )}

                        <span className="text-[14px] ml-1">Nombre:</span>
                        <select
                            value={cuadDraft.sort}
                            onChange={(e) =>
                                setCuadDraft({
                                    ...cuadDraft,
                                    sort: e.target.value as 'az' | 'za',
                                })
                            }
                            className="py-2.1 min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px]"
                        >
                            <option value="az">A-Z</option>
                            <option value="za">Z-A</option>
                        </select>

                        <span className="text-[14px]">Rol:</span>
                        <select
                            value={cuadDraft.rol}
                            onChange={(e) =>
                                setCuadDraft({ ...cuadDraft, rol: e.target.value })
                            }
                            className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] px-2"
                        >
                            <option value="Todos">Todos</option>
                            {ROLES_COLAB.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>

                        <span className="text-[14px]">Nodo:</span>
                        <select
                            value={cuadDraft.nodo}
                            onChange={(e) =>
                                setCuadDraft({ ...cuadDraft, nodo: e.target.value })
                            }
                            className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] px-2"
                        >
                            <option value="Todos">Todos</option>
                            {NODOS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>

                        <span className="text-[14px]">Estado:</span>
                        <select
                            value={cuadDraft.estado}
                            onChange={(e) =>
                                setCuadDraft({ ...cuadDraft, estado: e.target.value })
                            }
                            className="py-[7px] min-h-[38px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] px-2.1"
                        >
                            <option value="Todos">Todos</option>
                            <option value="Activa">Activa</option>
                            <option value="Borrador">Borrador</option>
                            <option value="Inactiva">Inactiva</option>
                        </select>

                        <button
                            type="button"
                            onClick={applyCuadFilters}
                            className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-[7px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[14px] font-medium cursor-pointer ml-auto"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filtrar
                        </button>

                        <button
                            type="button"
                            onClick={resetCuadFilters}
                            title="Restablecer filtros"
                            className="inline-flex items-center justify-center min-h-[38px] px-2.5 py-[7px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#6B7280] cursor-pointer"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* TABLA DE CUADRILLAS COMPACTA (SIN SCROLL HORIZONTAL) */}
                <div className="w-full">
                    <table className="w-full table-fixed border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/60 dark:bg-[#141714]/50">
                                <th className="w-[30%] py-3 px-5 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Cuadrilla y Labor Asociada
                                </th>
                                <th className="w-[26%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Nodos y Roles Asignados
                                </th>
                                <th className="w-[20%] py-3 px-4 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px]">
                                    Dotación y Estado
                                </th>
                                <th className="w-[24%] py-3 px-16 font-medium text-[#6B7280] dark:text-[#9AA39D] text-[13px] ">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E9E9E7] dark:divide-[#2A302B] text-[14px]">
                            {paginatedCuadrillas.length > 0 ? (
                                paginatedCuadrillas.map((cuad) => {
                                    const nodosUnicos = Array.from(
                                        new Set(
                                            (cuad.colaboradores || []).map(
                                                (m) => m.zona_geografica_establecimient
                                            )
                                        )
                                    );
                                    const rolesUnicos = Array.from(
                                        new Set((cuad.colaboradores || []).map((m) => m.rol))
                                    );
                                    const estadoStr = normalizeEstado(cuad.estado);

                                    return (
                                        <tr
                                            key={cuad.id_cuadrilla}
                                            tabIndex={0}
                                            onClick={(e) => {
                                                // Evitar navegar si se hace clic en botones, checkboxes o selectores
                                                if (!(e.target as HTMLElement).closest('button, select, input, a')) {
                                                    router.visit(`/cuadrillas/${cuad.id_cuadrilla}`);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') router.visit(`/cuadrillas/${cuad.id_cuadrilla}`);
                                            }}
                                            className="hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors cursor-pointer"
                                        >
                                            {/* Columna 1: Nombre + Labor */}
                                            <td className="py-3.5 px-5 align-middle">
                                                <b className="font-semibold text-[#1F2328] dark:text-[#ECEFEC] block truncate">
                                                    {cuad.nombre_cuadrilla}
                                                </b>
                                                <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] block truncate">
                                                    Labor: {cuad.labor_asociada || 'Sin definir (Borrador)'}
                                                </span>
                                            </td>

                                            {/* Columna 2: Nodos + Roles */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <span className="font-medium text-[#1F2328] dark:text-[#ECEFEC] block truncate">
                                                    {nodosUnicos.length > 0
                                                        ? nodosUnicos.join(', ')
                                                        : 'Sin nodo asignado'}
                                                </span>
                                                <span className="text-[12px] text-[#6B7280] dark:text-[#9AA39D] block truncate">
                                                    Roles:{' '}
                                                    {rolesUnicos.length > 0
                                                        ? rolesUnicos.join(', ')
                                                        : 'Pendiente'}
                                                </span>
                                            </td>

                                            {/* Columna 3: Cantidad de miembros + Estado Interactivo */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <select
                                                        value={estadoStr}
                                                        onChange={(e) => handleQuickStateChange(cuad, e.target.value)}
                                                        className={`inline-block px-2.2 py-0.5 rounded-full text-[12px] font-medium border-0 cursor-pointer outline-none focus:ring-2 focus:ring-[#2F6F5E] ${getChipClasses(estadoStr as 'Borrador' | 'Activa' | 'Inactiva')}`}
                                                        title="Cambiar estado"
                                                    >
                                                        <option value="Borrador">Borrador</option>
                                                        <option value="Activa">Activa</option>
                                                        <option value="Inactiva">Inactiva</option>
                                                    </select>
                                                    
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[12px] bg-[#F7F7F6] dark:bg-[#141714] text-[#6B7280] dark:text-[#9AA39D]">
                                                        {(cuad.colaboradores || []).length} colaboradores
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Columna 4: Botones de Acción */}
                                            {can('editar_cuadrilla') && (
                                            <td className="py-3.5 px-16 align-middle">
                                                <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                                                    {can('editar_cuadrilla') && (
                                                    <Link
                                                        href={`/cuadrillas/${cuad.id_cuadrilla}/edit`}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-[8px] border text-[13px] font-medium cursor-pointer ${
                                                            estadoStr === 'Borrador'
                                                                ? 'border-[#B5651D] bg-[#B5651D]/10 text-[#B5651D] dark:text-[#E3A15A]'
                                                                : 'border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]'
                                                        }`}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        {estadoStr === 'Borrador' ? 'Continuar' : 'Editar'}
                                                    </Link>
                                                    )}
                                                    {can('eliminar_cuadrilla') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteDoubleCheck(cuad)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[13px] font-medium text-[#B3372B] dark:text-[#EE8274] hover:bg-[#B3372B]/10 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Eliminar
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="py-6 px-7 text-[#6B7280] dark:text-[#9AA39D]"
                                    >
                                        No hay cuadrillas registradas que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* CONTROLES DE PAGINACIÓN */}
                <div className="px-6 py-4 border-t border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6]/50 dark:bg-[#141714]/40 flex flex-wrap items-center justify-between gap-4 text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 font-normal">
                            Mostrar
                            <select
                                value={cuadPerPage}
                                onChange={(e) => {
                                    setCuadPerPage(Number(e.target.value));
                                    setCuadPage(1);
                                }}
                                className="px-2.1 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                            >
                                {[5, 10, 15, 20, 50].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                            por página
                        </label>
                        <span>
                            · Total: <b>{processedCuadrillas.length}</b> cuadrillas
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 font-normal">
                            Ir a página:
                            <select
                                value={cuadPage}
                                onChange={(e) => setCuadPage(Number(e.target.value))}
                                className=" px-2.2 py-1 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[#1F2328] dark:text-[#ECEFEC]"
                            >
                                {Array.from({ length: cuadTotalPages }, (_, i) => i + 1).map(
                                    (p) => (
                                        <option key={p} value={p}>
                                            {p} de {cuadTotalPages}
                                        </option>
                                    )
                                )}
                            </select>
                        </label>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={cuadPage <= 1}
                                onClick={() => setCuadPage((p) => Math.max(1, p - 1))}
                                className="p-1.5 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                disabled={cuadPage >= cuadTotalPages}
                                onClick={() =>
                                    setCuadPage((p) => Math.min(cuadTotalPages, p + 1))
                                }
                                className="p-1.5 rounded-[6px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

           {/* =====================================================================
                WIZARD PROCEDIMENTAL INTEGRADO (No Modal, evita superposiciones)
            ===================================================================== */}
            {showWizard && (
                <div className="absolute inset-0 z-30 bg-[#F7F7F6] dark:bg-[#141714] animate-in slide-in-from-bottom-4 duration-300 flex flex-col min-h-[calc(100vh-60px)]">
                    
                    {/* Cabecera Compacta del Wizard e Indicador de Autoguardado */}
                    <header className="px-6 md:px-14 py-3 bg-white dark:bg-[#1B1F1C] border-b border-[#E9E9E7] dark:border-[#2A302B] sticky top-0 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        
                        {/* Bloque Izquierdo: Botón Cerrar, Título y Estado de Guardado */}
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={handleCloseWizardWithDraftSave}
                                title="Pausar y volver a la tabla"
                                className="grid place-items-center w-8 h-8 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors cursor-pointer"
                            >
                                <X className="h-4.5 w-4.5" />
                            </button>
                            <div className="flex flex-col">
                                <h2 className="text-[17px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 leading-none">
                                    {wizardData.id_cuadrilla ? 'Edición de cuadrilla' : 'Nueva cuadrilla'}
                                </h2>
                                <span className="text-[11.5px] text-[#6B7280] dark:text-[#9AA39D] flex items-center gap-1 mt-1 font-medium">
                                    <Save className="h-3 w-3 text-[#2F6F5E]" />
                                    {isSavingDraft ? 'Guardando...' : lastSavedTime ? `Borrador: ${lastSavedTime}` : 'Autoguardado activo'}
                                </span>
                            </div>
                        </div>

                        {/* Bloque Derecho: Stepper Compacto Horizontal */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                            {[
                                { step: 1, label: 'Labor' },
                                { step: 2, label: `Integrantes (${wizardData.colaboradores.length})` },
                                { step: 3, label: `Cursos (${wizardData.cursos.length})` },
                            ].map((item) => {
                                const active = wizardStep === item.step;
                                const done = wizardStep > item.step;
                                
                                // Lógica de desbloqueo flexible
                                const isUnlocked = 
                                    wizardData.id_cuadrilla !== null || 
                                    done || active || 
                                    (item.step === 2 && wizardData.nombre_cuadrilla.trim() && wizardData.labor_asociada.trim()) ||
                                    (item.step === 3 && wizardData.colaboradores.length > 0);

                                return (
                                    <button
                                        key={item.step}
                                        type="button"
                                        disabled={!isUnlocked}
                                        onClick={() => setWizardStep(item.step as 1|2|3)}
                                        className={`px-3 py-1.5 rounded-[8px] border text-[12.5px] font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                            active
                                                ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5]'
                                                : done
                                                ? 'border-[#2F7D4F]/40 bg-[#2F7D4F]/10 text-[#2F7D4F] dark:text-[#6CC28A]'
                                                : 'border-[#E9E9E7] dark:border-[#2A302B] text-[#6B7280] dark:text-[#9AA39D] bg-white dark:bg-[#1B1F1C]'
                                        }`}
                                    >
                                        <span className={`grid place-items-center w-5 h-5 rounded-full text-[11px] font-bold ${active ? 'bg-[#2F6F5E] text-white' : done ? 'bg-[#2F7D4F] text-white' : 'bg-[#E9E9E7] dark:bg-[#2A302B] text-[#6B7280]'}`}>
                                            {item.step}
                                        </span>
                                        <span className="whitespace-nowrap">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </header>

                    {/* CUERPO INTERACTIVO POR TARJETA (Centrado y ancho máximo) */}
                    {/* CUERPO INTERACTIVO Y FOOTER */}
                    <div className="flex-1 overflow-hidden px-4 py-6 md:px-14 flex justify-center">
                        <div className="w-full max-w-[800px] bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-sm flex flex-col overflow-hidden relative">
                            
                            {/* ÁREA SCROLLEABLE (TARJETAS) */}
                            <div className="flex-1 overflow-y-auto">
                                {/* TARJETA PASO 1: NOMBRE Y LABOR */}
                                {wizardStep === 1 && (
                                    <div className="p-8 md:p-10 grid gap-7 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div>
                                            <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 tracking-tight">
                                                Definí el nombre y la tarea operativa
                                            </h3>
                                            <p className="text-[15px] text-[#6B7280] dark:text-[#9AA39D] mt-1 mb-0">
                                                Especificá qué labor de riesgo justifica la creación de este grupo.
                                            </p>
                                        </div>

                                        <label className="grid gap-2.5 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                            Nombre de la cuadrilla o equipo
                                            <input
                                                type="text"
                                                required
                                                autoFocus
                                                placeholder="Ej. Cuadrilla 1 - Poda Intensiva Lote Norte"
                                                value={wizardData.nombre_cuadrilla}
                                                onChange={(e) =>
                                                    setWizardData({ ...wizardData, nombre_cuadrilla: e.target.value })
                                                }
                                                className="px-4 py-3 text-[16px] font-normal rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] focus:border-[#2F6F5E] focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029] outline-none transition-all"
                                            />
                                        </label>

                                        <label className="grid gap-2.5 text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC]">
                                            Labor o tarea de riesgo asociada
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej. Uso obligatorio de guantes anticorte, gafas y desmalezadora"
                                                value={wizardData.labor_asociada}
                                                onChange={(e) =>
                                                    setWizardData({ ...wizardData, labor_asociada: e.target.value })
                                                }
                                                className="px-4 py-3 text-[16px] font-normal rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] focus:border-[#2F6F5E] focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029] outline-none transition-all"
                                            />
                                        </label>
                                    </div>
                                )}

                                {/* TARJETA PASO 2: SELECCIÓN DE COLABORADORES */}
                                {wizardStep === 2 && (
                                    <div className="p-8 md:p-10 grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 tracking-tight">
                                                    Seleccioná los integrantes
                                                </h3>
                                                <p className="text-[15px] text-[#6B7280] dark:text-[#9AA39D] mt-1 mb-0">
                                                    Filtrá por nodo o rol para encontrar al personal de campo.
                                                </p>
                                            </div>
                                            <div className="bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5] px-4 py-2 rounded-[10px] border border-[#2F6F5E]/20 text-[14px] font-bold">
                                                {wizardData.colaboradores.length} elegidos
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F7F7F6] dark:bg-[#141714] p-3.5 rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B]">
                                            <input
                                                type="search"
                                                value={step2Search}
                                                onChange={(e) => setStep2Search(e.target.value)}
                                                placeholder="Buscar DNI o nombre..."
                                                className="px-3.5 py-2 text-[14px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] outline-none focus:border-[#2F6F5E]"
                                            />
                                            <select
                                                value={step2Nodo}
                                                onChange={(e) => setStep2Nodo(e.target.value)}
                                                className="px-3.5 py-2 text-[14px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] outline-none focus:border-[#2F6F5E]"
                                            >
                                                <option value="Todos">Todos los Nodos</option>
                                                {NODOS.map((n) => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                            <select
                                                value={step2Rol}
                                                onChange={(e) => setStep2Rol(e.target.value)}
                                                className="px-3.5 py-2 text-[14px] rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] outline-none focus:border-[#2F6F5E]"
                                            >
                                                <option value="Todos">Todos los Roles</option>
                                                {ROLES_COLAB.map((r) => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between text-[13.5px] px-1">
                                            <span className="text-[#6B7280]">
                                                Mostrando {filteredUsersStep2.length} registros
                                            </span>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ids = filteredUsersStep2.map((u) => u.id);
                                                        setWizardData((prev) => ({
                                                            ...prev,
                                                            colaboradores: Array.from(new Set([...prev.colaboradores, ...ids])),
                                                        }));
                                                    }}
                                                    className="text-[#2F6F5E] dark:text-[#6FBFA5] font-medium hover:underline cursor-pointer"
                                                >
                                                    Seleccionar visibles
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setWizardData(prev => ({ ...prev, colaboradores: [] }))}
                                                    className="text-[#B3372B] dark:text-[#EE8274] font-medium hover:underline cursor-pointer"
                                                >
                                                    Limpiar selección
                                                </button>
                                            </div>
                                        </div>

                                        <div className="h-[280px] overflow-y-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start shadow-inner">
                                            {filteredUsersStep2.map((u) => {
                                                const checked = wizardData.colaboradores.includes(u.id);
                                                return (
                                                    <label
                                                        key={u.id}
                                                        className={`flex items-center gap-3.5 p-3 rounded-[10px] border text-[14.5px] cursor-pointer transition-all ${
                                                            checked
                                                                ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] shadow-sm'
                                                                : 'border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] dark:hover:bg-[#141714]'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleColaborador(u.id)}
                                                            className="accent-[#2F6F5E] w-4.5 h-4.5 shrink-0"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <b className={`font-semibold block truncate ${checked ? 'text-[#2F6F5E] dark:text-[#6FBFA5]' : 'text-[#1F2328] dark:text-[#ECEFEC]'}`}>
                                                                {u.nombre_completo}
                                                            </b>
                                                            <span className="text-[12.5px] text-[#6B7280] dark:text-[#9AA39D] block truncate mt-0.5">
                                                                {u.rol} · {u.zona_geografica_establecimient}
                                                            </span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* TARJETA PASO 3: CURSOS Y PUBLICACIÓN */}
                                {wizardStep === 3 && (
                                    <div className="p-8 md:p-10 grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div>
                                            <h3 className="text-[20px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0 tracking-tight">
                                                Asignar batería preventiva
                                            </h3>
                                            <p className="text-[15px] text-[#6B7280] dark:text-[#9AA39D] mt-1 mb-0">
                                                Los {wizardData.colaboradores.length} integrantes recibirán estos cursos.
                                            </p>
                                        </div>

                                        <input
                                            type="search"
                                            value={step3Search}
                                            onChange={(e) => setStep3Search(e.target.value)}
                                            placeholder="Buscar curso por nombre..."
                                            className="w-full px-4 py-2.5 text-[15px] rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] outline-none focus:border-[#2F6F5E]"
                                        />

                                        <div className="h-[240px] overflow-y-auto border border-[#E9E9E7] dark:border-[#2A302B] rounded-[12px] p-4 grid gap-3 content-start shadow-inner">
                                            {cursosDisponibles
                                                .filter((c) => c.nombre.toLowerCase().includes(step3Search.toLowerCase()))
                                                .map((c) => {
                                                    const checked = wizardData.cursos.includes(c.id_curso);
                                                    return (
                                                        <label
                                                            key={c.id_curso}
                                                            className={`flex items-start gap-4 p-4 rounded-[10px] border cursor-pointer transition-all ${
                                                                checked
                                                                    ? 'border-[#2F6F5E] bg-[#EDF4F1] dark:bg-[#223029] shadow-sm'
                                                                    : 'border-[#E9E9E7] dark:border-[#2A302B] hover:bg-[#F7F7F6] dark:hover:bg-[#141714]'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleCurso(c.id_curso)}
                                                                className="accent-[#2F6F5E] w-4.5 h-4.5 mt-1 shrink-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <BookOpen className={`h-4.5 w-4.5 ${checked ? 'text-[#2F6F5E] dark:text-[#6FBFA5]' : 'text-[#6B7280]'}`} />
                                                                    <b className={`font-semibold text-[15px] ${checked ? 'text-[#2F6F5E] dark:text-[#6FBFA5]' : 'text-[#1F2328] dark:text-[#ECEFEC]'}`}>
                                                                        {c.nombre}
                                                                    </b>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                        </div>

                                        <div className="rounded-[12px] bg-[#F7F7F6] dark:bg-[#141714] p-5 border border-[#E9E9E7] dark:border-[#2A302B] flex flex-wrap items-center justify-between gap-4 mt-2">
                                            <div className="text-[14px]">
                                                <span className="text-[#6B7280] dark:text-[#9AA39D]">Estado al finalizar:</span>
                                            </div>
                                            <label className="flex items-center gap-3">
                                                <select
                                                    value={wizardData.estado}
                                                    onChange={(e) => setWizardData({ ...wizardData, estado: e.target.value as any })}
                                                    className="px-4 py-2.5 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] focus:border-[#2F6F5E] outline-none"
                                                >
                                                    <option value="Activa">Activar Cuadrilla</option>
                                                    <option value="Borrador">Guardar Borrador</option>
                                                    <option value="Inactiva">Cuadrilla Inactiva</option>
                                                </select>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PIE DEL WIZARD (STICKY AL FONDO: Nunca desaparece) */}
                            <footer className="sticky bottom-0 px-6 md:px-10 py-5 bg-[#F7F7F6] dark:bg-[#1B1F1C] border-t border-[#E9E9E7] dark:border-[#2A302B] flex flex-wrap items-center justify-between gap-4 w-full">
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={handleCloseWizardWithDraftSave}
                                        className="inline-flex items-center gap-2 min-h-[44px] px-4 md:px-5 py-2 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] font-medium text-[#6B7280] hover:text-[#1F2328] dark:hover:text-[#ECEFEC] transition-colors cursor-pointer"
                                    >
                                        <Save className="h-4.5 w-4.5 shrink-0" />
                                        <span className="hidden sm:inline">Guardar borrador y salir</span>
                                        <span className="sm:hidden">Salir</span>
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 md:gap-3">
                                    <button
                                        type="button"
                                        disabled={wizardStep === 1}
                                        onClick={() => setWizardStep((s) => (s > 1 ? s - 1 : 1) as 1|2|3)}
                                        className="inline-flex items-center gap-1.5 min-h-[44px] px-3 md:px-5 py-2 rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[15px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] transition-colors cursor-pointer disabled:opacity-40"
                                    >
                                        <ArrowLeft className="h-4.5 w-4.5 shrink-0" />
                                        <span className="hidden sm:inline">Anterior</span>
                                    </button>

                                    {wizardStep < 3 ? (
                                        <button
                                            type="button"
                                            onClick={handleNextStep}
                                            disabled={isSavingDraft}
                                            className="inline-flex items-center gap-2 min-h-[44px] px-4 md:px-6 py-2 rounded-[10px] bg-[#2F6F5E] text-white text-[15px] font-semibold hover:bg-[#2F7D4F] transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            <span className="hidden sm:inline">Siguiente</span>
                                            <ArrowRight className="h-4.5 w-4.5 shrink-0" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleFinishWizard}
                                            disabled={isSubmittingFinal}
                                            className="inline-flex items-center gap-2 min-h-[44px] px-4 md:px-6 py-2 rounded-[10px] bg-[#2F6F5E] text-white text-[15px] font-semibold hover:bg-[#2F7D4F] transition-colors cursor-pointer shadow-md disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                                            {isSubmittingFinal ? 'Procesando...' : 'Finalizar y Crear'}
                                        </button>
                                    )}
                                </div>
                            </footer>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================================
                MODAL DE DOBLE VERIFICACIÓN PARA ELIMINAR CUADRILLA / BORRADOR
            ===================================================================== */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 bg-[#141916]/45 grid place-items-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="bg-white dark:bg-[#1B1F1C] rounded-[16px] shadow-2xl w-full max-w-[500px] overflow-hidden"
                    >
                        <header className="flex items-center justify-between px-7 pt-6 pb-2">
                            <div className="flex items-center gap-2.5 text-[#B3372B] dark:text-[#EE8274]">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <h2 className="text-[20px] font-semibold m-0">
                                    {deleteConfirmStep === 1
                                        ? 'Eliminar cuadrilla'
                                        : 'Estas Seguro de Eliminar? (Confirmación)'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="w-8 h-8 rounded-[8px] text-[22px] text-[#6B7280] cursor-pointer"
                            >
                                ×
                            </button>
                        </header>

                        <div className="px-7 py-4 grid gap-4 text-[15px]">
                            {deleteConfirmStep === 1 ? (
                                <p className="m-0 text-[#1F2328] dark:text-[#ECEFEC]">
                                    Estás por eliminar la cuadrilla{' '}
                                    <b>"{deleteTarget.nombre_cuadrilla}"</b> (Estado actual:{' '}
                                    <b>{normalizeEstado(deleteTarget.estado)}</b>). ¿Deseás
                                    avanzar a la confirmación definitiva?
                                </p>
                            ) : (
                                <>
                                    <p className="m-0 text-[#1F2328] dark:text-[#ECEFEC]">
                                        Por seguridad, marcá la casilla de verificación para
                                        confirmar que querés borrar permanentemente{' '}
                                        <b>"{deleteTarget.nombre_cuadrilla}"</b>.
                                    </p>
                                    <label className="flex items-center gap-3 p-3 rounded-[8px] border border-[#B3372B]/30 bg-[#B3372B]/10 text-[14px] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={deleteChecked}
                                            onChange={(e) => setDeleteChecked(e.target.checked)}
                                            className="accent-[#B3372B] w-4 h-4 shrink-0"
                                        />
                                        <span className="font-medium text-[#B3372B] dark:text-[#EE8274]">
                                            Sí, estoy seguro de eliminar esta cuadrilla de forma
                                            irreversible.
                                        </span>
                                    </label>
                                </>
                            )}
                        </div>

                        <footer className="px-7 py-4 border-t border-[#E9E9E7] dark:border-[#2A302B] flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="min-h-[38px] px-4 py-1.5 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] font-medium cursor-pointer"
                            >
                                Cancelar
                            </button>

                            {deleteConfirmStep === 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmStep(2)}
                                    className="min-h-[38px] px-4 py-1.5 rounded-[8px] bg-[#B5651D] text-white text-[14px] font-medium cursor-pointer"
                                >
                                    Continuar a verificación final
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={!deleteChecked}
                                    onClick={executeConfirmedDelete}
                                    className="min-h-[38px] px-4 py-1.5 rounded-[8px] bg-[#B3372B] text-white text-[14px] font-medium disabled:opacity-40 cursor-pointer"
                                >
                                    Eliminar definitivamente
                                </button>
                            )}
                        </footer>
                    </div>
                </div>
            )}

            {/* TOAST FLOTANTE */}
            {toastMsg && (
                <div
                    role="status"
                    className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#1F2328] dark:bg-[#ECEFEC] text-white dark:text-[#141714] px-5 py-3 rounded-[10px] shadow-lg text-[14px] font-medium"
                >
                    {toastMsg}
                </div>
            )}
        </AppLayout>
    );
}