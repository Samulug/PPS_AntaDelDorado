<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class MultimediaService
{
    private string $disk = 'public';
    private string $folder = 'sharepoint_mock';

    /**
     * Lista todos los archivos subidos al repositorio (Simulación de SharePoint Drive).
     */
    public function listarRepositorio(): array
    {
        if (!Storage::disk($this->disk)->exists($this->folder)) {
            Storage::disk($this->disk)->makeDirectory($this->folder);
        }

        $files = Storage::disk($this->disk)->files($this->folder);
        $items = [];

        foreach ($files as $filePath) {
            $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
            if (!in_array($ext, ['mp4', 'pdf', ' ppt', 'pptx'])) {
                continue;
            }

            $filename = basename($filePath);
            $sizeBytes = Storage::disk($this->disk)->size($filePath);

            $items[] = [
                'id_sharepoint_item' => $filename,
                'nombre'             => $filename,
                'tipo_recurso'       => $ext === 'mp4' ? 'Video' : 'Presentacion_Filminas',
                'extension'          => $ext,
                'peso_mb'            => round($sizeBytes / 1048576, 2),
                'url_streaming'      => asset("storage/{$this->folder}/{$filename}"),
                'es_reproducible'    => in_array($ext, ['mp4', 'pdf']) && $sizeBytes > 0,
            ];
        }

        return $items;
    }

    /**
     * Recibe un archivo desde la máquina local, lo guarda y verifica que no esté corrupto.
     */
    public function subirArchivo(UploadedFile $file): array
    {
        $ext = strtolower($file->getClientOriginalExtension());
        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);

        // Nombre limpio + timestamp para evitar colisiones y caracteres rotos en URLs
        $cleanName = Str::slug($originalName, '_') . '_' . time() . '.' . $ext;

        $storedPath = $file->storeAs($this->folder, $cleanName, $this->disk);

        if (!$storedPath || !Storage::disk($this->disk)->exists($storedPath)) {
            throw new RuntimeException('No se pudo escribir el archivo en el disco.');
        }

        $sizeBytes = Storage::disk($this->disk)->size($storedPath);
        if ($sizeBytes <= 0) {
            Storage::disk($this->disk)->delete($storedPath);
            throw new RuntimeException('El archivo subido está vacío (0 bytes).');
        }

        return [
            'id_sharepoint_item' => $cleanName,
            'nombre_original'    => $file->getClientOriginalName(),
            'tipo_recurso'       => $ext === 'mp4' ? 'Video' : 'Presentacion_Filminas',
            'extension'          => $ext,
            'peso_mb'            => round($sizeBytes / 1048576, 2),
            'url_streaming'      => asset("storage/{$this->folder}/{$cleanName}"),
            'es_reproducible'    => in_array($ext, ['mp4', 'pdf']),
        ];
    }

    /**
     * Resuelve la URL de reproducción para un id_sharepoint_item guardado en la BD.
     */
    public function obtenerUrl(?string $idSharepointItem): ?string
    {
        if (!$idSharepointItem) {
            return null;
        }

        $path = "{$this->folder}/{$idSharepointItem}";
        if (Storage::disk($this->disk)->exists($path) && Storage::disk($this->disk)->size($path) > 0) {
            return asset("storage/{$path}");
        }

        return null;
    }
}