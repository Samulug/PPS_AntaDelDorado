<?php
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CuadrillaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CursoController;
use App\Http\Controllers\TicketConsultaController;
use App\Http\Controllers\NotificacionController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified', 'dashboard.access'])->group(function () {
    // Dashboard
    Route::get('/dashboard',[DashboardController::class,'index'])->name('dashboard');
        Route::get('/dashboard/export-pdf', [DashboardController::class, 'exportPdf'])
        ->name('dashboard.export.pdf');
    Route::get('/dashboard/export-excel', [DashboardController::class, 'exportExcel'])
        ->name('dashboard.export.excel');

    // Perfil
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/test-email', [ProfileController::class, 'sendTestEmail'])
    ->name('profile.test-email');

    // Rutas colaboradores
    Route::get('/colaboradores/export', [UserController::class, 'export'])->name('colaboradores.export');
    Route::resource('colaboradores',UserController::class);
    Route::patch('/colaboradores/{id}/status', [UserController::class, 'updateStatus'])->name('colaboradores.status');
    Route::post('/colaboradores/{id}/reset-password', [UserController::class, 'forcePasswordReset'])->name('colaboradores.reset-password');
    Route::post('/colaboradores/{userId}/progresos/{progresoId}/desbloquear', [UserController::class, 'unlockCourse'])
    ->name('colaboradores.unlock-course');
    
    // Rutas para Cuadrillas
    Route::resource('cuadrillas',CuadrillaController::class);
    Route::post('/cuadrillas/borrador', [CuadrillaController::class, 'saveDraft'])->name('cuadrillas.draft');
    Route::patch('/cuadrillas/{id}/status', [CuadrillaController::class, 'updateStatus'])->name('cuadrillas.status');


    // Rutas de Cursos
    Route::resource('cursos',CursoController::class);
    Route::post('/cursos/borrador', [CursoController::class, 'saveDraft'])->name('cursos.draft');
    Route::patch('/cursos/{id}/status', [CursoController::class, 'updateStatus'])->name('cursos.status');
    Route::post('/cursos/multimedia/upload', [CursoController::class, 'uploadMultimedia'])
    ->name('cursos.multimedia.upload');
    
    // Roles
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::get('/roles/create', [RoleController::class, 'createRole'])->name('roles.create');
    Route::post('/roles', [RoleController::class, 'storeRole'])->name('roles.store');
    Route::put('/roles/{role}/permissions', [RoleController::class, 'updateRolePermissions'])->name('roles.permissions.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroyRole'])->name('roles.destroy');

    // Admins
    Route::get('/administradores/create', [RoleController::class, 'createAdmin'])->name('roles.admins.create'); 
    Route::post('/roles/administradores', [RoleController::class, 'storeAdmin'])->name('roles.admins.store');
    Route::patch('/roles/administradores/{user}', [RoleController::class, 'updateAdmin'])->name('roles.admins.update');


    // Vista Principal 
    Route::get('/consultas', [TicketConsultaController::class, 'index'])
        ->name('consultas.index');

    Route::post('/consultas/{id_ticket}/responder', [TicketConsultaController::class, 'responder'])
        ->name('consultas.responder');
    Route::delete('/consultas/mensaje/{id_mensaje}/deshacer', [TicketConsultaController::class, 'deshacerMensaje'])
        ->name('consultas.deshacer');

    Route::post('/consultas/{id_ticket}/derivar', [TicketConsultaController::class, 'derivar'])
        ->name('consultas.derivar');
    Route::post('/consultas/{id_ticket}/devolver-cola', [TicketConsultaController::class, 'devolverACola'])
        ->name('consultas.devolver');
    Route::patch('/consultas/{id_ticket}/estado', [TicketConsultaController::class, 'cambiarEstado'])
        ->name('consultas.estado');
    Route::post('/consultas/turno/toggle', [TicketConsultaController::class, 'toggleDisponibilidadTurno'])
        ->name('consultas.turno.toggle');
    
    Route::prefix('notificaciones')->name('notificaciones.')->group(function () {
    Route::get('/', [NotificacionController::class, 'index'])->name('index');
    Route::post('/alcance', [NotificacionController::class, 'previewAlcance'])->name('alcance');
    Route::post('/', [NotificacionController::class, 'store'])->name('store');
    Route::post('/{id_notificacion}/cancelar', [NotificacionController::class, 'cancelar'])->name('cancelar');
    
    });

});  

require __DIR__.'/auth.php';
