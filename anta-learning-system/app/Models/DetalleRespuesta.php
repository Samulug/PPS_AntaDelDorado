<?php
// app/Models/DetalleRespuesta.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetalleRespuesta extends Model
{
    protected $table = 'detalle_respuesta';
    protected $primaryKey = 'id_detalle';

    protected $fillable = [
        'id_pregunta',
        'id_opcion',
        'id_respuesta',
        'respuesta_texto',
    ];

    public function respuestaUsuario()
    {
        return $this->belongsTo(RespuestaUsuario::class, 'id_respuesta', 'id_respuesta');
    }

    public function pregunta()
    {
        return $this->belongsTo(Pregunta::class, 'id_pregunta', 'id_pregunta');
    }

    public function opcion()
    {
        return $this->belongsTo(Opcion::class, 'id_opcion', 'id_opcion');
    }
}