<?php

namespace App\Models;
use App\Models\NotificacionDestinatario;
use Illuminate\Database\Eloquent\Model;

class NotificacionEmitida extends Model
{
    protected $table = 'notificacion_emitida';
    protected $primaryKey = 'id_notificacion';

    protected $fillable = [
        'id_usuario',
        'tipo_origen',
        'evento_disparador',
        'titulo',
        'mensaje',
        'fecha_publicacion',
        'fecha_programada',
        'fecha_envio_real',
        'enviado_push',
        'enviado_email',
        'segmento_destino',
        'filtros_json',
        'estado',
        'total_destinatarios',
        'cancelada_por',
        'fecha_cancelacion',
    ];

    protected $casts = [
        'fecha_publicacion' => 'date',
        'fecha_programada' => 'datetime',
        'fecha_envio_real' => 'datetime',
        'fecha_cancelacion' => 'datetime',
        'enviado_push' => 'boolean',
        'enviado_email' => 'boolean',
        'filtros_json' => 'array',
    ];

    public function administrador()
    {
        return $this->belongsTo(User::class, 'id_usuario', 'id');
    }

    public function canceladaPor()
    {
        return $this->belongsTo(User::class, 'cancelada_por', 'id');
    }

    public function destinatarios()
    {
        return $this->hasMany(NotificacionDestinatario::class, 'id_notificacion', 'id_notificacion');
    }
}