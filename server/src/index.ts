import app from './app';
import { env } from './infrastructure/config/env';
import { prisma } from './infrastructure/database/prisma';
import { assertProductionConfig } from './infrastructure/config/productionConfig';

async function main() {
  // En producción no se arranca con secretos de ejemplo ni sin correo, URL pública https o base propia (A11).
  assertProductionConfig();

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
