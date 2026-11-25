<?php

namespace Database\Seeders;

use App\Models\AuditAdmin;
use App\Models\Cuadrilla;
use App\Models\Cuestionario;
use App\Models\Curso;
use App\Models\DetalleRespuesta;
use App\Models\Leccion;
use App\Models\Modulo;
use App\Models\NotificacionEmitida;
use App\Models\Opcion;
use App\Models\Pregunta;
use App\Models\ProgresoCurso;
use App\Models\RespuestaUsuario;
use App\Models\TicketConsulta;
use App\Models\MensajeTicket;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Limpiar caché de permisos de Spatie
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->call(RolesAndPermissionsSeeder::class);

        $roleSuperAdmin = Role::findByName('SuperAdmin', 'web');
        $roleRRHH       = Role::findByName('Lic_RRHH', 'web');
        $roleHyS        = Role::findByName('Lic_HyS', 'web');
        $roleSupervisor = Role::findByName('Supervisor', 'web');
        $roleOperario   = Role::findByName('Operario', 'web');
        $permisos       = Permission::pluck('name')->toArray();

        $passwordGenerica = Hash::make('12345678');

        // 4. Poblar Usuarios Administrativos (Web)
        $belec = User::create([
            'id_microsoft_entra' => 'ms-entra-admin-001',
            'nombre_completo' => 'Belec Gainza (SuperAdmin RRHH)',
            'dni' => 30111222,
            'legajo' => 1001,
            'email' => 'belec.gainza@antadeldorado.com',
            'password' => $passwordGenerica,
            'rol' => 'SuperAdmin',
            'permisos_json' => $permisos,
            'centro_costo' => 'CC-ADM-01',
            'zona_geografica_establecimient' => 'Las Lajitas',
            'estado_operativo' => 'Activo',
            'disponible_soporte' => true,
            'fecha_ingreso' => '2020-03-01',
        ]);
        $belec->assignRole($roleSuperAdmin);

        $viol = User::create([
            'id_microsoft_entra' => 'ms-entra-hys-002',
            'nombre_completo' => 'Viol (Técnica Higiene y Seguridad)',
            'dni' => 32444555,
            'legajo' => 1002,
            'email' => 'hys.viol@antadeldorado.com',
            'password' => $passwordGenerica,
            'rol' => 'Lic_HyS',
            'permisos_json' => ['ver dashboard', 'descargar reportes', 'gestionar cursos', 'gestionar cuadrillas'],
            'centro_costo' => 'CC-HYS-01',
            'zona_geografica_establecimient' => 'Las Lajitas',
            'estado_operativo' => 'Activo',
            'disponible_soporte' => false,
            'fecha_ingreso' => '2021-06-15',
        ]);
        $viol->assignRole($roleHyS);

        $licRrhh = User::create([
            'id_microsoft_entra' => 'ms-entra-rrhh-003',
            'nombre_completo' => 'Lic. Carolina Gómez (Inducción RRHH)',
            'dni' => 35888999,
            'legajo' => 1003,
            'email' => 'carolina.rrhh@antadeldorado.com',
            'password' => $passwordGenerica,
            'rol' => 'Lic_RRHH',
            'permisos_json' => ['ver dashboard', 'gestionar colaboradores', 'responder tickets', 'enviar notificaciones'],
            'centro_costo' => 'CC-ADM-01',
            'zona_geografica_establecimient' => 'Las Lajitas',
            'estado_operativo' => 'Activo',
            'disponible_soporte' => true,
            'fecha_ingreso' => '2022-02-10',
        ]);
        $licRrhh->assignRole($roleRRHH);

        $colaboradoresPiloto = [];
        $departamentosOperativos = ['Cosecha', 'Empaque', 'Mantenimiento', 'Logística'];

        $supervisorLajitas = User::create([
            'id_microsoft_entra' => 'ms-entra-op-2001',
            'nombre_completo' => 'Roberto Méndez (Encargado Las Lajitas)',
            'dni' => 28500101,
            'legajo' => 2001,
            'email' => 'roberto.mendez@antadeldorado.com',
            'password' => $passwordGenerica,
            'rol' => 'Supervisor',
            'permisos_json' => [],
            'centro_costo' => 'Cosecha',
            'zona_geografica_establecimient' => 'Las Lajitas',
            'estado_operativo' => 'Activo',
            'fecha_ingreso' => now()->subDays(30)->toDateString(),
            'fcm_token' => 'fcm_fake_token_supervisor_2001',
        ]);
        $supervisorLajitas->assignRole($roleSupervisor);
        $colaboradoresPiloto[] = $supervisorLajitas;

        $nombresOperarios = [
            'Juan Carlos Mamani', 'Pedro Ignacio Tolaba', 'Miguel Ángel Chocobar',
            'Luis Alberto Salvatierra', 'Carlos Daniel Farfán', 'Jorge Eduardo Arias',
            'Ramón Alejandro Cruz', 'Héctor Gabriel Cardozo', 'Diego Armando Burgos',
            'Facundo Nicolás Sajama', 'Walter Osvaldo Flores', 'Sergio Fabián Copa',
            'Mario Rubén Villalba', 'Cristian David Guaymás', 'Claudio Ezequiel Paz',
            'Franco Maximiliano Ríos', 'Esteban Matías Acosta', 'Gustavo Adolfo Miranda'
        ];

        foreach ($nombresOperarios as $index => $nombre) {
            $nro = $index + 2;
            $estado = 'Activo';
            if ($nro === 18) $estado = 'Vacaciones';
            if ($nro === 19) $estado = 'Lesionado';

            $diasAntiguedad = match (true) {
                $nro <= 6  => 45,
                $nro <= 12 => 15,
                default    => 3,
            };

            $deptoAsignado = $departamentosOperativos[$index % count($departamentosOperativos)];

            $operario = User::create([
                'id_microsoft_entra' => "ms-entra-op-20" . str_pad((string)$nro, 2, '0', STR_PAD_LEFT),
                'nombre_completo' => $nombre,
                'dni' => 36000000 + ($nro * 115),
                'legajo' => 2000 + $nro,
                'email' => 'operario' . $nro . '@antadeldorado.com',
                'password' => $passwordGenerica,
                'rol' => 'Operario',
                'permisos_json' => [],
                'centro_costo' => $deptoAsignado,
                'zona_geografica_establecimient' => 'Las Lajitas',
                'estado_operativo' => $estado,
                'fecha_ingreso' => now()->subDays($diasAntiguedad)->toDateString(),
                'fcm_token' => "fcm_fake_token_op_" . (2000 + $nro),
            ]);
            $operario->assignRole($roleOperario);
            $colaboradoresPiloto[] = $operario;
        }

        // Operarios adicionales en otros nodos, departamentos y fechas escalonadas
        $extrasNodos = [
            ['nombre' => 'Lucas Díaz', 'dni' => 40111222, 'legajo' => 3001, 'email' => 'lucas.anta@antadeldorado.com', 'nodo' => 'Anta', 'depto' => 'Cosecha', 'dias' => 5],
            ['nombre' => 'Martín Ezequiel Sosa', 'dni' => 40222333, 'legajo' => 3002, 'email' => 'martin.mollinedo@antadeldorado.com', 'nodo' => 'Coronel Mollinedo', 'depto' => 'Mantenimiento', 'dias' => 22],
            ['nombre' => 'Federico Nahuel Quiroga', 'dni' => 40333444, 'legajo' => 3003, 'email' => 'federico.laguna@antadeldorado.com', 'nodo' => 'Laguna Verde', 'depto' => 'Logística', 'dias' => 65],
            ['nombre' => 'Sebastián Andrés Romero', 'dni' => 40444555, 'legajo' => 3004, 'email' => 'sebastian.anta@antadeldorado.com', 'nodo' => 'Anta', 'depto' => 'Empaque', 'dias' => 140],
        ];

        $colaboradoresOtrasZonas = [];
        foreach ($extrasNodos as $idx => $ex) {
            $opExtra = User::create([
                'nombre_completo' => $ex['nombre'],
                'dni' => $ex['dni'],
                'legajo' => $ex['legajo'],
                'email' => $ex['email'],
                'password' => $passwordGenerica,
                'rol' => 'Operario',
                'permisos_json' => [],
                'centro_costo' => $ex['depto'],
                'zona_geografica_establecimient' => $ex['nodo'],
                'estado_operativo' => 'Activo',
                'fecha_ingreso' => now()->subDays($ex['dias'])->toDateString(),
                'fcm_token' => 'fcm_fake_token_extra_' . $ex['legajo'],
            ]);
            $opExtra->assignRole($roleOperario);
            $colaboradoresOtrasZonas[] = $opExtra;
        }

        // 6. Crear Cuadrillas Activas (estado = 'Activa' en texto para coincidir con el controlador)
        $cuadrillaPoda = Cuadrilla::create([
            'nombre_cuadrilla' => 'Cuadrilla 1 - Poda Intensiva Lote Norte',
            'labor_asociada' => 'Poda intensiva y uso de guantes anticorte y gafas',
            'fecha_creacion' => now()->subDays(10)->toDateString(),
            'estado' => 'Activa',
        ]);

        $cuadrillaFumigacion = Cuadrilla::create([
            'nombre_cuadrilla' => 'Cuadrilla 2 - Fumigación Preventiva',
            'labor_asociada' => 'Manejo de agroquímicos y máscaras de filtro',
            'fecha_creacion' => now()->subDays(5)->toDateString(),
            'estado' => 'Activa',
        ]);

        $cuadrillaLogisticaAnta = Cuadrilla::create([
            'nombre_cuadrilla' => 'Cuadrilla 3 - Logística y Carga Anta',
            'labor_asociada' => 'Movimiento de cargas y seguridad vial interna',
            'fecha_creacion' => now()->subDays(20)->toDateString(),
            'estado' => 'Activa',
        ]);

        for ($i = 0; $i < 5; $i++) {
            $cuadrillaPoda->colaboradores()->attach($colaboradoresPiloto[$i]->id, [
                'fecha_asignacion' => now()->subDays(10)->toDateString(),
            ]);
        }

        for ($i = 5; $i < 9; $i++) {
            $cuadrillaFumigacion->colaboradores()->attach($colaboradoresPiloto[$i]->id, [
                'fecha_asignacion' => now()->subDays(5)->toDateString(),
            ]);
        }

        foreach ($colaboradoresOtrasZonas as $opExtra) {
            $cuadrillaLogisticaAnta->colaboradores()->attach($opExtra->id, [
                'fecha_asignacion' => now()->subDays(20)->toDateString(),
            ]);
        }

        // 7. Poblar Catálogo Jerárquico: Cursos -> Módulos -> Lecciones -> Cuestionarios
        // CURSO 1: Inducción Inicial Obligatoria ("El uso de la app")
        $cursoApp = Curso::create([
            'nombre' => 'Inducción Inicial: El Uso de la App',
            'descripcion' => 'Capacitación inicial obligatoria para aprender a navegar la plataforma, usar el dictado por voz y configurar el modo de alto contraste en campo.',
            'tiempo_vigencia' => now()->addYear()->toDateString(),
            'estado_curso' => 'Activo',
            'ids_cursos_req' => [], 
            'version_trimestral' => 1,
        ]);

        $modApp1 = Modulo::create([
            'id_curso' => $cursoApp->id_curso,
            'titulo' => 'Módulo 1: Bienvenida y Herramientas de Accesibilidad',
            'dia_liberacion' => 1,
            'orden' => 1,
        ]);

        Leccion::create([
            'id_modulo' => $modApp1->id_modulo,
            'titulo' => 'Video Corto: Cómo recorrer tus cursos y usar Alto Contraste',
            'tipo_recurso' => 'Video',
            'id_sharepoint_item' => 'sp-item-vid-onboarding-001',
            'orden' => 1,
        ]);

        $lecQuizApp = Leccion::create([
            'id_modulo' => $modApp1->id_modulo,
            'titulo' => 'Evaluación Rápida: Uso de la Plataforma',
            'tipo_recurso' => 'Cuestionario',
            'id_sharepoint_item' => 'sp-item-quiz-001',
            'orden' => 2,
        ]);

        $quizApp = Cuestionario::create([
            'id_leccion' => $lecQuizApp->id_leccion,
            'puntaje_min_aprobacion' => 70,
            'max_intentos' => 3,
            'orden_aleatorio' => true,
            'cantidad_preguntas_mostrar' => 2,
        ]);

        $preg1 = Pregunta::create([
            'id_cuestionario' => $quizApp->id_cuestionario,
            'enunciado' => '¿Qué herramienta de la aplicación te ayuda a leer mejor bajo el sol directo en el campo?',
            'explicacion_refuerzo' => 'Recuerda revisar el minuto 0:45 del video de bienvenida sobre el botón de Alto Contraste y escalado A+/A-.',
        ]);
        Opcion::insert([
            ['id_pregunta' => $preg1->id_pregunta, 'texto_opcion' => 'El modo de Alto Contraste y ajuste de texto A+/A-', 'es_correcta' => true],
            ['id_pregunta' => $preg1->id_pregunta, 'texto_opcion' => 'Apagar los datos móviles del teléfono', 'es_correcta' => false],
            ['id_pregunta' => $preg1->id_pregunta, 'texto_opcion' => 'Reiniciar el cuestionario tres veces', 'es_correcta' => false],
        ]);

        $preg2 = Pregunta::create([
            'id_cuestionario' => $quizApp->id_cuestionario,
            'enunciado' => 'Si tienes una duda sobre seguridad, ¿cómo puedes enviarla a Recursos Humanos desde la app?',
            'explicacion_refuerzo' => 'Puedes usar la bandeja de tickets escribiendo o mediante el micrófono de dictado por voz.',
        ]);
        Opcion::insert([
            ['id_pregunta' => $preg2->id_pregunta, 'texto_opcion' => 'Enviando un Ticket de Consulta mediante texto o dictado por voz', 'es_correcta' => true],
            ['id_pregunta' => $preg2->id_pregunta, 'texto_opcion' => 'No se pueden enviar consultas desde la aplicación', 'es_correcta' => false],
        ]);

        // CURSO 2: Seguridad en Maquinaria Agrícola y EPP (Requisito previo para Elevadores)
        $cursoMaquinaria = Curso::create([
            'nombre' => 'Seguridad en Maquinaria Agrícola y Uso de EPP',
            'descripcion' => 'Protocolos de prevención de accidentes, inspección previa y uso obligatorio de Elementos de Protección Personal en planta.',
            'tiempo_vigencia' => now()->addMonths(6)->toDateString(),
            'estado_curso' => 'Activo',
            'ids_cursos_req' => [$cursoApp->id_curso],
            'version_trimestral' => 1,
        ]);

        $modMaq1 = Modulo::create([
            'id_curso' => $cursoMaquinaria->id_curso,
            'titulo' => 'Módulo Día 1: Protección Ocular y Guantes Anticorte',
            'dia_liberacion' => 1,
            'orden' => 1,
        ]);

        Leccion::create([
            'id_modulo' => $modMaq1->id_modulo,
            'titulo' => 'Cápsula TikTok: Uso correcto de gafas y guantes',
            'tipo_recurso' => 'Video',
            'id_sharepoint_item' => 'sp-item-vid-epp-002',
            'orden' => 1,
        ]);

        Leccion::create([
            'id_modulo' => $modMaq1->id_modulo,
            'titulo' => 'Mapa de Riesgos de Planta Las Lajitas (PDF)',
            'tipo_recurso' => 'PDF',
            'id_sharepoint_item' => 'sp-item-pdf-mapa-lajitas-003',
            'orden' => 2,
        ]);

        $modMaq2 = Modulo::create([
            'id_curso' => $cursoMaquinaria->id_curso,
            'titulo' => 'Módulo Día 2: Distancias de Seguridad y Bloqueo',
            'dia_liberacion' => 2,
            'orden' => 2,
        ]);

        $lecQuizMaq = Leccion::create([
            'id_modulo' => $modMaq2->id_modulo,
            'titulo' => 'Cuestionario Final: Maquinaria y EPP',
            'tipo_recurso' => 'Cuestionario',
            'id_sharepoint_item' => 'sp-item-quiz-maq-004',
            'orden' => 1,
        ]);

        $quizMaq = Cuestionario::create([
            'id_leccion' => $lecQuizMaq->id_leccion,
            'puntaje_min_aprobacion' => 80,
            'max_intentos' => 3,
            'orden_aleatorio' => true,
            'cantidad_preguntas_mostrar' => 3,
        ]);

        $pregMaq1 = Pregunta::create([
            'id_cuestionario' => $quizMaq->id_cuestionario,
            'enunciado' => '¿Cuándo es obligatorio colocar las gafas de seguridad durante la poda o desmalezado?',
            'explicacion_refuerzo' => 'Repasa el PDF de Normas de Higiene y Seguridad: las gafas deben colocarse antes de encender cualquier herramienta.',
        ]);
        $opCorrectaMaq1 = Opcion::create(['id_pregunta' => $pregMaq1->id_pregunta, 'texto_opcion' => 'Siempre, antes de ingresar al lote o encender el equipo', 'es_correcta' => true]);
        $opIncorrectaMaq1 = Opcion::create(['id_pregunta' => $pregMaq1->id_pregunta, 'texto_opcion' => 'Solo cuando hay viento fuerte', 'es_correcta' => false]);

        // CURSO 3: Operación Segura de Elevadores (Correlativo: Exige Curso 2 aprobado)
        $cursoElevadores = Curso::create([
            'nombre' => 'Operación Segura de Elevadores y Carga',
            'descripcion' => 'Capacitación avanzada para operarios habilitados. Requiere haber aprobado Seguridad en Maquinaria Agrícola.',
            'tiempo_vigencia' => now()->addMonths(6)->toDateString(),
            'estado_curso' => 'Activo',
            'ids_cursos_req' => [$cursoMaquinaria->id_curso], 
            'version_trimestral' => 1,
        ]);

        // 8. Registrar Auditoría de creación de cursos
        AuditAdmin::create([
            'id_usuario' => $viol->id,
            'id_curso' => $cursoApp->id_curso,
            'accion' => 'Creación y publicación inicial del curso',
            'fecha_evento' => now()->subDays(10),
            'estado_resultante' => 'Activo',
        ]);

        AuditAdmin::create([
            'id_usuario' => $viol->id,
            'id_curso' => $cursoMaquinaria->id_curso,
            'accion' => 'Vinculación con SharePoint y activación para Las Lajitas',
            'fecha_evento' => now()->subDays(5),
            'estado_resultante' => 'Activo',
        ]);

        // 9. Poblar Progreso de Cursos e Intentos de Evaluación para la Prueba Piloto
        foreach ($colaboradoresPiloto as $index => $colab) {
            // Inscribir a todos en el Curso 1 (Uso de la App)
            $completado = $index < 10; // Los primeros 10 ya lo aprobaron al 100%
            $progreso1 = ProgresoCurso::create([
                'id_usuario' => $colab->id,
                'id_curso' => $cursoApp->id_curso,
                'id_cuadrilla' => null,
                'fecha_inicio' => now()->subDays(5)->toDateString(),
                'fecha_finalizacion' => $completado ? now()->subDays(3)->toDateString() : null,
                'porcentaje_avance' => $completado ? 100 : 50,
                'ultima_visita' => now()->subHours($index + 1),
                'url_certificado_pdf' => $completado ? "/storage/certificados/cert_user_{$colab->id}_curso_1.pdf" : null,
                'valoracion_curso' => $completado ? 5.0 : null,
                'estado' => $completado ? 'Completado' : 'En_Curso',
            ]);

            if ($completado) {
                $resp = RespuestaUsuario::create([
                    'id_cuestionario' => $quizApp->id_cuestionario,
                    'id_progreso' => $progreso1->id_progreso,
                    'fecha_respuesta' => now()->subDays(3)->toDateString(),
                    'calificacion_obtenida' => 100,
                    'nro_intento' => 1,
                ]);
            }
        }

        // Inscribir a los 5 miembros de la Cuadrilla 1 en el Curso de Maquinaria y EPP
        for ($i = 0; $i < 5; $i++) {
            $esBloqueado = ($i === 4); // Simulamos que el 5to operario falló 3 veces y se le bloqueó
            $progresoCuadrilla = ProgresoCurso::create([
                'id_usuario' => $colaboradoresPiloto[$i]->id,
                'id_curso' => $cursoMaquinaria->id_curso,
                'id_cuadrilla' => $cuadrillaPoda->id_cuadrilla,
                'fecha_inicio' => now()->subDays(2)->toDateString(),
                'fecha_finalizacion' => ($i < 3) ? now()->subDay()->toDateString() : null,
                'porcentaje_avance' => ($i < 3) ? 100 : 80,
                'ultima_visita' => now()->subHours(2),
                'url_certificado_pdf' => ($i < 3) ? "/storage/certificados/cert_user_{$colaboradoresPiloto[$i]->id}_curso_2.pdf" : null,
                'valoracion_curso' => ($i < 3) ? 4.5 : null,
                'estado' => $esBloqueado ? 'Bloqueado' : (($i < 3) ? 'Completado' : 'En_Curso'),
            ]);

            if ($esBloqueado) {
                // Registramos los 3 intentos fallidos para auditoría de RRHH
                for ($intento = 1; $intento <= 3; $intento++) {
                    $respFallo = RespuestaUsuario::create([
                        'id_cuestionario' => $quizMaq->id_cuestionario,
                        'id_progreso' => $progresoCuadrilla->id_progreso,
                        'fecha_respuesta' => now()->toDateString(),
                        'calificacion_obtenida' => 40,
                        'nro_intento' => $intento,
                    ]);

                    DetalleRespuesta::create([
                        'id_pregunta' => $pregMaq1->id_pregunta,
                        'id_opcion' => $opIncorrectaMaq1->id_opcion,
                        'id_respuesta' => $respFallo->id_respuesta,
                    ]);
                }
            }
        }

        // Progresos de Cuadrilla 2 (Empaque / Mantenimiento - Las Lajitas)
        for ($i = 5; $i < 9; $i++) {
            $progC2 = ProgresoCurso::create([
                'id_usuario'        => $colaboradoresPiloto[$i]->id,
                'id_curso'          => $cursoApp->id_curso,
                'id_cuadrilla'      => $cuadrillaFumigacion->id_cuadrilla,
                'fecha_inicio'      => now()->subDays(18)->toDateString(),
                'porcentaje_avance' => $i === 8 ? 30 : 65,
                'ultima_visita'     => now()->subDays(18),
                'estado'            => $i === 8 ? 'Bloqueado' : 'En_Curso',
            ]);
            $progC2->timestamps = false;
            $progC2->update(['updated_at' => now()->subDays(18)]);
        }

        // Progresos de Cuadrilla 3 (Otros nodos y fechas antiguas: 2, 22, 65 y 135 días)
        $diasEscalones = [2, 22, 65, 135];
        foreach ($colaboradoresOtrasZonas as $idx => $opExtra) {
            $diasAtras = $diasEscalones[$idx] ?? 10;
            $bloqueadoExtra = ($idx % 2 === 1); // Martín (Mollinedo, 22d) y Sebastián (Anta, 135d) bloqueados
            $progExtra = ProgresoCurso::create([
                'id_usuario'        => $opExtra->id,
                'id_curso'          => $cursoMaquinaria->id_curso,
                'id_cuadrilla'      => $cuadrillaLogisticaAnta->id_cuadrilla,
                'fecha_inicio'      => now()->subDays($diasAtras)->toDateString(),
                'porcentaje_avance' => $bloqueadoExtra ? 40 : 60,
                'ultima_visita'     => now()->subDays($diasAtras),
                'estado'            => $bloqueadoExtra ? 'Bloqueado' : 'En_Curso',
            ]);
            $progExtra->timestamps = false;
            $progExtra->update(['updated_at' => now()->subDays($diasAtras)]);
        }

