<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Identifica si el usuario objetivo es el Desarrollador / Creador del sistema.
     */
    private function isDeveloperAccount(User $targetUser): bool
    {
        return $targetUser->email === 'dev@antadeldorado.com' || (int) $targetUser->legajo === 1;
    }

    /**
     * Determina si el administrador en sesión puede modificar el rol o estado de otro administrador.
     */
    public function updateAdmin(User $currentUser, User $targetUser): bool
    {
        // 1. Debe tener el permiso granular o ser SuperAdmin
        if (!$currentUser->hasRole('SuperAdmin') && !$currentUser->can('asignar_permisos')) {
            return false;
        }

        // 2. REGLA MODO DIOS: Si el objetivo es el Desarrollador, ningún otro usuario puede tocarlo
        if ($this->isDeveloperAccount($targetUser) && $currentUser->id !== $targetUser->id) {
            return false;
        }

        return true;
    }

    /**
     * Determina si un administrador puede suspender o dar de baja a otro administrador.
     */
    public function deleteOrSuspendAdmin(User $currentUser, User $targetUser): bool
    {
        // 1. REGLA ANTI-SUICIDIO: Nadie puede suspenderse ni eliminarse a sí mismo
        if ($currentUser->id === $targetUser->id) {
            return false;
        }

        // 2. REGLA MODO DIOS: El Desarrollador jamás puede ser suspendido ni eliminado
        if ($this->isDeveloperAccount($targetUser)) {
            return false;
        }

        // 3. Solo un SuperAdmin puede ejecutar bajas administrativas
        return $currentUser->hasRole('SuperAdmin');
    }
}