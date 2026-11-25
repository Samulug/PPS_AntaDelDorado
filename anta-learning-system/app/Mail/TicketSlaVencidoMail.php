<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TicketSlaVencidoMail extends Mailable
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
            subject: 'ALERTA SLA (+48 hs): Consulta sin resolver #' . ($this->data['id_ticket'] ?? ''),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.tickets.sla_vencido',
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