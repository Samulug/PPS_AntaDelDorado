import AuthLayout from '@/Layouts/AuthLayout';

import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const INPUT_CLASS =
    'w-full rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-3 py-[9px] text-[15px] font-normal text-[#1F2328] dark:text-[#ECEFEC] placeholder-[#6B7280] focus:border-[#2F6F5E] focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]';

const LABEL_CLASS =
    'grid gap-2 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D]';

const ERROR_CLASS = 'text-[13px] text-[#B3372B] dark:text-[#EE8274]';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout
            title="Iniciar sesión"
            description="Ingresá con tu cuenta para administrar las inducciones."
        >
            <Head title="Iniciar sesión · Panel de RRHH" />

            {status && (
                <div
                    role="status"
                    className="mb-5 rounded-[8px] bg-[#2F7D4F]/12 px-3 py-2.5 text-[14px] font-medium text-[#2F7D4F] dark:text-[#6CC28A]"
                >
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="grid gap-5">
                <div className="grid gap-1.5">
                    <label htmlFor="email" className={LABEL_CLASS}>
                        Correo electrónico
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className={INPUT_CLASS}
                            autoComplete="username"
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </label>
                    {errors.email && <p className={ERROR_CLASS}>{errors.email}</p>}
                </div>

                <div className="grid gap-1.5">
                    <label htmlFor="password" className={LABEL_CLASS}>
                        Contraseña
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className={INPUT_CLASS}
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                    </label>
                    {errors.password && (
                        <p className={ERROR_CLASS}>{errors.password}</p>
                    )}
                </div>

                <label className="flex items-center gap-2.5 text-[14px] text-[#6B7280] dark:text-[#9AA39D] cursor-pointer">
                    <input
                        type="checkbox"
                        name="remember"
                        checked={data.remember}
                        onChange={(e) =>
                            setData('remember', e.target.checked || false)
                        }
                        className="h-4 w-4 rounded-[4px] border-[#E9E9E7] dark:border-[#2A302B] accent-[#2F6F5E] dark:accent-[#6FBFA5] focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]"
                    />
                    Recordarme en este equipo
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {canResetPassword ? (
                        <Link
                            href={route('password.request')}
                            className="rounded-[8px] text-[14px] font-medium text-[#2F6F5E] dark:text-[#6FBFA5] hover:underline focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    ) : (
                        <span />
                    )}

                    <button
                        type="submit"
                        disabled={processing}
                        className="min-h-[38px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] px-[18px] py-[7px] text-[15px] font-medium text-white dark:text-[#0E1A15] hover:brightness-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Iniciar sesión
                    </button>
                </div>
            </form>

            <p className="mt-6 mb-0 border-t border-[#E9E9E7] dark:border-[#2A302B] pt-5 text-center text-[14px] text-[#6B7280] dark:text-[#9AA39D]">
                ¿Todavía no tenés cuenta?{' '}
                <Link
                    href={route('register')}
                    className="font-medium text-[#2F6F5E] dark:text-[#6FBFA5] hover:underline"
                >
                    Registrate
                </Link>
            </p>
        </AuthLayout>
    );
}
