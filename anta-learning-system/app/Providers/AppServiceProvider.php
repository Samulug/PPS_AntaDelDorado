<?php

namespace App\Providers;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        if (app()->isLocal()) {
        Model::preventLazyLoading(); // lanza error si hay N+1
        DB::listen(function ($query) {
        if ($query->time > 200) {
            logger()->warning('Query lenta', [
                'ms' => $query->time,
                'sql' => $query->sql,
                'bindings' => $query->bindings,
            ]);
        }
    });
}
    }
}
