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
        'id_admin_respondiente',
        'mensaje_consulta',
        'respuesta_admin',
        'estado_ticket',
        'calificacion_resuesta',
    ];

    public function colaborador()
    {
        return $this->belongsTo(User::class, 'id_usuario', 'id');
    }

    public function curso()
    {
        return $this->belongsTo(Curso::class, 'id_curso', 'id_curso');
    }

    public function adminRespondiente()
    {
        return $this->belongsTo(User::class, 'id_admin_respondiente', 'id');
    }
}