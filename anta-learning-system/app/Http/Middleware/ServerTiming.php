<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ServerTiming {
    public function handle(Request $request, Closure $next): Response
    {
        if (! app()->isLocal()) {
            return $next($request);
        }

        $start = defined('LARAVEL_START') ? LARAVEL_START : microtime(true);
        $dbMs = 0.0;
        $count = 0;

        DB::listen(function ($q) use (&$dbMs, &$count) {
            $dbMs += $q->time;
            $count++;
        });

        $response = $next($request);

        $total = (microtime(true) - $start) * 1000;
        $response->headers->set('Server-Timing', sprintf(
            'db;dur=%.1f;desc="DB (%d queries)", app;dur=%.1f, total;dur=%.1f',
            $dbMs, $count, max($total - $dbMs, 0), $total
        ));

        return $response;
    }
}
