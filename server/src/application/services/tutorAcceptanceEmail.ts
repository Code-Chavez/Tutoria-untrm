import { MailMessage } from '@application/ports/Mailer';

const INSTITUTION = 'Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas';
const AREA = 'Dirección de Bienestar Universitario';
const SYSTEM = 'Sistema Integral de Tutoría (SIT)';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface AcceptanceEmailInput {
  tutor: { email: string; firstName: string; lastName: string };
  school: string;
  cycle: number;
  period: string;
  isException: boolean;
  link: string;
  ttlHours: number;
}

/**
 * Correo al docente a quien se asigna un ciclo: debe aceptar (indicando los días y las horas en que atiende) o rechazar. Cuando el
 * ciclo es una excepción (el docente ya atiende otro), el texto lo dice y pregunta si puede asumirlo. No lleva datos de estudiantes.
 */
export function buildTutorAcceptanceEmail(input: AcceptanceEmailInput): MailMessage {
  const name = `${input.tutor.firstName} ${input.tutor.lastName}`.trim();
  const intro = input.isException
    ? `El ciclo ${input.cycle} de ${input.school} no cuenta con docente tutor en el periodo ${input.period}. Como excepción, se le consulta si puede asumirlo además del ciclo que ya atiende.`
    : `Se le ha propuesto como docente tutor del ciclo ${input.cycle} de ${input.school} en el periodo ${input.period}.`;
  const ask = 'Por favor confirme si acepta. Si acepta, indique los días y las horas en que atenderá a sus estudiantes (la sesión dura 45 minutos); si no puede, indíquelo para que la coordinación asigne a otro docente.';
  const validity = `El enlace es personal, sirve una sola vez y vence en ${input.ttlHours} horas.`;
  const safe = escapeHtml(input.link);

  const text = [
    `Estimado(a) ${name}:`,
    '',
    intro,
    ask,
    '',
    `Responder: ${input.link}`,
    '',
    validity,
    'No comparta este enlace. Si no esperaba este mensaje, ignórelo y avise a Bienestar Universitario.',
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
<p style="margin:0 0 14px;">Estimado(a) ${escapeHtml(name)}:</p>
<p style="margin:0 0 14px;">${escapeHtml(intro)}</p>
<p style="margin:0 0 14px;">${escapeHtml(ask)}</p>
<p style="margin:22px 0;text-align:center;"><a href="${safe}" style="background:#14315f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;display:inline-block;">Responder ahora</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#5b6677;">Si el botón no funciona, copie esta dirección en su navegador:<br><a href="${safe}" style="color:#14315f;word-break:break-all;">${safe}</a></p>
<p style="margin:18px 0 0;font-size:13px;color:#5b6677;">${escapeHtml(validity)} No comparta este enlace. Si no esperaba este mensaje, ignórelo y avise a Bienestar Universitario.</p>
<p style="margin:24px 0 0;">Atentamente,<br><strong>${escapeHtml(AREA)}</strong><br>${escapeHtml(INSTITUTION)}<br>${escapeHtml(SYSTEM)}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  return { to: input.tutor.email, subject: `Confirmación como docente tutor — ${input.school}, ciclo ${input.cycle} (${input.period})`, text, html };
}

export interface DeclineEmailInput {
  coordinatorEmail: string;
  tutorName: string;
  school: string;
  cycle: number;
  period: string;
  reason: string;
}

/** Aviso a la coordinación de que el docente rechazó el ciclo, para que asigne a otro. */
export function buildTutorDeclinedEmail(input: DeclineEmailInput): MailMessage {
  const text = [
    'Estimado(a) coordinador(a):',
    '',
    `El docente ${input.tutorName} rechazó ser tutor del ciclo ${input.cycle} de ${input.school} en el periodo ${input.period}.`,
    `Motivo: ${input.reason}`,
    '',
    'Ingrese a «Tutores por ciclo» para asignar a otro docente.',
    '',
    'Atentamente,',
    AREA,
    SYSTEM,
  ].join('\n');
  const html = `<p>Estimado(a) coordinador(a):</p><p>El docente <strong>${escapeHtml(input.tutorName)}</strong> rechazó ser tutor del ciclo ${input.cycle} de ${escapeHtml(input.school)} en el periodo ${escapeHtml(input.period)}.</p><p>Motivo: ${escapeHtml(input.reason)}</p><p>Ingrese a «Tutores por ciclo» para asignar a otro docente.</p><p>Atentamente,<br>${escapeHtml(AREA)}<br>${escapeHtml(SYSTEM)}</p>`;
  return { to: input.coordinatorEmail, subject: `Docente rechazó el ciclo ${input.cycle} — ${input.school}`, text, html };
}
