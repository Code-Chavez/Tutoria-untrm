# Revisión de seguridad — TT-101 (repaso del 19/11/2026)

**Alcance:** lo cambiado en `develop` después del [repaso del 12/11](INFORME_SEGURIDAD_TT101_REVISION_2026-11-12.md) (`1398f9a`), hasta `v1.0.0-beta.4` (`21b04d3` en `main`). **Método:** auditoría de dependencias, diferencia de rutas desde `1398f9a`, lectura del código que cambió y su prueba. No se volvió a sondear la API en ejecución con una cuenta de cada rol: el entorno de desarrollo estaba detenido y `sit-ensayo` corre una versión anterior. No sustituye un escáner externo ni la revisión de infraestructura.

## Resultado

| # | Sev. | Categoría | Hallazgo | Estado |
|---|---|---|---|---|
| H1 | Baja | A01 Control de acceso | Los pedidos de facultad que ve la coordinación con alcance por escuela (#324) estaban redactados (sin correo de destino, sin nota, solo sus escuelas) pero conservaban campos internos: `requestedById` y `receivedById` (cuentas de otras personas), `operationId`, `contentHash`, `equivalenceKey` y `resendOfId`. | **Corregido** en #333 (issue #332), con prueba; esos campos salen vacíos en esas filas. El cliente no los usa. |
| H2 | Info | A06 Componentes | Producción: 1 aviso moderado en el servidor (`uuid` vía `exceljs`, GHSA-w5hq-g745-h8pq; ya era F7 y G2) y ninguno en el cliente (`pnpm audit --prod`, 19/11). | Sin acción; sigue ignorado y documentado. |

## Comprobado

- **Rutas nuevas desde `1398f9a`:** ninguna. El único cambio en `server/src/interfaces/http/routes` es `GET /api/roles` con `authorize(['users:read'])` (G1 del 12/11, ya revisado). La protección de todas las rutas la sigue recorriendo `server/tests/http/routeProtection.test.ts`.
- **Cambios de servidor desde `1398f9a`:** solo #324 (aviso de solapamiento entre facultad y escuela, y lista de pedidos para la coordinación) y la corrección de roles. #320, #326 y los de documentación no tocan el servidor.
- **#324, alcance de datos:** el aviso de solapamiento solo busca pedidos del mismo tipo y periodo cuyo alcance abarca lo mismo, y devuelve identificador, fecha, estado y el tipo de solapamiento del pedido anterior, como el aviso de duplicados que ya existía. La lista para la coordinación incluye únicamente pedidos de facultad que contienen alguna de sus escuelas (por `facultyId` de esas escuelas), y las demás escuelas de la facultad se quitan de `schoolNames`. La confirmación de recibido sigue exigiendo alcance institucional para pedidos de facultad.
- **Lo que este repaso no cubre:** el cambio de #324 no tiene prueba de integración contra base real; lo cubren pruebas unitarias con repositorio en memoria y los flujos existentes del CI.

## Pendiente de TT-101

- Sondear de nuevo la API en ejecución con una cuenta de cada rol sobre la versión `v1.0.0-beta.4` (en particular `GET /api/data-requests` con coordinación) cuando haya un entorno con ese código.
- Lo ya indicado el 12/11: escáner externo y revisión de infraestructura (HTTPS, cabeceras, copia de respaldo) en el entorno institucional.
