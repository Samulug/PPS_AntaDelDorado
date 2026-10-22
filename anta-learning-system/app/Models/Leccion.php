<?php
// app/Models/Leccion.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Leccion extends Model
{
    protected $table = 'leccion';
    protected $primaryKey = 'id_leccion';

    protected $fillable = [
        'id_modulo',
        'titulo',
        'tipo_recurso',
        'id_sharepoint_item',
        'orden',
    ];

    public function modulo()
    {
        return $this->belongsTo(Modulo::class, 'id_modulo', 'id_modulo');
    }

    public function cuestionario()
    {
        return $this->hasOne(Cuestionario::class, 'id_leccion', 'id_leccion');
    }
}