# Anexo F. Evidencias de pruebas

## F.1 Integración continua del corte

Ejecución sobre el commit `21b04d3` de `main` (etiqueta `v1.0.0-beta.4`, 19/11/2026), con todos los trabajos satisfactorios, y cifras de las versiones anteriores para comparar.

[[tabla: Resultados de la integración continua por versión]]

| Verificación | v1.0.0-beta.4 (19/11/2026) | v1.0.0-beta.3 (16/11/2026) | Informe anterior (11/10/2026) |
| --- | --- | --- | --- |
| Servidor: pruebas | 1 709 en 183 conjuntos; cobertura de sentencias 90,96 % | 1 704 en 183 conjuntos; 90,95 % | 689 |
| Cliente: pruebas | 775 en 102 archivos; 78,99 % | 766 en 102 archivos; 78,75 % | 299 |
| Extremo a extremo en Chrome | 141 aprobadas, 1 omitida (6,2 min) | 141 aprobadas, 1 omitida | 8 recorridos manuales |
| Estilo, tipos y compilación | Satisfactorio | Satisfactorio | — |
| Auditoría de dependencias | Cliente sin avisos; servidor con una advertencia moderada ignorada | Igual | — |
| Ensayo de respaldo y restauración | Satisfactorio | Satisfactorio | — |
| Imágenes Docker y migraciones | Satisfactorio (solo en `push` a `develop` y `main`) | Satisfactorio | — |

## F.2 Suites de extremo a extremo

El repositorio mantiene 30 suites de extremo a extremo con Playwright, una por recorrido de usuario. La integración continua ejecuta en Chrome una selección (`test:ci`); Firefox y WebKit ejecutan una selección menor en cada solicitud de integración y de forma programada. Las suites de plan semestral (E2E-06) y de administración (E2E-08) están fuera de la selección de Chrome.

[[tabla: Suites de extremo a extremo del repositorio]]

| Suite | Recorrido | Suite | Recorrido |
| --- | --- | --- | --- |
| E2E-01 | Acceso y menú por rol | E2E-16 | Borrador del estudiante |
| E2E-02 | Solicitud de tutoría | E2E-17 | Pendientes institucionales |
| E2E-03 | Sesiones y asistencia | E2E-18 | Accesibilidad |
| E2E-04 | Derivación a un servicio | E2E-19 | Accesibilidad de la gestión |
| E2E-05 | Informes y exportaciones | E2E-20 | Estados del docente |
| E2E-06 | Plan semestral | E2E-21 | Roles, permisos y alcance |
| E2E-07 | Evaluación de tutoría | E2E-22 | Estado en la URL y borradores |
| E2E-08 | Administración | E2E-23 | Certificados: consulta |
| E2E-09 | Carga masiva y asignación | E2E-24 | Certificados: trámite |
| E2E-10 | Cierre de periodo | E2E-25 | Certificados: PDF |
| E2E-11 | Pedido de listas | E2E-26 | Certificados: pantalla |
| E2E-12 | Tutor por ciclo y decano | E2E-27 | Certificados: calidad |
| E2E-13 | Carga de docentes | E2E-28 | Docentes tutores |
| E2E-14 | De la solicitud a una sesión o derivación | E2E-29 | Certificados: imágenes |
| E2E-15 | Correo institucional | E2E-30 | Volver a la vista anterior |

## F.3 Pruebas de integración y de permisos

Las pruebas de integración del servidor usan HTTP y una base de datos real y **exclusiva**: se niegan a correr si la base no termina en `_test`, nunca tocan la de desarrollo y cada corrida registra el origen de las filas que escribe y borra solo lo que creó; al terminar, una verificación final hace fallar la corrida si quedó algún resto. La matriz de acceso por rol (`accessMatrix`) y el recorrido de todas las rutas registradas exigiendo sesión (`routeProtection`) forman parte de esa suite. Procedimiento completo: `docs/PRUEBAS_DE_INTEGRACION.md`.