<?php
// app/Models/Leccion.php

namespace App\Models;
use App\Services\MultimediaService;
use Illuminate\Database\Eloquent\Model;

class Leccion extends Model
{
    protected $table = 'leccion';
    protected $primaryKey = 'id_leccion';

    protected $fillable = [
        'id_modulo',
        'titulo',
        'tipo_recurso',
        'id_sharepoint_item',
        'orden',
    ];

    protected $appends = [
        'url_recurso',
        'archivo_verificado',
    ];

    public function getUrlRecursoAttribute(): ?string
    {
        if ($this->tipo_recurso === 'Cuestionario') {
            return null;
        }
        return app(MultimediaService::class)->obtenerUrl($this->id_sharepoint_item);
    }

    public function getArchivoVerificadoAttribute(): bool
    {
        return $this->url_recurso !== null;
    }

    public function modulo()
    {
        return $this->belongsTo(Modulo::class, 'id_modulo', 'id_modulo');
    }

    public function cuestionario()
    {
        return $this->hasOne(Cuestionario::class, 'id_leccion', 'id_leccion');
    }
}