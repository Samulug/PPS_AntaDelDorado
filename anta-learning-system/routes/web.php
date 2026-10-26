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

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('/colaboradores', [UserController::class, 'index'])->name('colaboradores.index');

    Route::post('/colaboradores', [UserController::class, 'store'])->name('colaboradores.store');
    Route::patch('/colaboradores/{user}/status', [UserController::class, 'updateStatus'])->name('colaboradores.status');
    Route::post('/colaboradores/{user}/reset-password', [UserController::class, 'forcePasswordReset'])->name('colaboradores.reset-password');

    // Rutas para Cuadrillas
    Route::get('/cuadrillas', [CuadrillaController::class, 'index'])->name('cuadrillas.index');
    Route::get('/cuadrillas/create', [CuadrillaController::class, 'create'])->name('cuadrillas.create');
    Route::get('/cuadrillas/{cuadrilla}/edit', [CuadrillaController::class, 'edit'])->name('cuadrillas.edit');

    Route::post('/cuadrillas/borrador', [CuadrillaController::class, 'saveDraft'])->name('cuadrillas.draft');
  
    Route::post('/cuadrillas', [CuadrillaController::class, 'store'])->name('cuadrillas.store');
    Route::put('/cuadrillas/{cuadrilla}', [CuadrillaController::class, 'update'])->name('cuadrillas.update');
    Route::delete('/cuadrillas/{cuadrilla}', [CuadrillaController::class, 'destroy'])->name('cuadrillas.destroy');
});

require __DIR__.'/auth.php';
