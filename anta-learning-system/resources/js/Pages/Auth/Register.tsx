import AuthLayout from '@/Layouts/AuthLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const INPUT_CLASS =
    'w-full rounded-[8px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white dark:bg-[#1B1F1C] px-3 py-[9px] text-[15px] font-normal text-[#1F2328] dark:text-[#ECEFEC] placeholder-[#6B7280] focus:border-[#2F6F5E] focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]';

const LABEL_CLASS =
    'grid gap-2 text-[13px] font-medium text-[#6B7280] dark:text-[#9AA39D]';

const ERROR_CLASS = 'text-[13px] text-[#B3372B] dark:text-[#EE8274]';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout
            title="Crear cuenta"
            description="Completá tus datos para acceder al panel de RRHH."
        >
            <Head title="Registro · Panel de RRHH" />

            <form onSubmit={submit} className="grid gap-5">
                <div className="grid gap-1.5">
                    <label htmlFor="name" className={LABEL_CLASS}>
                        Nombre completo
                        <input
                            id="name"
                            name="name"
                            value={data.name}
                            className={INPUT_CLASS}
                            autoComplete="name"
                            autoFocus
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </label>
                    {errors.name && <p className={ERROR_CLASS}>{errors.name}</p>}
                </div>

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
                            onChange={(e) => setData('email', e.target.value)}
                            required
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
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                    </label>
                    {errors.password && (
                        <p className={ERROR_CLASS}>{errors.password}</p>
                    )}
                </div>

                <div className="grid gap-1.5">
                    <label htmlFor="password_confirmation" className={LABEL_CLASS}>
                        Confirmar contraseña
                        <input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className={INPUT_CLASS}
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            required
                        />
                    </label>
                    {errors.password_confirmation && (
                        <p className={ERROR_CLASS}>
                            {errors.password_confirmation}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <Link
                        href={route('login')}
                        className="rounded-[8px] text-[14px] font-medium text-[#2F6F5E] dark:text-[#6FBFA5] hover:underline focus:outline-none focus:ring-3 focus:ring-[#EDF4F1] dark:focus:ring-[#223029]"
                    >
                        ¿Ya tenés cuenta?
                    </Link>

                    <button
                        type="submit"
                        disabled={processing}
                        className="min-h-[38px] rounded-[8px] border border-[#2F6F5E] bg-[#2F6F5E] dark:bg-[#6FBFA5] dark:border-[#6FBFA5] px-[18px] py-[7px] text-[15px] font-medium text-white dark:text-[#0E1A15] hover:brightness-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Crear cuenta
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}