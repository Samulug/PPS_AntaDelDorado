import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title: string;
    description?: string;
}

/**
 * Layout para páginas de invitado (login, registro, etc.) con la misma
 * paleta, tarjetas y tipografía que el Dashboard.
 */
export default function AuthLayout({
    title,
    description,
    children,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="min-h-screen bg-[#F7F7F6] dark:bg-[#141714] flex flex-col items-center justify-center px-6 py-10">
            <Link
                href="/"
                className="mb-8 flex items-center gap-3 rounded-[8px] focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]"
            >
                <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#2F6F5E] dark:bg-[#6FBFA5] text-[18px] font-semibold text-white dark:text-[#0E1A15]"
                >
                    A
                </span>
                <span className="grid leading-tight">
                    <b className="text-[15px] font-semibold text-[#1F2328] dark:text-[#ECEFEC]">
                        Anta del Dorado
                    </b>
                    <span className="text-[13px] text-[#6B7280] dark:text-[#9AA39D]">
                        Panel de RRHH
                    </span>
                </span>
            </Link>

            <div className="w-full max-w-[420px] rounded-[12px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-7 py-8">
                <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[#1F2328] dark:text-[#ECEFEC] m-0 mb-1">
                    {title}
                </h1>
                {description && (
                    <p className="text-[15px] text-[#6B7280] dark:text-[#9AA39D] m-0 mb-6">
                        {description}
                    </p>
                )}
                {!description && <div className="mb-6" />}

                {children}
            </div>
        </div>
    );
}