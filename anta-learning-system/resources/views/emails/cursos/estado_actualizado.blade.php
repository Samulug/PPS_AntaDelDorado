@extends('emails.layout')

@section('header_title', 'Cambio de Estado en Catálogo de Cursos')

@section('content')
    <p style="margin-top: 0; margin-bottom: 20px; font-size: 17px; color: #111827;">
        Estimad@ <strong>{{ $data['creador_nombre'] }}</strong>,
    </p>

    <p style="margin-top: 0; margin-bottom: 24px; color: #4b5563;">
        Te informamos que otro perfil administrativo ha modificado el estado de publicación de un curso bajo tu autoría original:
    </p>

    <!-- Tarjeta de datos del curso -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 6px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <tr>
            <td style="padding: 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Curso Afectado</p>
                <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 600;">{{ $data['curso_nombre'] }}</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 0 20px 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Nuevo Estado Resultante</p>
                <p style="margin: 0; font-size: 15px; color: #2F6F5E; font-weight: 700;">{{ $data['nuevo_estado'] }} ({{ $data['accion'] }})</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 0 20px 16px 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Ejecutado por</p>
                <p style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 500;">{{ $data['ejecutor_nombre'] }} ({{ $data['ejecutor_rol'] }}) — {{ $data['fecha'] }}</p>
            </td>
        </tr>
    </table>

    <!-- Alerta de trazabilidad -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 0;">
        <tr>
            <td style="padding: 16px;">
                <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-weight: 500;">
                    <strong>Registro de Auditoría:</strong> Este movimiento ha quedado asentado en el historial de trazabilidad (<em>audit_admin</em>). Si consideras que el curso no debía cambiar de estado, coordina con el área correspondiente.
                </p>
            </td>
        </tr>
    </table>
@endsection