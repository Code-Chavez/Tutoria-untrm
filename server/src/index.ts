import app from './app';
import { env } from './infrastructure/config/env';
import { prisma } from './infrastructure/database/prisma';

async function main() {
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
