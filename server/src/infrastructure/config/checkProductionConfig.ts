import { assertProductionConfig } from './productionConfig';

// Punto de entrada previo al arranque (imagen de producción): valida la configuración ANTES de migrar
// la base o crear ningún dato, para que un despliegue inseguro no deje rastro.
assertProductionConfig();
