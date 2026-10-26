<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cuadrilla extends Model
{
    protected $table = 'cuadrilla';
    protected $primaryKey = 'id_cuadrilla';

    protected $fillable = [
        'nombre_cuadrilla',
        'labor_asociada',
        'fecha_creacion',
        'estado',
        'cursos_borrador_json', 
    ];

    protected $casts = [
        'fecha_creacion' => 'date',
        'cursos_borrador_json' => 'array',
    ];

    public function colaboradores()
    {
        return $this->belongsToMany(User::class, 'colaborador_cuadrilla', 'id_cuadrilla', 'id_usuario')
                    ->withPivot('fecha_asignacion')
                    ->withTimestamps();
    }

    public function progresosCursos()
    {
        return $this->hasMany(ProgresoCurso::class, 'id_cuadrilla', 'id_cuadrilla');
    }
}