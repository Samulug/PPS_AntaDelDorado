<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            // Mantenemos 'id' para compatibilidad nativa con Sanctum y Spatie
            $table->id(); 
            $table->string('id_microsoft_entra')->nullable()->unique();
            $table->string('nombre_completo');
            $table->integer('dni')->unique();
            $table->integer('legajo')->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('rol', 50)->default('Operario'); // SuperAdmin, Lic_RRHH, Lic_HyS, Supervisor, Operario
            $table->json('permisos_json')->nullable();
            $table->string('centro_costo', 100)->default('CC-101');
            $table->string('zona_geografica_establecimient', 100)->default('Las Lajitas'); // Las Lajitas, Anta, Coronel Mollinedo, Laguna Verde
            $table->string('estado_operativo', 50)->default('Activo'); // Activo, Inactivo, Vacaciones, Lesionado, Enfermo, Siniestrado
            $table->date('fecha_ingreso')->default(now());
            $table->string('fcm_token')->nullable();
            $table->string('foto')->nullable(); // Para avatar con Storage::disk('public')
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};