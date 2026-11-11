<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditAdmin extends Model
{
    protected $table = 'audit_admin';
    protected $primaryKey = 'id_audit';

    protected $fillable = [
        'id_usuario',
        'id_curso',
        'id_cuadrilla',
        'id_usuario_afectado',
        'accion',
        'fecha_evento',
        'estado_resultante',
    ];

    protected $casts = [
        'fecha_evento' => 'datetime',
    ];

    public function administrador()
    {
        return $this->belongsTo(User::class, 'id_usuario', 'id');
    }

    public function curso()
    {
        return $this->belongsTo(Curso::class, 'id_curso', 'id_curso');
    }

    public function cuadrilla()
    {
        return $this->belongsTo(Cuadrilla::class, 'id_cuadrilla', 'id_cuadrilla');
    }

    public function usuarioAfectado()
    {
        return $this->belongsTo(User::class, 'id_usuario_afectado', 'id');
    }
}