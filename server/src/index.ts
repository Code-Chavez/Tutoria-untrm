import app from './app';
import { env } from './infrastructure/config/env';
import { prisma } from './infrastructure/database/prisma';

async function main() {
  // En producción un servidor sin correo aparentaría enviar recuperaciones que nadie recibe (A09).
  if (env.NODE_ENV === 'production' && !env.SMTP_HOST) {
    console.error('SMTP_HOST es obligatorio en producción: sin servidor de correo no se pueden enviar recuperaciones de contraseña.');
    process.exit(1);
  }

  try {
    await prisma.$connect();
    console.log('Base de datos conectada');

    app.listen(env.PORT, () => {
      console.log(`SIT API escuchando en puerto ${env.PORT}`);
      console.log(`Entorno: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

main();
