<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OperarioBloqueadoMail extends Mailable
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
            subject: 'URGENTE: Operario Bloqueado en Inducción (' . ($this->data['operario_nombre'] ?? '') . ')',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.operarios.bloqueado',
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