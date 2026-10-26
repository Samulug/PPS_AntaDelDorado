import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast() {
    // Invocamos usePage() limpio y casteamos las props directamente
    const { flash } = usePage().props as unknown as {
        flash?: {
            toast?: FlashToast;
        };
    };

    useEffect(() => {
        if (flash?.toast?.message) {
            const data = flash.toast;
            const toastType = data.type;

            if (toastType && typeof (toast as any)[toastType] === 'function') {
                (toast as any)[toastType](data.message, {
                    description: data.description,
                });
            } else {
                toast(data.message, {
                    description: data.description,
                });
            }
        }
    }, [flash]);
}