import { MailMessage } from '@application/ports/Mailer';

const INSTITUTION = 'Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas';
const AREA = 'Dirección de Bienestar Universitario';
const SYSTEM = 'Sistema Integral de Tutoría (SIT)';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Invitación para activar una cuenta nueva. El correo **no lleva ninguna clave**: solo un enlace de un solo uso y con
 * vencimiento con el que la persona crea la suya. Tampoco lleva datos de tutoría.
 */
export function buildInvitationEmail(
  recipient: { email: string; firstName: string; lastName?: string },
  link: string,
  ttlHours: number,
): MailMessage {
  const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ').trim();
  const greeting = `Estimado(a) ${name}:`;
  const validity = `El enlace sirve una sola vez y vence en ${ttlHours} horas.`;
  const body =
    'La Dirección de Bienestar Universitario creó su cuenta en el Sistema Integral de Tutoría. Para activarla, cree su propia contraseña con el siguiente enlace.';
  const safe = escapeHtml(link);

  const text = [
    greeting,
    '',
    body,
    '',
    `Activar mi cuenta: ${link}`,
    '',
    validity,
    'No comparta este enlace: quien lo abra primero podrá crear la contraseña de la cuenta. Si no esperaba este mensaje, ignórelo y avise a Bienestar Universitario.',
    'Si el enlace venció o ya se usó, solicite uno nuevo a la persona que administra el sistema.',
    '',
    'Atentamente,',
    AREA,
    INSTITUTION,
    SYSTEM,
    '',
    'Este es un mensaje automático: por favor, no responda a este correo.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#1a2433;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f8;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
<tr><td style="background:#14315f;color:#ffffff;padding:20px 28px;">
<div style="font-size:12px;letter-spacing:.5px;text-transform:uppercase;opacity:.85;">${escapeHtml(INSTITUTION)}</div>
<div style="font-size:18px;font-weight:bold;margin-top:4px;">${escapeHtml(AREA)}</div>
</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6;">
<p style="margin:0 0 14px;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 14px;">${escapeHtml(body)}</p>
<p style="margin:22px 0;text-align:center;"><a href="${safe}" style="background:#14315f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;display:inline-block;">Activar mi cuenta</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#5b6677;">Si el botón no funciona, copie esta dirección en su navegador:<br><a href="${safe}" style="color:#14315f;word-break:break-all;">${safe}</a></p>
<p style="margin:18px 0 0;font-size:13px;color:#5b6677;">${escapeHtml(validity)} No comparta este enlace: quien lo abra primero podrá crear la contraseña de la cuenta. Si no esperaba este mensaje, ignórelo y avise a Bienestar Universitario. Si el enlace venció o ya se usó, solicite uno nuevo a la persona que administra el sistema.</p>
<p style="margin:24px 0 0;">Atentamente,<br><strong>${escapeHtml(AREA)}</strong><br>${escapeHtml(INSTITUTION)}<br>${escapeHtml(SYSTEM)}</p>
</td></tr>
<tr><td style="background:#f2f5f8;color:#7a8596;font-size:11px;padding:14px 28px;">Mensaje automático: por favor, no responda a este correo.</td></tr>
</table></td></tr></table></body></html>`;

  return { to: recipient.email, subject: 'Active su cuenta — SIT UNTRM', text, html };
}
