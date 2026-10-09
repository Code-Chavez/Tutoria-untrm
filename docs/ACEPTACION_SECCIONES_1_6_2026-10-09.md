# Evidencia — secciones 1 a 6 del guion de aceptación

**Fecha:** 09/10/2026 · **Código:** `develop` (contenido de `v0.4.0`) · **Entorno:** Docker local con la base de desarrollo recreada desde cero
(`docker compose down -v && up -d --build`, paso 0 del guion). Datos ficticios únicamente.

## Cómo se ejecutó

- **API con las cuentas de prueba** (un script por sección): cada paso inicia sesión con el rol indicado y comprueba el resultado esperado.
  Cubre lo que el guion pide de estado, permisos, avisos, numeración, tope y cierre de semestre.
- **Navegador** (Panel de inicio y menú) con seis roles: tutorado, tutor, coordinadora, Psicología, Vicerrectorado y administrador.
- Para simular que una sesión «ya empezó» se retrasó su hora en la base; no hay otro atajo.
- Se crearon tres cuentas de servicio que el guion pide (Escuela, Psicopedagogía, Asistencia Social) para probar los cinco servicios.

**Lo que esto NO reemplaza** (queda para una persona): leer los PDF y Excel descargados, ver los impresos, esperar los 15 minutos reales de
la sesión y hacer clic en los avisos en pantalla. Esos pasos están marcados como «pendiente» en el guion.

## Resultado

| Sección | Resultado |
|---|---|
| 1. Solicitud de tutoría (R01) | **Todo OK** salvo 1.11 (estudiante sin tutor / escuela sin coordinador: solo pruebas automáticas, sin cuenta de prueba para ejercitarlo). |
| 2. Entrevista, sesiones, asistencia | **OK.** 2.3 reveló un fallo real (abajo), corregido en el PR #88. |
| 3. Derivación y cinco servicios | **OK en los cinco servicios** (Escuela, Psicopedagogía, Psicología, Asistencia Social, Salud): aviso al servicio correcto, otro servicio y tutor no emisor reciben 403/404, coordinador recibe 403 con explicación, flujo solo hacia delante, notas internas ocultas al tutor, constancia PDF, adjunto firmado visible solo para emisor, servicio y DBU, bitácora con `SIGNED_DOCUMENT_ATTACHED`. |
| 4. Plan, evaluación, recuperación | **OK.** |
| 5. Informes y exportaciones | **OK** en archivos y cifras; cotejo visual pendiente. |
| 6. Separación entre roles | **OK.** |

## Detalle relevante

- **1.x:** solicitud de Ana → *Pendiente*; aviso a Elena; la ve Rosa; no la ven Jorge ni Carlos; «atendida» sin respuesta devuelve 409 con el mensaje;
  no se puede retroceder; Ana recibe aviso y ve la respuesta; el expediente muestra la solicitud con estado y respuesta; Ana recibe 403 en
  estudiantes, usuarios, bitácora y derivaciones.
- **2.x:** entrevista, sesión presencial, virtual y grupal (cada tutorado ve solo su propio identificador), reprogramar y cancelar con motivo,
  asistencia confirmada con número 1, inasistencia en grupal, y una grupal sin asistentes no registra asistencia. **Tope:** las 8 primeras
  asistencias individuales del semestre se aceptan y la novena responde 409 («Se alcanzó el máximo de 8 sesiones registradas en este semestre…»).
  **Cambio de semestre:** al cerrar 2026-II y activar 2026-III, la primera asistencia de Ana vuelve a numerarse **1**. La hoja del Anexo 4 se
  genera en PDF (70 KB) y el escaneo firmado se adjunta con huella SHA-256.
- **4.x:** plan en borrador → resolución adjunta → *Aprobado*; al editarlo se conserva la versión 1 con su PDF descargable; evaluación: Ana
  responde una vez (la segunda da 409); los resultados son agregados por tutor, sin nombres de estudiantes; recuperación de contraseña: el
  correo llega a Mailpit con enlace de un solo uso (el segundo uso da 400), la sesión anterior queda cerrada (refresh 401), la clave nueva
  entra y la vieja no; la renovación de sesión responde 200.
- **5.x:** informe semestral autollenado; PDF y Excel de horarios y asistencia (tutor, coordinadora y DBU), consolidado e indicadores, y el
  PDF del expediente se descargan como archivos válidos. Consolidado, indicadores y panel muestran las mismas cifras (11 activos, 8 con
  tutor, 72,7 %). **5.4:** tras reasignar y desactivar a un estudiante, el informe del semestre cerrado quedó **idéntico** (corte de matrícula).
- **6.x:** Elena ve solo a Ana y Luis; abrir por URL un tutorado de Jorge da 404; Rosa ve solo su escuela en tutorados y plan; al desactivar
  a Ronald su token abierto dio 401 y el inicio de sesión 403; en los seis roles vistos hay exactamente **una** entrada activa del menú, sin
  tarjetas vacías ni avisos de «Sin acceso».

## Hallazgos

1. **Corregido (PR #88): enlace de reunión con esquema peligroso.** La API aceptaba cualquier texto como enlace de una sesión virtual,
   incluido `javascript:alert(1)`, y el detalle de la sesión lo mostraba como enlace. Ahora solo se aceptan `http://` y `https://`, y la pantalla
   enlaza solo esas direcciones.
2. **Observación (sin cambio): `/schools` devuelve todas las escuelas** a la coordinadora (solo nombres, se usa para listas desplegables). Tutorados,
   asignación y plan sí están limitados a su escuela.
3. **Observación:** para un coordinador o DBU, los reportes de horarios exigen indicar el tutor (`tutorId`); el tutor usa `mine=true`. Es el
   comportamiento diseñado, pero no se probó que la pantalla lo deje claro.

## Pendiente de una persona

Pasos con lectura visual (2.11, 3.7, 5.1, 5.2, 5.5), clic en avisos (3.2), espera real de 15 min (4.8), 1.11 con cuentas de prueba para
estudiante sin tutor / escuela sin coordinador, y los roles Salud y Asistencia Social en pantalla (6.5, 6.6).
