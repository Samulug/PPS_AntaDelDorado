import { useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { supabase } from '@/lib/supabase';

interface UseSupabaseRealtimeOptions {
    /** Nombre único del canal (ej. 'canal-cuadrillas') */
    channelName: string;
    /** Tablas de PostgreSQL a escuchar (ej. ['cuadrilla', 'colaborador_cuadrilla']) */
    tables: string[];
    /** Props exactas del controlador de Inertia a refrescar (ej. ['cuadrillas']) */
    onlyProps: string[];
    /** Tiempo de espera para agrupar cambios simultáneos (ms) */
    debounceMs?: number;
}

export function useSupabaseRealtime({
    channelName,
    tables,
    onlyProps,
    debounceMs = 400,
}: UseSupabaseRealtimeOptions) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {

        if (!supabase) return; 

        const channel = supabase?.channel(channelName);

        tables.forEach((table) => {
            channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table },
                (payload) => {
                    console.log('[Realtime recibido]', table, payload);
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                    

                    timeoutRef.current = setTimeout(() => {
                        router.reload({
                            only: onlyProps,
                            preserveUrl: true,
                        });
                    }, debounceMs);
                }
            );
        });

        channel.subscribe((status,err) => {
            if (status === 'CHANNEL_ERROR') {
                console.error(`Error al suscribirse al canal Realtime: ${channelName}`);
            }
            console.log(`[Realtime ${channelName}] Estado:`, status, err ?? '');
        });

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        supabase?.removeChannel(channel);
            };
        }, [channelName, tables.join(','), onlyProps.join(','), debounceMs]);
}