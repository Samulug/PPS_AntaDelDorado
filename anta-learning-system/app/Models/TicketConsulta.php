<?php
// app/Models/TicketConsulta.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketConsulta extends Model
{
    protected $table = 'ticket_consulta';
    protected $primaryKey = 'id_ticket';

    protected $fillable = [
        'id_usuario',
        'id_curso',
        'id_admin_asignado',
        'categoria_consulta',
        'asunto_resumen',
        'fecha_devolucion_cola',
        'alerta_demora_enviada',
        'estado_ticket',
        'calificacion_respuesta',
    ];

    protected $casts = [
        'fecha_devolucion_cola' => 'datetime',
        'alerta_demora_enviada' => 'boolean',
    ];

    public function colaborador()
    {
        return $this->belongsTo(User::class, 'id_usuario', 'id');
    }

    public function adminAsignado()
    {
        return $this->belongsTo(User::class, 'id_admin_asignado', 'id');
    }

    public function curso()
    {
        return $this->belongsTo(Curso::class, 'id_curso', 'id_curso');
    }

    public function mensajes()
    {
        return $this->hasMany(MensajeTicket::class, 'id_ticket', 'id_ticket')
                    ->orderBy('created_at', 'asc');
    }
}