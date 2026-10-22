<?php
// app/Models/Cuestionario.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cuestionario extends Model
{
    protected $table = 'cuestionario';
    protected $primaryKey = 'id_cuestionario';

    protected $fillable = [
        'id_leccion',
        'puntaje_min_aprobacion',
        'max_intentos',
        'orden_aleatorio',
        'cantidad_preguntas_mostrar',
    ];

    protected $casts = [
        'orden_aleatorio' => 'boolean',
    ];

    public function leccion()
    {
        return $this->belongsTo(Leccion::class, 'id_leccion', 'id_leccion');
    }

    public function preguntas()
    {
        return $this->hasMany(Pregunta::class, 'id_cuestionario', 'id_cuestionario');
    }

    public function respuestasUsuarios()
    {
        return $this->hasMany(RespuestaUsuario::class, 'id_cuestionario', 'id_cuestionario');
    }
}