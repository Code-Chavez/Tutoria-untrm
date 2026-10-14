// Prueba la configuración de correo del servidor (SMTP_*), sin pasar por la aplicación.
//
//   Solo conexión y credenciales:
//     docker compose -f docker-compose.prod.yml --env-file .env.production exec -T server node - < deploy/probar-smtp.js
//   Y además enviar un correo de prueba:
//     docker compose -f docker-compose.prod.yml --env-file .env.production exec -T server node - persona@untrm.edu.pe < deploy/probar-smtp.js
//
// Usa las mismas variables que el sistema (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM).
// No imprime contraseñas. Termina con código 1 si algo falla.
const nodemailer = require('nodemailer');

const env = process.env;
const to = process.argv[2];

if (!env.SMTP_HOST) {
  console.error('FALLA: SMTP_HOST no está definido en el servidor.');
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || 587),
  secure: env.SMTP_SECURE === 'true',
  // Igual que el sistema: con SMTP_REQUIRE_TLS=true, sin STARTTLS no se conecta (nunca en claro).
  ...(env.SMTP_REQUIRE_TLS === 'true' && env.SMTP_SECURE !== 'true' ? { requireTLS: true } : {}),
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS || '' } : undefined,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

console.log(`Servidor: ${env.SMTP_HOST}:${env.SMTP_PORT || 587} (TLS implícito: ${env.SMTP_SECURE === 'true' ? 'sí' : 'no'}, STARTTLS obligatorio: ${env.SMTP_REQUIRE_TLS === 'true' ? 'sí' : 'no'}), usuario: ${env.SMTP_USER || '(sin autenticación)'}`);

transport
  .verify()
  .then(async () => {
    console.log('OK: el servidor acepta la conexión' + (env.SMTP_USER ? ' y las credenciales.' : '.'));
    if (!to) {
      console.log('Para enviar un correo de prueba, indique un destinatario como argumento.');
      return;
    }
    const info = await transport.sendMail({
      from: env.MAIL_FROM || env.SMTP_USER,
      to,
      subject: 'Prueba de correo — SIT UNTRM',
      text: 'Este es un mensaje de prueba del Sistema Integral de Tutoría. Si lo recibe, el envío de correo está bien configurado.',
    });
    console.log(`OK: correo entregado al servidor para ${to} (id ${info.messageId}). Revise la bandeja, y también la carpeta de correo no deseado.`);
  })
  .catch((error) => {
    console.error(`FALLA: ${error.code || ''} ${error.message}`);
    process.exit(1);
  });
