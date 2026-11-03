<?php
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CuadrillaController;
use App\Http\Controllers\DashboardController;
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

    });

require __DIR__.'/auth.php';
