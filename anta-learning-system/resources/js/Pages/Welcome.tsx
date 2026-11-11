import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

const SECONDARY_BTN =
    'min-h-[38px] inline-flex items-center rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-[18px] py-[7px] text-[15px] font-medium text-[#1F2328] dark:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]';

const PRIMARY_BTN =
    'min-h-[38px] inline-flex items-center rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] px-[18px] py-[7px] text-[15px] font-medium text-white dark:text-[#0E1A15] hover:brightness-95 transition-all focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]';

const CARD =
    'rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C]';

const FUNCIONES = [
    {
        titulo: 'Cursos y contenido',
        texto: 'Organizá cada curso en módulos, lecciones y cuestionarios, con los manuales y videos guardados en SharePoint.',
    },
    {
        titulo: 'Colaboradores',
        texto: 'Seguí el avance de cada persona, desbloqueá cuestionarios y enviá recordatorios al personal con demoras.',
    },
    {
        titulo: 'Consultas y avisos',
        texto: 'Respondé las consultas enviadas desde la app móvil y enviá notificaciones push a las cuadrillas.',
    },
];

export default function Welcome({
    auth,
}: PageProps<{ laravelVersion?: string; phpVersion?: string }>) {
    return (
        <>
            <Head title="Panel de RRHH · Anta del Dorado" />

            <div className="min-h-screen bg-[#F7F7F6] dark:bg-[#141714] text-[#1F2328] dark:text-[#ECEFEC]">
                <div className="mx-auto w-full max-w-[1080px] px-6">
                    {/* ENCABEZADO */}
                    <header className="flex flex-wrap items-center justify-between gap-4 py-8">
                        <div className="flex items-center gap-3">
                            <span
                                aria-hidden="true"
                                className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-[18px] font-semibold text-white dark:text-[#0E1A15]"
                            >
                                A
                            </span>
                            <span className="grid leading-tight">
                                <b className="text-[15px] font-semibold">
                                    Anta del Dorado
                                </b>
                                <span className="text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                                    Panel de RRHH
                                </span>
                            </span>
                        </div>

                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <Link href={route('dashboard')} className={PRIMARY_BTN}>
                                    Ir al panel
                                </Link>
                            ) : (
                                <>
                                    <Link href={route('login')} className={SECONDARY_BTN}>
                                        Iniciar sesión
                                    </Link>
                                    <Link href={route('register')} className={PRIMARY_BTN}>
                                        Registrarse
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    <main className="pb-10">
                        {/* PRESENTACIÓN */}
                        <section
                            className={`${CARD} px-7 py-10 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center`}
                        >
                            <div>
                                <h1 className="text-[32px] font-semibold tracking-[-0.01em] leading-[1.15] m-0 mb-3">
                                    Estado de las inducciones, en un solo lugar
                                </h1>
                                <p className="text-[15px] leading-relaxed text-[#6B7280] dark:text-[#9AA39D] m-0 mb-6 max-w-[52ch]">
                                    Administrá el microlearning del personal de
                                    Anta del Dorado: cursos, avance por cuadrilla,
                                    bloqueos y consultas, todo conectado con la
                                    app móvil.
                                </p>

                                <div className="flex flex-wrap gap-3">
                                    {auth.user ? (
                                        <Link href={route('dashboard')} className={PRIMARY_BTN}>
                                            Ir al panel
                                        </Link>
                                    ) : (
                                        <>
                                            <Link href={route('login')} className={PRIMARY_BTN}>
                                                Iniciar sesión
                                            </Link>
                                            <Link href={route('register')} className={SECONDARY_BTN}>
                                                Crear cuenta
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Vista previa con el mismo estilo de KPI del Dashboard */}
                            <div
                                aria-hidden="true"
                                className="rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-[#F7F7F6] dark:bg-[#141714] px-7 py-6 grid gap-2.5"
                            >
                                <span className="text-[15px] text-[#6B7280] dark:text-[#9AA39D]">
                                    Cumplimiento global
                                </span>
                                <b className="text-[38px] font-medium leading-[1.1] tracking-[-0.02em]">
                                    82%
                                </b>
                                <div className="h-[4px] w-full rounded-[4px] bg-[#E9E9E7] dark:bg-[#2A302B] overflow-hidden mt-1">
                                    <i className="block h-full w-[82%] bg-[#2F6F5E] dark:bg-[#6FBFA5]" />
                                </div>
                                <small className="text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                                    Ejemplo ilustrativo del panel
                                </small>
                            </div>
                        </section>

                        {/* FUNCIONES */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
                            {FUNCIONES.map((f) => (
                                <article key={f.titulo} className={`${CARD} px-7 py-6`}>
                                    <h3 className="text-[15px] font-semibold m-0">
                                        {f.titulo}
                                    </h3>
                                    <p className="text-[14px] leading-relaxed text-[#6B7280] dark:text-[#9AA39D] mt-1.5 mb-0">
                                        {f.texto}
                                    </p>
                                </article>
                            ))}
                        </section>
                    </main>

                    <footer className="py-8 text-center text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                        Anta del Dorado · Panel de administración de RRHH
                    </footer>
                </div>
            </div>
        </>
    );
}