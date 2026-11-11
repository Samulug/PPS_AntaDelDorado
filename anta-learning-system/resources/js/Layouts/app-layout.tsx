import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import type { BreadcrumbItem } from '@/types';
import {
    Home,
    BookOpen,
    Users,
    MessageSquare,
    Bell,
    ShieldCheck,
    User,
    Search,
    Sun,
    Moon,
    LogOut,
    Menu,
    X,
    HardHat,
} from 'lucide-react';

interface AppLayoutProps {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
    title?: string;
}

export default function AppLayout({
    breadcrumbs = [],
    children,
    title,
}: AppLayoutProps) {
    const { url } = usePage();
    const { auth, filters } = usePage<any>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [globalSearch, setGlobalSearch] = useState(filters?.search || '');
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (filters?.search !== undefined) {
            setGlobalSearch(filters.search || '');
        } else if (!url.startsWith('/colaboradores')) {
            // Si navegamos a otra sección (ej. Cursos o Inicio), limpiamos la barra superior
            setGlobalSearch('');
        }
    }, [filters?.search, url]);

    useEffect(() => {
        const root = document.documentElement;
        setIsDark(root.classList.contains('dark'));
    }, []);

    const toggleTheme = () => {
        const root = document.documentElement;
        if (root.classList.contains('dark')) {
            root.classList.remove('dark');
            setIsDark(false);
        } else {
            root.classList.add('dark');
            setIsDark(true);
        }
    };

    // Búsqueda rápida en la barra superior (redirige a Colaboradores al presionar Enter)
    const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const query = globalSearch.trim();
            router.get(
                '/colaboradores',
                query ? { search: query } : {},
                {
                    preserveState: url.startsWith('/colaboradores'),
                    preserveScroll: url.startsWith('/colaboradores'),
                }
            );
        }
    };

    const navigation = [
        {
            name: 'Inicio',
            href: '/dashboard',
            icon: Home,
            current: url === '/dashboard' || url.startsWith('/dashboard?'),
        },
        {
            name: 'Cursos y contenido',
            href: '/cursos',
            icon: BookOpen,
            current: url.startsWith('/cursos'),
        },
        {
            name: 'Colaboradores',
            href: '/colaboradores',
            icon: Users,
            current: url.startsWith('/colaboradores')
        },
        {
            name: 'Cuadrillas',
            href: '/cuadrillas',
            icon: HardHat,
            current: url.startsWith('/cuadrillas'),
        },
        {
            name: 'Consultas',
            href: '/tickets',
            icon: MessageSquare,
            current: url.startsWith('/tickets'),
            badge: auth?.ticketsPendientesCount || undefined,
        },
        {
            name: 'Notificaciones push',
            href: '/notificaciones',
            icon: Bell,
            current: url.startsWith('/notificaciones'),
        },
        {
            name: 'Roles y accesos',
            href: '/roles',
            icon: ShieldCheck,
            current: url.startsWith('/roles'),
        },
        {
            name: 'Mi perfil',
            href: '/profile',
            icon: User,
            current: url.startsWith('/profile') || url.startsWith('/settings'),
        },
    ];

    const nombreUsuario =
        auth?.user?.nombre_completo || auth?.user?.name || 'Sofía Reynoso';

    

    const rolUsuario = auth?.user?.rol || 'SuperAdmin';
    const iniciales = nombreUsuario
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const photoUser = auth?.user?.foto_url;

    return (
        <div className="min-h-screen bg-[#F7F7F6] dark:bg-[#141714] text-[#1F2328] dark:text-[#ECEFEC] font-sans antialiased selection:bg-[#EDF4F1] selection:text-[#2F6F5E]">
            {title && <Head title={`${title} · Panel de RRHH`} />}

            <header className="sticky top-0 z-30 flex h-[60px] items-center gap-20 bg-white dark:bg-[#1B1F1C] border-b border-[#E9E9E7] dark:border-[#2A302B] px-4 md:px-8">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] lg:hidden"
                    aria-label="Abrir menú"
                >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
                    <b className="font-semibold text-[16px] tracking-tight text-[#1F2328] dark:text-[#ECEFEC]">
                        Anta del Dorado
                    </b>
                    <span className="hidden sm:inline text-[15px] text-[#6B7280] dark:text-[#9AA39D]">
                        Panel de Recursos Humanos
                    </span>
                </Link>

                {/* Buscador central del prototipo */}
                <div className="flex-1 flex items-center">
                    <div className="relative hidden md:block w-full max-w-[420px]">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
                        <input
                            type="search"
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            onKeyDown={handleGlobalSearch}
                            placeholder="Buscar colaborador por DNI, nombre o legajo"
                            aria-label="Buscar colaborador"
                            className="w-full rounded-[8px] border border-transparent bg-[#F7F7F6] dark:bg-[#141714] pl-10 pr-3.5 py-1.5 text-[14px] text-[#1F2328] dark:text-[#ECEFEC] placeholder-[#6B7280] transition-colors focus:border-[#2F6F5E] focus:bg-white dark:focus:bg-[#1B1F1C] focus:outline-none"
                        />
                    </div>
                </div>

                {/*Botón Tema + Usuario + Avatar + Salir */}
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] text-[14px] font-medium text-[#1F2328] dark:text-[#ECEFEC] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] transition-colors cursor-pointer"
                        aria-label="Cambiar tema claro u oscuro"
                    >
                        {isDark ? (
                            <>
                                <Sun className="h-3.5 w-3.5 text-[#E3A15A]" />
                            </>
                        ) : (
                            <>
                                <Moon className="h-3.5 w-3.5 text-[#6B7280]" />
                            </>
                        )}
                    </button>

                    <Link
                        href="/profile"
                        className="hidden sm:block text-right leading-[1] cursor-pointer"
                    >
                        <b className="text-[14px] font-semibold text-[#1F2328] dark:text-[#ECEFEC] block">
                            {nombreUsuario}
                        </b>
                        <small className="text-[12px] text-[#6B7280] dark:text-[#9AA39D]">
                            {rolUsuario}
                        </small>
                    </Link>

                    <Link
                        href="/profile"
                        aria-label="Mi perfil"
                        className="grid h-[39px] w-[39px] shrink-0 place-items-center overflow-hidden rounded-full bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5] font-semibold text-[13px] border border-[#2F6F5E]/20"
                    >
                        {photoUser ? (
                            <img 
                                src={photoUser} 
                                alt={nombreUsuario} 
                                className="h-full w-full object-cover" 
                            />
                        ) : (
                            iniciales
                        )}
                    </Link>

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        title="Cerrar sesión"
                        className="rounded-[8px] p-1.5 text-[#6B7280] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] hover:text-[#B3372B] transition-colors cursor-pointer"
                    >
                        <LogOut className="h-4 w-4" />
                    </Link>
                </div>
            </header>

            {/* CONTENEDOR PRINCIPAL (Grilla 248px + 1fr igual al prototipo) */}
            <div className="grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)] min-h-[calc(100vh-60px)]">
                {/* Backdrop móvil */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-20 bg-black/35 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* SIDEBAR LATERAL */}
                <aside
                    className={`fixed inset-y-0 left-0 z-20 w-[248px] bg-white dark:bg-[#1B1F1C] border-r border-[#E9E9E7] dark:border-[#2A302B] px-4 py-7 transition-transform duration-200 lg:static lg:h-[calc(100dvh-60px)] lg:sticky lg:top-[60px] lg:translate-x-0 ${
                        sidebarOpen ? 'translate-x-0 top-[60px]' : '-translate-x-full'
                    }`}
                >
                    <nav className="grid gap-1.5" aria-label="Secciones">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    aria-current={item.current ? 'page' : undefined}
                                    className={`flex w-full items-center justify-between rounded-[8px] px-3.5 py-[11px] text-left text-[15px] transition-colors ${
                                        item.current
                                            ? 'bg-[#EDF4F1] dark:bg-[#223029] text-[#2F6F5E] dark:text-[#6FBFA5] font-semibold'
                                            : 'text-[#6B7280] dark:text-[#9AA39D] hover:bg-[#F7F7F6] dark:hover:bg-[#141714] hover:text-[#1F2328] dark:hover:text-[#ECEFEC]'
                                    }`}
                                >
                                    <span className="flex items-center gap-5">
                                        <Icon className="h-5 w-5 shrink-0 stroke-[1.6]" />
                                        <span>{item.name}</span>
                                    </span>

                                    {item.badge ? (
                                        <span className="rounded-full bg-[#2F6F5E] dark:bg-[#6FBFA5] text-white dark:text-[#0E1A15] text-[11px] font-semibold px-2 py-0.5">
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* ÁREA CENTRAL DE TRABAJO */}
                <main className="w-full max-w-[1200px] px-4 py-6 sm:px-8 md:px-14 ">
                    {children}
                </main>
            </div>
        </div>
    );
}