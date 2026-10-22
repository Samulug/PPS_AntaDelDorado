<?php
// app/Models/Opcion.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Opcion extends Model
{
    protected $table = 'opcion';
    protected $primaryKey = 'id_opcion';

    protected $fillable = [
        'id_pregunta',
        'texto_opcion',
        'es_correcta',
    ];

    // Ocultamos es_correcta por defecto al serializar a JSON para proteger el examen en móvil
    protected $hidden = [
        'es_correcta',
    ];

    protected $casts = [
        'es_correcta' => 'boolean',
    ];

    public function pregunta()
    {
        return $this->belongsTo(Pregunta::class, 'id_pregunta', 'id_pregunta');
    }
}