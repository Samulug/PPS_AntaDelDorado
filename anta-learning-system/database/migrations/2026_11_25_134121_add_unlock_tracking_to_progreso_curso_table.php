<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::table('progreso_curso', function (Blueprint $table) {
        $table->timestamp('ultimo_desbloqueo_at')->nullable()->after('estado');
        $table->unsignedInteger('veces_desbloqueado')->default(0)->after('ultimo_desbloqueo_at');
    });
}

public function down(): void
{
    Schema::table('progreso_curso', function (Blueprint $table) {
        $table->dropColumn(['ultimo_desbloqueo_at', 'veces_desbloqueado']);
    });
}
};
