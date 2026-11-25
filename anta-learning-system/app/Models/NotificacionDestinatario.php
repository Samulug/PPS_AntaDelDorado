<?php
// app/Models/NotificacionDestinatario.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificacionDestinatario extends Model
{
    protected $table = 'notificacion_destinatario';
    protected $primaryKey = 'id_destinatario';

    protected $fillable = [
        'id_notificacion',
        'id_usuario',
        'push_enviado',
        'email_enviado',
        'deep_link',
        'leido_en',
    ];

    protected $casts = [
        'push_enviado' => 'boolean',
        'email_enviado' => 'boolean',
        'leido_en' => 'datetime',
    ];

    public function notificacion()
    {
        return $this->belongsTo(NotificacionEmitida::class, 'id_notificacion', 'id_notificacion');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'id', 'id_usuario');
    }
}