import { MailMessage } from '@application/ports/Mailer';

const INSTITUTION = 'Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas';
const AREA = 'Dirección de Bienestar Universitario';
const SYSTEM = 'Sistema Integral de Tutoría (SIT)';

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface DataRequestEmailInput {
  toEmail: string;
  requester: { firstName: string; lastName: string; email: string };
  school: string;
  faculty?: string;
  period: string;
  cycles: number[];
  note?: string | null;
  attachment: Buffer;
}

/** Columnas que se piden, en el orden de la plantilla adjunta. */
export const REQUESTED_COLUMNS = [
  'código universitario',
  'nombres',
  'apellidos',
  'correo institucional',
  'teléfono (opcional)',
  'ciclo',
  'escuela profesional',
];

/**
 * Pedido formal de la lista de estudiantes de una escuela para un periodo. No lleva datos de estudiantes: solo lo que se pide,
 * a nombre de quién y la plantilla Excel adjunta. Las respuestas llegan a quien hizo el pedido (Reply-To) y recibe copia.
 */
export function buildDataRequestEmail(input: DataRequestEmailInput): MailMessage {
  const who = `${input.requester.firstName} ${input.requester.lastName}`.trim();
  const where = input.faculty ? `${input.school} (${input.faculty})` : input.school;
  const cycles = input.cycles.length > 0 ? ` de los ciclos ${input.cycles.join(', ')}` : ' de todos los ciclos';
  const subject = `Solicitud de lista de estudiantes — ${input.school} — periodo ${input.period}`;
  const note = input.note?.trim();

  const intro = `Estimado(a):`;
  const body1 = `La Dirección de Bienestar Universitario, a través del Sistema Integral de Tutoría (SIT), solicita la lista de estudiantes${cycles} de la Escuela Profesional de ${where} para el periodo académico ${input.period}.`;
  const body2 = `Datos requeridos (una fila por estudiante): ${REQUESTED_COLUMNS.join(', ')}.`;
  const body3 = 'Formato: archivo Excel (.xlsx) con la plantilla adjunta; por favor mantenga los encabezados.';
  const body4 = `Solicitado por: ${who} (${input.requester.email}). Responda a este correo adjuntando el archivo.`;
  const privacy = 'Los datos se usarán únicamente para el acompañamiento y la tutoría universitaria, conforme a la Ley N.° 29733.';

  const text = [intro, '', body1, '', body2, body3, '', body4, ...(note ? ['', `Observaciones: ${note}`] : []), '', privacy, '', 'Atentamente,', AREA, INSTITUTION, SYSTEM].join('\n');

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#1a2433;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f8;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
<tr><td style="background:#14315f;color:#ffffff;padding:20px 28px;">
<div style="font-size:12px;letter-spacing:.5px;text-transform:uppercase;opacity:.85;">${escapeHtml(INSTITUTION)}</div>
<div style="font-size:18px;font-weight:bold;margin-top:4px;">${escapeHtml(AREA)}</div>
</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6;">
<p style="margin:0 0 14px;">${intro}</p>
<p style="margin:0 0 14px;">${escapeHtml(body1)}</p>
<p style="margin:0 0 6px;">${escapeHtml(body2)}</p>
<p style="margin:0 0 14px;">${escapeHtml(body3)}</p>
<p style="margin:0 0 14px;">${escapeHtml(body4)}</p>
${note ? `<p style="margin:0 0 14px;"><strong>Observaciones:</strong> ${escapeHtml(note)}</p>` : ''}
<p style="margin:18px 0 0;font-size:13px;color:#5b6677;">${escapeHtml(privacy)}</p>
<p style="margin:24px 0 0;">Atentamente,<br><strong>${escapeHtml(AREA)}</strong><br>${escapeHtml(INSTITUTION)}<br>${escapeHtml(SYSTEM)}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  return {
    to: input.toEmail,
    cc: input.requester.email,
    replyTo: input.requester.email,
    subject,
    text,
    html,
    attachments: [{ filename: 'plantilla-estudiantes.xlsx', content: input.attachment, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
  };
}
