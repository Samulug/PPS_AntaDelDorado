<?php
// app/Models/Pregunta.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pregunta extends Model
{
    protected $table = 'pregunta';
    protected $primaryKey = 'id_pregunta';

    protected $fillable = [
        'id_cuestionario',
        'enunciado',
        'explicacion_refuerzo',
    ];

    public function cuestionario()
    {
        return $this->belongsTo(Cuestionario::class, 'id_cuestionario', 'id_cuestionario');
    }

    public function opciones()
    {
        return $this->hasMany(Opcion::class, 'id_pregunta', 'id_pregunta');
    }
}