// 10. Poblar Bandeja de Tickets (Nuevo Sistema de Chat)
        // Ticket 1: Resuelto (Chat completo)
        $ticket1 = TicketConsulta::create([
            'id_usuario' => $colaboradoresPiloto[1]->id, 
            'id_curso' => $cursoMaquinaria->id_curso,
            'id_admin_asignado' => $licRrhh->id,
            'categoria_consulta' => 'Higiene y Seguridad',
            'asunto_resumen' => 'Gafas rayadas lote norte',
            'estado_ticket' => 'Resuelto',
            'calificacion_respuesta' => 5,
        ]);

        MensajeTicket::create([
            'id_ticket' => $ticket1->id_ticket,
            'id_emisor_usuario' => $colaboradoresPiloto[1]->id,
            'cuerpo_mensaje' => 'Hola, mis gafas de protección están rayadas antes de empezar la poda en el lote norte.',
        ]);

        MensajeTicket::create([
            'id_ticket' => $ticket1->id_ticket,
            'id_emisor_usuario' => $licRrhh->id,
            'cuerpo_mensaje' => 'Hola Juan Carlos. Puedes retirar un par nuevo hoy en el pañol.',
        ]);

        // Ticket 2: Nuevo en Bandeja (Nadie lo ha tomado aún)
        $ticket2 = TicketConsulta::create([
            'id_usuario' => $colaboradoresPiloto[4]->id,
            'id_curso' => $cursoMaquinaria->id_curso,
            'id_admin_asignado' => null, // Huérfano en bandeja general
            'categoria_consulta' => 'Sistema / Cursos',
            'asunto_resumen' => 'Bloqueo en cuestionario',
            'estado_ticket' => 'Abierto',
        ]);

        MensajeTicket::create([
            'id_ticket' => $ticket2->id_ticket,
            'id_emisor_usuario' => $colaboradoresPiloto[4]->id,
            'cuerpo_mensaje' => 'Se me bloqueó el cuestionario después del tercer intento, ¿me lo habilitan?',
        ]);

        $this->call(NotificacionesSeeder::class);
    }
}