<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificación del Sistema · Anta del Dorado</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; width: 100% !important;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 40px 10px;">
        <tr>
            <td align="center">
                <!-- Contenedor Principal -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
                    <!-- Encabezado Corporativo -->
                    <tr>
                        <td style="background-color: #2F6F5E; padding: 24px; text-align: center;">
                            <span style="display: block; color: #A7F3D0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                                Anta del Dorado S.A. · Onboarding y Microlearning
                            </span>
                            <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">
                                @yield('header_title', 'Notificación de Gestión')
                            </h2>
                        </td>
                    </tr>
                    <!-- Contenido Dinámico -->
                    <tr>
                        <td style="padding: 32px; color: #374151; font-size: 16px; line-height: 1.6;">
                            @yield('content')
                        </td>
                    </tr>
                    <!-- Pie de página -->
                    <tr>
                        <td style="background-color: #fafafa; padding: 16px 32px; text-align: center; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 13px;">
                            Este es un correo automático emitido por el Panel de Auditoría de Anta del Dorado. Por favor, no respondas a este mensaje.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>