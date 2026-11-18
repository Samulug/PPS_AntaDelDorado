<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MensajeTicket extends Model
{
    protected $table = 'mensaje_ticket';
    protected $primaryKey = 'id_mensaje';

    protected $fillable = [
        'id_ticket',
        'id_emisor_usuario',
        'cuerpo_mensaje',
        'es_nota_interna',
    ];

    protected $casts = [
        'es_nota_interna' => 'boolean',
    ];

    public function ticket()
    {
        return $this->belongsTo(TicketConsulta::class, 'id_ticket', 'id_ticket');
    }

    public function emisor()
    {
        return $this->belongsTo(User::class, 'id_emisor_usuario', 'id');
    }
}