<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_admin', function (Blueprint $table) {
            // Hacemos id_curso nullable para permitir auditar cuadrillas o usuarios sin curso asociado
            $table->unsignedBigInteger('id_curso')->nullable()->change();

            // Nuevas claves foráneas opcionales para Trazabilidad Extensiva e Historial de Administradores
            $table->foreignId('id_cuadrilla')
                ->nullable()
                ->after('id_curso')
                ->constrained('cuadrilla', 'id_cuadrilla')
                ->nullOnDelete();

            $table->foreignId('id_usuario_afectado')
                ->nullable()
                ->after('id_cuadrilla')
                ->constrained('users', 'id')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('audit_admin', function (Blueprint $table) {
            $table->dropForeign(['id_cuadrilla']);
            $table->dropForeign(['id_usuario_afectado']);
            $table->dropColumn(['id_cuadrilla', 'id_usuario_afectado']);
            $table->unsignedBigInteger('id_curso')->nullable(false)->change();
        });
    }
};