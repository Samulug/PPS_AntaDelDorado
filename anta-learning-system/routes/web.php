<?php
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CuadrillaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CursoController;
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


/*Route::middleware(['auth', 'verified'])->group(function (){
    Route::get('/dashboard',[DashboardController::class,'index'])->name('dashboard');
});*/

Route::middleware(['auth', 'verified', 'dashboard.access'])->group(function () {

    Route::get('/dashboard',[DashboardController::class,'index'])->name('dashboard');
    
    //Perfil
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    //rutas colaboradores
    Route::resource('colaboradores',UserController::class);
    Route::patch('/colaboradores/{id}/status', [UserController::class, 'updateStatus'])->name('colaboradores.status');
    Route::post('/colaboradores/{id}/reset-password', [UserController::class, 'forcePasswordReset'])->name('colaboradores.reset-password');
    
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

    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::get('/roles/create', [RoleController::class, 'createRole'])->name('roles.create');
    Route::post('/roles', [RoleController::class, 'storeRole'])->name('roles.store');
    Route::put('/roles/{role}/permissions', [RoleController::class, 'updateRolePermissions'])->name('roles.permissions.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroyRole'])->name('roles.destroy');

    Route::get('/administradores/create', [RoleController::class, 'createAdmin'])->name('roles.admins.create'); 
    Route::post('/roles/administradores', [RoleController::class, 'storeAdmin'])->name('roles.admins.store');
    Route::patch('/roles/administradores/{user}', [RoleController::class, 'updateAdmin'])->name('roles.admins.update');
    });

require __DIR__.'/auth.php';
