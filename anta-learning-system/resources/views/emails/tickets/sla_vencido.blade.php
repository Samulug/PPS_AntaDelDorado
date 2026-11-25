@extends('emails.layout')

@section('header_title', 'Alerta de Escalamiento · Ticket Demorado (+48 hs)')

@section('content')
    <p style="margin-top: 0; margin-bottom: 20px; font-size: 17px; color: #111827;">
        Hola <strong>{{ $data['destinatario_nombre'] }}</strong>,
    </p>

    <p style="margin-top: 0; margin-bottom: 24px; color: #4b5563;">
        {{ $data['mensaje_contexto'] }}
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 6px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <tr>
            <td style="padding: 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Ticket y Asunto</p>
                <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 600;">#{{ $data['id_ticket'] }} - {{ $data['asunto'] }} ({{ $data['categoria'] }})</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 0 20px 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Colaborador y Nodo</p>
                <p style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 500;">{{ $data['operario_nombre'] }} (Legajo #{{ $data['operario_legajo'] }}) · {{ $data['nodo'] }}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 0 20px 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Tiempo Transcurrido</p>
                <p style="margin: 0; font-size: 15px; color: #b91c1c; font-weight: 600;">{{ $data['horas_abierto'] }} horas abierto (Estado: {{ $data['estado'] }})</p>
            </td>
        </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; margin-bottom: 0;">
        <tr>
            <td style="padding: 16px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">
                    <strong>Acción requerida:</strong> Ingresa a la Bandeja de Consultas del Panel Web para responder al colaborador, cerrar el ticket si ya fue solucionado o derivarlo al área correspondiente.
                </p>
            </td>
        </tr>
    </table>
@endsection