<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CursoEstadoActualizadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(protected array $data)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(
                config('mail.from.address', 'notificaciones@antadeldorado.com'),
                config('mail.from.name', 'Anta del Dorado LMS')
            ),
            subject: 'Aviso de Auditoría: Cambio de estado en curso "' . ($this->data['curso_nombre'] ?? '') . '"',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cursos.estado_actualizado',
            with: [
                'data' => $this->data,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}