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
        'ids_cursos_req',
        'version_trimestral',
    ];

    protected $casts = [
        'tiempo_vigencia' => 'date',
        'ids_cursos_req' => 'array',
    ];

    
    protected $appends = ['cursos_requeridos']; 

    public function getCursosRequeridosAttribute()
    {
        if (empty($this->ids_cursos_req)) {
            return [];
        }
        // Busca los cursos cuyos IDs estén dentro del arreglo JSON
        return self::whereIn('id_curso', $this->ids_cursos_req)->get(['id_curso', 'nombre']);
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