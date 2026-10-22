<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProgresoCurso extends Model
{
    protected $table = 'progreso_curso';
    protected $primaryKey = 'id_progreso';

    protected $fillable = [
        'id_usuario',
        'id_curso',
        'id_cuadrilla',
        'fecha_inicio',
        'fecha_finalizacion',
        'porcentaje_avance',
        'ultima_visita',
        'url_certificado_pdf',
        'valoracion_curso',
        'estado',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_finalizacion' => 'date',
        'ultima_visita' => 'datetime',
    ];

    public function usuario()
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

    public function respuestas()
    {
        return $this->hasMany(RespuestaUsuario::class, 'id_progreso', 'id_progreso');
    }
}