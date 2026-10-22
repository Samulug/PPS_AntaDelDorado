<?php
// app/Models/RespuestaUsuario.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RespuestaUsuario extends Model
{
    protected $table = 'respuesta_usuario';
    protected $primaryKey = 'id_respuesta';

    protected $fillable = [
        'id_cuestionario',
        'id_progreso',
        'fecha_respuesta',
        'calificacion_obtenida',
        'nro_intento',
    ];

    protected $casts = [
        'fecha_respuesta' => 'date',
    ];

    public function cuestionario()
    {
        return $this->belongsTo(Cuestionario::class, 'id_cuestionario', 'id_cuestionario');
    }

    public function progresoCurso()
    {
        return $this->belongsTo(ProgresoCurso::class, 'id_progreso', 'id_progreso');
    }

    public function detalles()
    {
        return $this->hasMany(DetalleRespuesta::class, 'id_respuesta', 'id_respuesta');
    }
}