# Anexo F. Evidencias de pruebas

## F.1 Integración continua del corte

Ejecución de la integración continua sobre el commit `21b04d3` de `main` (etiqueta `v1.0.0-beta.4`, 19/11/2026), con todos los trabajos satisfactorios.

[[tabla: Trabajos de la integración continua en el corte v1.0.0-beta.4]]

| Trabajo | Resultado |
| --- | --- |
| Servidor: estilo, compilación, auditoría y pruebas | Satisfactorio: 1 709 pruebas en 183 conjuntos; cobertura de sentencias 90,96 % |
| Cliente: estilo, tipos y compilación, auditoría y pruebas | Satisfactorio: 775 pruebas en 102 archivos; cobertura de sentencias 78,99 % |
| Extremo a extremo con Playwright en Chrome | Satisfactorio: 141 aprobadas y 1 omitida (6,2 minutos) |
| Ensayo de respaldo y restauración | Satisfactorio |
| Construcción de imágenes Docker y migraciones | Satisfactorio (corre en los empujes a `develop` y `main`) |

## F.2 Suites de extremo a extremo

El repositorio mantiene 30 suites de extremo a extremo con Playwright, cada una sobre un recorrido de usuario. La integración continua ejecuta en Chrome una selección (`test:ci`); Firefox y WebKit ejecutan una selección menor en cada solicitud de integración y de forma programada. Las suites de plan semestral (E2E-06) y de administración (E2E-08) están fuera de la selección de Chrome en la integración continua.

[[tabla: Suites de extremo a extremo del repositorio]]

| Suite | Recorrido | Archivo |
| --- | --- | --- |
| E2E-01 | Acceso y menú por rol | `e2e-01-acceso-y-menu.spec.ts` |
| E2E-02 | Solicitud de tutoría | `e2e-02-solicitud-de-tutoria.spec.ts` |
| E2E-03 | Sesiones y asistencia | `e2e-03-sesiones-y-asistencia.spec.ts` |
| E2E-04 | Derivación a un servicio | `e2e-04-derivacion-a-servicio.spec.ts` |
| E2E-05 | Informes y exportaciones | `e2e-05-informes-y-exportaciones.spec.ts` |
| E2E-06 | Plan semestral | `e2e-06-plan-semestral.spec.ts` |
| E2E-07 | Evaluación de tutoría | `e2e-07-evaluacion-de-tutoria.spec.ts` |
| E2E-08 | Administración | `e2e-08-administracion.spec.ts` |
| E2E-09 | Carga masiva y asignación | `e2e-09-carga-masiva-y-asignacion.spec.ts` |
| E2E-10 | Cierre de periodo | `e2e-10-cierre-de-periodo.spec.ts` |
| E2E-11 | Pedido de listas | `e2e-11-pedido-de-listas.spec.ts` |
| E2E-12 | Tutor por ciclo y decano | `e2e-12-tutor-por-ciclo-y-decano.spec.ts` |
| E2E-13 | Carga de docentes | `e2e-13-carga-de-docentes.spec.ts` |
| E2E-14 | De la solicitud a una sesión o derivación | `e2e-14-solicitud-a-sesion-o-derivacion.spec.ts` |
| E2E-15 | Correo institucional | `e2e-15-correo-institucional.spec.ts` |
| E2E-16 | Borrador del estudiante | `e2e-16-borrador-del-estudiante.spec.ts` |
| E2E-17 | Pendientes institucionales | `e2e-17-pendientes-institucionales.spec.ts` |
| E2E-18 | Accesibilidad | `e2e-18-accesibilidad.spec.ts` |
| E2E-19 | Accesibilidad de la gestión | `e2e-19-accesibilidad-gestion.spec.ts` |
| E2E-20 | Estados del docente | `e2e-20-estados-del-docente.spec.ts` |
| E2E-21 | Roles, permisos y alcance | `e2e-21-roles-permisos-alcance.spec.ts` |
| E2E-22 | Estado en la URL y borradores | `e2e-22-url-y-borradores.spec.ts` |
| E2E-23 | Certificados: consulta | `e2e-23-certificados-consulta.spec.ts` |
| E2E-24 | Certificados: trámite | `e2e-24-certificados-tramite.spec.ts` |
| E2E-25 | Certificados: PDF | `e2e-25-certificados-pdf.spec.ts` |
| E2E-26 | Certificados: pantalla | `e2e-26-certificados-pantalla.spec.ts` |
| E2E-27 | Certificados: calidad | `e2e-27-certificados-calidad.spec.ts` |
| E2E-28 | Docentes tutores | `e2e-28-docentes-tutores.spec.ts` |
| E2E-29 | Certificados: imágenes | `e2e-29-certificados-imagenes.spec.ts` |
| E2E-30 | Volver a la vista anterior | `e2e-30-volver-a-la-vista.spec.ts` |

## F.3 Pruebas de integración

Las pruebas de integración y de permisos del servidor se ejecutan contra una base de datos real y exclusiva, que se niega a correr sobre la de desarrollo. El siguiente documento describe su organización.

[[incluir: ../../../PRUEBAS_DE_INTEGRACION.md | 1]]