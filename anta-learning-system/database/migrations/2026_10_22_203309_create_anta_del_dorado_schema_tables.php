<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabla: cuadrilla
        Schema::create('cuadrilla', function (Blueprint $table) {
            $table->id('id_cuadrilla');
            $table->string('nombre_cuadrilla');
            $table->string('labor_asociada');
            $table->date('fecha_creacion')->default(now());
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        // 2. Tabla Pivote: colaborador_cuadrilla
        Schema::create('colaborador_cuadrilla', function (Blueprint $table) {
            $table->foreignId('id_usuario')->constrained('users', 'id')->cascadeOnDelete();
            $table->foreignId('id_cuadrilla')->constrained('cuadrilla', 'id_cuadrilla')->cascadeOnDelete();
            $table->date('fecha_asignacion')->default(now());
            $table->primary(['id_usuario', 'id_cuadrilla']);
            $table->timestamps();
        });

        // 3. Tabla: curso
        Schema::create('curso', function (Blueprint $table) {
            $table->id('id_curso');
            $table->string('nombre');
            $table->text('descripcion');
            $table->date('tiempo_vigencia');
            $table->string('estado_curso', 50)->default('Activo'); // Activo, En_Taller_Revision, Inactivo
            $table->foreignId('id_curso_req')->nullable()->constrained('curso', 'id_curso')->nullOnDelete();
            $table->integer('version_trimestral')->default(1);
            $table->timestamps();
        });

        // 4. Tabla: modulo
        Schema::create('modulo', function (Blueprint $table) {
            $table->id('id_modulo');
            $table->foreignId('id_curso')->constrained('curso', 'id_curso')->cascadeOnDelete();
            $table->string('titulo');
            $table->integer('dia_liberacion')->default(1); // Para algoritmo de desbloqueo día a día
            $table->integer('orden')->default(1);
            $table->timestamps();
        });

        // 5. Tabla: leccion
        Schema::create('leccion', function (Blueprint $table) {
            $table->id('id_leccion');
            $table->foreignId('id_modulo')->constrained('modulo', 'id_modulo')->cascadeOnDelete();
            $table->string('titulo');
            $table->string('tipo_recurso', 50); // Video, PDF, Presentacion_Filminas, Cuestionario
            $table->string('id_sharepoint_item');
            $table->integer('orden')->default(1);
            $table->timestamps();
        });

        // 6. Tabla: progreso_curso
        Schema::create('progreso_curso', function (Blueprint $table) {
            $table->id('id_progreso');
            $table->foreignId('id_usuario')->constrained('users', 'id')->cascadeOnDelete();
            $table->foreignId('id_curso')->constrained('curso', 'id_curso')->cascadeOnDelete();
            $table->foreignId('id_cuadrilla')->nullable()->constrained('cuadrilla', 'id_cuadrilla')->nullOnDelete();
            $table->date('fecha_inicio')->default(now());
            $table->date('fecha_finalizacion')->nullable();
            $table->integer('porcentaje_avance')->default(0);
            $table->timestamp('ultima_visita')->nullable();
            $table->string('url_certificado_pdf')->nullable();
            $table->float('valoracion_curso')->nullable();
            $table->string('estado', 50)->default('Pendiente'); // Pendiente, En_Curso, Completado, Bloqueado, Vencido
            $table->timestamps();
        });

        // 7. Tabla: cuestionario
        Schema::create('cuestionario', function (Blueprint $table) {
            $table->id('id_cuestionario');
            $table->foreignId('id_leccion')->constrained('leccion', 'id_leccion')->cascadeOnDelete();
            $table->integer('puntaje_min_aprobacion')->default(70); // 50, 70, 80
            $table->integer('max_intentos')->default(3);
            $table->boolean('orden_aleatorio')->default(true);
            $table->integer('cantidad_preguntas_mostrar')->default(3);
            $table->timestamps();
        });

        // 8. Tabla: pregunta
        Schema::create('pregunta', function (Blueprint $table) {
            $table->id('id_pregunta');
            $table->foreignId('id_cuestionario')->constrained('cuestionario', 'id_cuestionario')->cascadeOnDelete();
            $table->text('enunciado');
            $table->text('explicacion_refuerzo');
            $table->timestamps();
        });

        // 9. Tabla: opcion
        Schema::create('opcion', function (Blueprint $table) {
            $table->id('id_opcion');
            $table->foreignId('id_pregunta')->constrained('pregunta', 'id_pregunta')->cascadeOnDelete();
            $table->string('texto_opcion');
            $table->boolean('es_correcta')->default(false);
            $table->timestamps();
        });

        // 10. Tabla: respuesta_usuario
        Schema::create('respuesta_usuario', function (Blueprint $table) {
            $table->id('id_respuesta');
            $table->foreignId('id_cuestionario')->constrained('cuestionario', 'id_cuestionario')->cascadeOnDelete();
            $table->foreignId('id_progreso')->constrained('progreso_curso', 'id_progreso')->cascadeOnDelete();
            $table->date('fecha_respuesta')->default(now());
            $table->integer('calificacion_obtenida');
            $table->integer('nro_intento')->default(1);
            $table->timestamps();
        });

        // 11. Tabla: detalle_respuesta
        Schema::create('detalle_respuesta', function (Blueprint $table) {
            $table->id('id_detalle');
            $table->foreignId('id_pregunta')->constrained('pregunta', 'id_pregunta')->cascadeOnDelete();
            $table->foreignId('id_opcion')->nullable()->constrained('opcion', 'id_opcion')->nullOnDelete();
            $table->foreignId('id_respuesta')->constrained('respuesta_usuario', 'id_respuesta')->cascadeOnDelete();
            $table->text('respuesta_texto')->nullable();
            $table->timestamps();
        });

        // 12. Tabla: ticket_consulta
        Schema::create('ticket_consulta', function (Blueprint $table) {
            $table->id('id_ticket');
            $table->foreignId('id_usuario')->constrained('users', 'id')->cascadeOnDelete();
            $table->foreignId('id_curso')->nullable()->constrained('curso', 'id_curso')->nullOnDelete();
            $table->foreignId('id_admin_respondiente')->nullable()->constrained('users', 'id')->nullOnDelete();
            $table->text('mensaje_consulta');
            $table->text('respuesta_admin')->nullable();
            $table->string('estado_ticket', 50)->default('Pendiente'); // Pendiente, Respondido
            $table->integer('calificacion_resuesta')->nullable(); // 1 a 5 estrellas
            $table->timestamps();
        });

        // 13. Tabla: audit_admin
        Schema::create('audit_admin', function (Blueprint $table) {
            $table->id('id_audit');
            $table->foreignId('id_usuario')->constrained('users', 'id')->cascadeOnDelete();
            $table->foreignId('id_curso')->constrained('curso', 'id_curso')->cascadeOnDelete();
            $table->string('accion');
            $table->timestamp('fecha_evento')->useCurrent();
            $table->string('estado_resultante', 50); // Activo, En_Taller_Revision, Bloqueado
            $table->timestamps();
        });

        // 14. Tabla: notificacion_emitida
        Schema::create('notificacion_emitida', function (Blueprint $table) {
            $table->id('id_notificacion');
            $table->foreignId('id_usuario')->constrained('users', 'id')->cascadeOnDelete();
            $table->string('titulo');
            $table->text('mensaje');
            $table->date('fecha_publicacion')->default(now());
            $table->boolean('enviado_push')->default(false);
            $table->string('enviado_email', 50)->default('Enviado');
            $table->string('segmento_destino', 100); // Todos, Nodo: Las Lajitas, Rol: Supervisor, etc.
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificacion_emitida');
        Schema::dropIfExists('audit_admin');
        Schema::dropIfExists('ticket_consulta');
        Schema::dropIfExists('detalle_respuesta');
        Schema::dropIfExists('respuesta_usuario');
        Schema::dropIfExists('opcion');
        Schema::dropIfExists('pregunta');
        Schema::dropIfExists('cuestionario');
        Schema::dropIfExists('progreso_curso');
        Schema::dropIfExists('leccion');
        Schema::dropIfExists('modulo');
        Schema::dropIfExists('curso');
        Schema::dropIfExists('colaborador_cuadrilla');
        Schema::dropIfExists('cuadrilla');
    }
};