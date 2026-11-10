import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Video, FileText, Smartphone } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tituloLeccion: string;
    tipoRecurso: 'Video' | 'Presentacion_Filminas' | string;
    archivoNombre: string;
    urlStreaming: string | null;
}

export default function ModalPrevisualizadorMultimedia({
    isOpen,
    onClose,
    tituloLeccion,
    tipoRecurso,
    archivoNombre,
    urlStreaming,
}: Props) {
    const [videoMeta, setVideoMeta] = useState<{ duration: number; width: number; height: number } | null>(null);
    const [mediaError, setMediaError] = useState<string | null>(null);

    if (!isOpen) return null;

    const ext = archivoNombre.split('.').pop()?.toLowerCase() || '';
    const isPptxRaw = ext === 'ppt' || ext === 'pptx';

    const formatDuration = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s} min`;
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-[#141916]/60 grid place-items-center p-4 animate-in fade-in duration-150"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white dark:bg-[#1B1F1C] border border-[#E9E9E7] dark:border-[#2A302B] rounded-[16px] shadow-2xl w-full max-w-[720px] overflow-hidden flex flex-col">
                {/* CABECERA */}
                <header className="px-6 py-4 border-b border-[#E9E9E7] dark:border-[#2A302B] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Smartphone className="h-5 w-5 text-[#2F6F5E]" />
                        <div>
                            <h3 className="text-[16px] font-bold text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                Verificación y Previsualizador: {tituloLeccion}
                            </h3>
                            <span className="text-[12px] text-[#6B7280] font-mono">
                                ID Recurso: {archivoNombre || 'Sin archivo'}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-[8px] text-[#6B7280] hover:bg-[#F7F7F6] cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {/* CUERPO DEL REPRODUCTOR */}
                <div className="p-6 bg-[#F7F7F6] dark:bg-[#141714] space-y-4">
                    {!urlStreaming ? (
                        <div className="p-8 rounded-[12px] border border-[#B3372B]/30 bg-[#B3372B]/10 text-center space-y-2">
                            <AlertTriangle className="h-8 w-8 text-[#B3372B] mx-auto" />
                            <b className="block text-[15px] text-[#B3372B]">
                                El archivo físico aún no se encuentra subido en el servidor
                            </b>
                            <p className="text-[13px] text-[#6B7280] max-w-[460px] mx-auto m-0">
                                Este registro solo tiene un nombre de referencia ("{archivoNombre}"), pero no se ha subido el archivo real desde tu máquina. Usá el botón "Subir archivo" para cargarlo.
                            </p>
                        </div>
                    ) : isPptxRaw ? (
                        <div className="p-6 rounded-[12px] border border-[#B5651D]/40 bg-[#B5651D]/10 space-y-2">
                            <div className="flex items-center gap-2 text-[#B5651D] font-semibold text-[14.5px]">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                Archivo PowerPoint (.{ext}) almacenado correctamente en el servidor
                            </div>
                            <p className="text-[13px] text-[#1F2328] dark:text-[#ECEFEC] m-0">
                                El archivo físico ya está resguardado en <code>storage/app/public/sharepoint_mock/{archivoNombre}</code>. Para previsualizar las filminas directamente en el navegador y en Flutter sin las credenciales de Microsoft Graph API, <b>exportá tu PowerPoint como .PDF</b> y subilo aquí.
                            </p>
                            <a
                                href={urlStreaming}
                                download
                                className="inline-block mt-2 px-3.5 py-1.5 rounded-[8px] bg-[#2F6F5E] text-white text-[13px] font-medium"
                            >
                                Descargar archivo .{ext} para verificar integridad
                            </a>
                        </div>
                    ) : tipoRecurso === 'Video' || ext === 'mp4' ? (
                        <div className="space-y-3">
                            <video
                                key={urlStreaming}
                                src={urlStreaming}
                                controls
                                preload="metadata"
                                onLoadedMetadata={(e) => {
                                    setMediaError(null);
                                    setVideoMeta({
                                        duration: e.currentTarget.duration,
                                        width: e.currentTarget.videoWidth,
                                        height: e.currentTarget.videoHeight,
                                    });
                                }}
                                onError={() =>
                                    setMediaError(
                                        'El archivo de video no pudo decodificarse. Verificá que sea un archivo .mp4 (H.264) válido.'
                                    )
                                }
                                className="w-full max-h-[380px] rounded-[10px] bg-black border border-[#E9E9E7] dark:border-[#2A302B]"
                            />

                            {videoMeta && !mediaError && (
                                <div className="flex items-center justify-between px-4 py-2.5 rounded-[8px] bg-[#2F7D4F]/12 text-[#2F7D4F] text-[13px] font-medium">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        Streaming verificado y listo para la App Móvil
                                    </span>
                                    <span>
                                        Duración: <b>{formatDuration(videoMeta.duration)}</b> · Resolución:{' '}
                                        <b>
                                            {videoMeta.width}x{videoMeta.height}px
                                        </b>
                                    </span>
                                </div>
                            )}

                            {mediaError && (
                                <div className="p-3 rounded-[8px] bg-[#B3372B]/12 text-[#B3372B] text-[13px] font-medium flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    {mediaError}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <iframe
                                src={`${urlStreaming}#toolbar=1`}
                                title={tituloLeccion}
                                className="w-full h-[420px] rounded-[10px] border border-[#E9E9E7] dark:border-[#2A302B] bg-white"
                            />
                            <div className="flex items-center justify-between px-4 py-2 rounded-[8px] bg-[#2F7D4F]/12 text-[#2F7D4F] text-[13px] font-medium">
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    Documento PDF verificado en el servidor
                                </span>
                                <a
                                    href={urlStreaming}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline font-semibold"
                                >
                                    Abrir en pestaña nueva
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* PIE */}
                <footer className="px-6 py-3.5 border-t border-[#E9E9E7] dark:border-[#2A302B] flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-[8px] bg-[#2F6F5E] text-white text-[13.5px] font-semibold cursor-pointer"
                    >
                        Cerrar previsualizador
                    </button>
                </footer>
            </div>
        </div>
    );
}