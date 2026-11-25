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
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE notificacion_emitida ALTER COLUMN enviado_email DROP DEFAULT, ALTER COLUMN enviado_email TYPE boolean USING (enviado_email IS NOT NULL AND enviado_email NOT IN ('', '0', 'false', 'No')), ALTER COLUMN enviado_email SET DEFAULT false, ALTER COLUMN enviado_email SET NOT NULL");


        Schema::table('notificacion_emitida',function (Blueprint $table){
            $table->foreignId('id_usuario')->nullable()->change();
            $table->text('mensaje')->change();
            $table->string('tipo_origen', 30)->default('Manual')->after('id_usuario'); // 'Manual', 'Automatica'
            $table->string('evento_disparador', 60)->nullable()->after('tipo_origen'); // 'manual', 'asignacion_cuadrilla', 'asignacion_curso', 'vencimiento', etc.

            // Guardar criterios dinámicos de segmentación (ej. {"tipo": "estado", "valor": "bloqueados", "nodo": "Las Lajitas"})
            $table->json('filtros_json')->nullable()->after('segmento_destino');

            // Control de programación, envío real y cancelación
            $table->string('estado', 30)->default('Enviada')->after('enviado_email'); // 'Programada', 'Enviada', 'Cancelada', 'Fallida'
            $table->timestamp('fecha_programada')->nullable()->after('fecha_publicacion');
            $table->timestamp('fecha_envio_real')->nullable()->after('fecha_programada');
            $table->unsignedInteger('total_destinatarios')->default(0)->after('estado');

            // Auditoría de cancelación
            $table->foreignId('cancelada_por')->nullable()->after('fecha_envio_real')
                  ->constrained('users', 'id')->nullOnDelete();
            $table->timestamp('fecha_cancelacion')->nullable()->after('cancelada_por');


            Schema::create('notificacion_destinatario', function (Blueprint $table) {
                $table->id('id_destinatario');
                $table->foreignId('id_notificacion')
                    ->constrained('notificacion_emitida', 'id_notificacion')
                    ->cascadeOnDelete();
                $table->foreignId('id_usuario')
                    ->constrained('users', 'id')
                    ->cascadeOnDelete();
                $table->boolean('push_enviado')->default(false);
                $table->boolean('email_enviado')->default(false);
                $table->string('deep_link')->nullable(); // Ej. '/cursos/2' para abrir la pantalla exacta en Flutter
                $table->timestamp('leido_en')->nullable(); // Se actualiza cuando el operario abre la alerta en el celular
                $table->timestamps();

                // Evita enviar dos veces la misma notificación al mismo usuario
                $table->unique(['id_notificacion', 'id_usuario']);
            });
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notificacion_destinatario');

        Schema::table('notificacion_emitida', function (Blueprint $table) {
            $table->dropForeign(['cancelada_por']);
            $table->dropColumn([
                'tipo_origen',
                'evento_disparador',
                'filtros_json',
                'estado',
                'fecha_programada',
                'fecha_envio_real',
                'total_destinatarios',
                'cancelada_por',
                'fecha_cancelacion',
            ]);
        });
    }
};
