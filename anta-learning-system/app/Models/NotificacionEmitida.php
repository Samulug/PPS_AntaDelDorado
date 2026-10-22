<?php
// app/Models/NotificacionEmitida.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificacionEmitida extends Model
{
    protected $table = 'notificacion_emitida';
    protected $primaryKey = 'id_notificacion';

    protected $fillable = [
        'id_usuario',
        'titulo',
        'mensaje',
        'fecha_publicacion',
        'enviado_push',
        'enviado_email',
        'segmento_destino',
    ];

    protected $casts = [
        'fecha_publicacion' => 'date',
        'enviado_push' => 'boolean',
    ];

    public function administrador()
    {
        return $this->belongsTo(User::class, 'id_usuario', 'id');
    }
}