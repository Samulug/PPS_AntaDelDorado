<?php
// app/Models/Modulo.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Modulo extends Model
{
    protected $table = 'modulo';
    protected $primaryKey = 'id_modulo';

    protected $fillable = [
        'id_curso',
        'titulo',
        'dia_liberacion',
        'orden',
    ];

    public function curso()
    {
        return $this->belongsTo(Curso::class, 'id_curso', 'id_curso');
    }

    public function lecciones()
    {
        return $this->hasMany(Leccion::class, 'id_modulo', 'id_modulo')->orderBy('orden');
    }
}