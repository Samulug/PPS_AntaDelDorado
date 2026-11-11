@extends('emails.layout')

@section('header_title', 'Alerta Crítica · Operario Bloqueado')

@section('content')
    <p style="margin-top: 0; margin-bottom: 20px; font-size: 17px; color: #111827;">
        Estimado equipo de <strong>Recursos Humanos / Higiene y Seguridad</strong>,
    </p>

    <p style="margin-top: 0; margin-bottom: 24px; color: #4b5563;">
        Un colaborador ha alcanzado el límite máximo de intentos reprobados en su evaluación y su capacitación ha quedado en estado <strong>Bloqueado</strong>, requiriendo intervención para destrabar su inducción:
    </p>

    <!-- Tarjeta de datos del operario -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 6px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <tr>
            <td style="padding: 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Colaborador y Legajo</p>
                <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 600;">{{ $data['operario_nombre'] }} (Legajo #{{ $data['operario_legajo'] }})</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 0 20px 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Nodo Productivo / Planta</p>
                <p style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 500;">{{ $data['nodo'] }}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 0 20px 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Curso y Evaluación Bloqueada</p>
                <p style="margin: 0; font-size: 15px; color: #b91c1c; font-weight: 600;">{{ $data['curso_nombre'] }} ({{ $data['intentos'] }} intentos agotados · Última nota: {{ $data['ultima_nota'] }}%)</p>
            </td>
        </tr>
    </table>

    <!-- Alerta de intervención -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; margin-bottom: 0;">
        <tr>
            <td style="padding: 16px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">
                    <strong>Acción requerida:</strong> Ingresa al Panel Web de RRHH para brindar refuerzo presencial o habilitar un reintento excepcional al colaborador.
                </p>
            </td>
        </tr>
    </table>
@endsection