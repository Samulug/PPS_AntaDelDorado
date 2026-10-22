<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Curso extends Model
{
    protected $table = 'curso';
    protected $primaryKey = 'id_curso';

    protected $fillable = [
        'nombre',
        'descripcion',
        'tiempo_vigencia',
        'estado_curso',
        'id_curso_req',
        'version_trimestral',
    ];

    protected $casts = [
        'tiempo_vigencia' => 'date',
    ];

    // Relación auto-referencial (Correlatividad)
    public function cursoRequisito()
    {
        return $this->belongsTo(Curso::class, 'id_curso_req', 'id_curso');
    }

    public function cursosDependientes()
    {
        return $this->hasMany(Curso::class, 'id_curso_req', 'id_curso');
    }

    public function modulos()
    {
        return $this->hasMany(Modulo::class, 'id_curso', 'id_curso')->orderBy('orden');
    }

    public function progresos()
    {
        return $this->hasMany(ProgresoCurso::class, 'id_curso', 'id_curso');
    }

    public function tickets()
    {
        return $this->hasMany(TicketConsulta::class, 'id_curso', 'id_curso');
    }

    public function auditorias()
    {
        return $this->hasMany(AuditAdmin::class, 'id_curso', 'id_curso');
    }
}