<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $table = 'users';

    protected $fillable = [
        'id_microsoft_entra',
        'nombre_completo',
        'dni',
        'legajo',
        'email',
        'password',
        'rol',
        'permisos_json',
        'centro_costo',
        'zona_geografica_establecimient',
        'estado_operativo',
        'fecha_ingreso',
        'fcm_token',
        'foto',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['foto_url'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permisos_json' => 'array',
            'fecha_ingreso' => 'date',
        ];
    }

    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto ? Storage::url($this->foto) : null;
    }

    // Relaciones Eloquent
    public function cuadrillas()
    {
        return $this->belongsToMany(Cuadrilla::class, 'colaborador_cuadrilla', 'id_usuario', 'id_cuadrilla')
                    ->withPivot('fecha_asignacion')
                    ->withTimestamps();
    }

    public function progresos()
    {
        return $this->hasMany(ProgresoCurso::class, 'id_usuario', 'id');
    }

    public function ticketsEnviados()
    {
        return $this->hasMany(TicketConsulta::class, 'id_usuario', 'id');
    }

    public function ticketsRespondidos()
    {
        return $this->hasMany(TicketConsulta::class, 'id_admin_respondiente', 'id');
    }

    public function auditorias()
    {
        return $this->hasMany(AuditAdmin::class, 'id_usuario', 'id');
    }

    public function notificacionesEmitidas()
    {
        return $this->hasMany(NotificacionEmitida::class, 'id_usuario', 'id');
    }
}