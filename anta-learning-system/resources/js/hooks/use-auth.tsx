import { usePage } from "@inertiajs/react";
export function useAuth() {
    const { auth } = usePage().props as any;

    const permissions: string[] = auth?.permissions || [];
    // Retorna true si el usuario tiene el permiso solicitado
    const can = (permission: string): boolean => {
        return permissions.includes(permission);
    };
    return { can, user: auth?.user };
}
