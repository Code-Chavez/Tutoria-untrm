# Guía del piloto con usuarios — SIT · UNTRM (TT-102)

**Para qué sirve:** orientar la preparación, la ejecución y el registro del piloto con usuarios del Sprint 6 (objetivo específico 5 del plan: «validar … mediante un piloto con usuarios reales»). Con esta guía, lo que ocurra en la sesión queda convertido en **evidencia ordenada** (para el informe) y en **hallazgos priorizados** (para corregir antes de la versión 1.0.0).

> **Qué es de la guía y qué hay que confirmar.** Los tamaños de grupo, duraciones y fechas de esta guía son **propuestas** para decidirlas con el asesor y la DBU. No son requisitos del plan ni resultados. El informe solo podrá citar lo que realmente se registre en el piloto: participantes, tiempos, respuestas y hallazgos.

## Contenido

1. [Objetivo y alcance](#1-objetivo-y-alcance)
2. [Antes del piloto: lista de preparación](#2-antes-del-piloto-lista-de-preparación)
3. [Participantes](#3-participantes)
4. [Datos y privacidad](#4-datos-y-privacidad)
5. [Cómo se desarrolla la sesión](#5-cómo-se-desarrolla-la-sesión)
6. [Tareas por rol](#6-tareas-por-rol)
7. [Qué se registra](#7-qué-se-registra)
8. [Hallazgos: severidad y decisión](#8-hallazgos-severidad-y-decisión)
9. [Después del piloto](#9-después-del-piloto)
10. [Anexos](#10-anexos)

## 1. Objetivo y alcance

**Qué se quiere saber**

1. ¿Las personas **completan las tareas** reales de su rol sin ayuda, con ayuda o no las completan?
2. ¿Dónde se **equivocan o se detienen**, y qué dicen que esperaban encontrar?
3. ¿Qué tan **usable** les parece el sistema (cuestionario estándar SUS) y qué mejorarían?
4. ¿Hay **defectos** que no aparecieron en las pruebas automáticas ni en la aceptación?

**Qué NO se mide aquí:** rendimiento con muchos usuarios simultáneos (requiere una prueba de carga aparte), ahorro de tiempo frente al proceso anterior (necesitaría una línea de base que no existe) ni seguridad (ver `docs/INFORME_SEGURIDAD_2026-10-11.md`). No se prometen mejoras cuantificadas: se registran tiempos y se reportan tal cual.

**Versión probada:** la versión candidata vigente del sistema (anotar la etiqueta y el commit en la hoja de sesión, p. ej. `v0.4.2`).

## 2. Antes del piloto: lista de preparación

Marcar cada punto con fecha y responsable. Propuesta: **9 al 12 de noviembre** (el backlog fija el piloto para el 13/11).

### 2.1 Entorno

- [ ] Instalación de la versión candidata en un entorno **distinto del de desarrollo**, accesible para los participantes. Ver `docs/MANUAL_TECNICO.md` (sección 5) y `deploy/README.md`.
- [ ] Prueba de humo: `/api/health` responde, un administrador entra y la recuperación de contraseña envía un correo real (confirma el SMTP).
- [ ] Respaldo de la base **antes** de cargar datos y un respaldo después de la preparación (`backup.sh`), para poder volver al punto de partida entre sesiones.
- [ ] Navegador y equipo de las personas participantes probados (el sistema se probó automáticamente en Chrome; anotar cualquier otro).
- [ ] Un canal para reportar problemas durante la sesión (persona de contacto y teléfono o mensajería).

### 2.2 Datos base (los carga la DBU desde la aplicación)

- [ ] *Catálogos*: facultades, escuelas y el **periodo académico activo**.
- [ ] *Usuarios y roles*: una cuenta por participante, con su rol. **Para cada Profesional de Servicio hay que elegir su servicio** (sin él no recibe ningún caso).
- [ ] Coordinador asignado a cada escuela que participe (si no, las solicitudes llegan a la DBU).
- [ ] *Carga masiva* de los estudiantes del piloto: usar `docs/piloto/estudiantes_ficticios_piloto.xlsx` (ver sección 4) o la lista autorizada.
- [ ] *Asignación*: repartir los estudiantes entre los tutores participantes.
- [ ] Cuentas de **portal** vinculadas para los estudiantes que van a participar (*Tutorados → Más → Vincular cuenta*).
- [ ] *Evaluación de tutoría*: habilitada para la escuela del piloto.
- [ ] Plan semestral de la escuela guardado, para que el coordinador pueda adjuntar la resolución.
- [ ] Contraseñas iniciales entregadas por un medio seguro y cambio de contraseña en el primer ingreso.

### 2.3 Material

- [ ] Imprimir o tener a mano: guion de tareas por rol (sección 6), hoja de observación (anexo A), cuestionario SUS (anexo B), formato de consentimiento (anexo D).
- [ ] `docs/MANUAL_USUARIO.md` disponible para consulta, pero **no entregarlo antes** de la tarea: se quiere ver si la persona se orienta sola. Anotar cuándo lo consulta.
- [ ] Persona **observadora** (no es quien guía): anota sin ayudar salvo que la persona esté bloqueada más de unos minutos.

## 3. Participantes

La propuesta cubre los perfiles que el backlog menciona (tutores, coordinadores y personal de la DBU) y los demás roles del sistema. Los números son sugerencias; con pocas personas por rol ya aparecen la mayoría de los problemas de uso.

| Rol | Sugerido | Para qué sirve |
|---|---|---|
| Docente tutor | 2 a 3 | Es el rol con más tareas |
| Coordinador de escuela | 1 a 2 | Asignación, plan, indicadores |
| Personal de la DBU (administrador) | 1 | Administración, seguimiento, bitácora |
| Profesional de servicio | 1 por servicio disponible | Recibir y atender casos |
| Vicerrectorado | 1, si es posible | Solo lectura de informes |
| Estudiante | 3 a 5, si la DBU lo autoriza | Solicitar, ver sesiones, evaluar |

Registrar para cada persona: rol, experiencia previa con sistemas similares (ninguna / poca / mucha), dispositivo y navegador. **No** registrar nombres en los informes: usar códigos (T1, T2, C1, D1, S1, E1…).

## 4. Datos y privacidad

Los datos de tutoría son **datos personales sensibles** (Ley N.° 29733). Reglas del piloto:

1. **Usar datos ficticios** para los estudiantes, sus entrevistas, derivaciones y notas. El archivo `docs/piloto/estudiantes_ficticios_piloto.xlsx` trae 12 estudiantes de ejemplo (códigos `99000101` … `99001201`, nombres «Estudiante NN Piloto Ficticio», correos `@ejemplo.invalid`) en tres escuelas; ajuste la columna *escuela* para que coincida con los nombres de sus catálogos (ver el anexo F).
2. Si algún participante usa información de personas reales, debe existir **autorización** de la DBU y el consentimiento correspondiente; esto no se cubre con esta guía.
3. No escribir contenido clínico ni datos sensibles reales en las notas de los casos.
4. Las capturas y grabaciones de pantalla, si se hacen, **no deben mostrar** datos reales ni contraseñas.
5. Al terminar, **borrar o restaurar** la base de ensayo (`restore.sh` desde el respaldo previo a la carga) y desactivar las cuentas temporales.
6. En el informe se usan solo resultados **anonimizados** (códigos de participante).

## 5. Cómo se desarrolla la sesión

Propuesta de agenda de **2 horas** por grupo (ajustable). Un observador por cada 1 o 2 participantes.

| Minutos | Actividad |
|---|---|
| 0–10 | Bienvenida: qué es el piloto, que **se prueba el sistema, no a la persona**, consentimiento y uso de códigos |
| 10–20 | Ingreso con la cuenta asignada y recorrido libre del menú (2 minutos de exploración, sin explicar) |
| 20–85 | Tareas del rol (sección 6), una por una, con la hoja de observación |
| 85–100 | Cuestionario SUS (anexo B) y preguntas abiertas |
| 100–120 | Conversación final: lo mejor, lo más confuso, qué cambiaría; cierre |

**Instrucciones para quien conduce**

- Leer cada tarea como un **escenario**, no como una lista de botones («Ana te pidió apoyo en Cálculo; respóndele») y no dar pistas.
- Pedir que **piensen en voz alta**.
- Intervenir solo si la persona está bloqueada: anotar el momento y el tipo de ayuda (pista / explicación / se resolvió por ella).
- No defender el diseño ni corregir al participante.

## 6. Tareas por rol

Cada tarea tiene un **resultado esperado** observable. Para el paso a paso correcto, ver `docs/MANUAL_USUARIO.md` (no se entrega al participante antes de intentar).

### 6.1 Docente tutor (T)

| # | Escenario | Resultado esperado | Manual |
|---|---|---|---|
| T1 | Entrar al sistema y encontrar a tus tutorados | Ve su lista y abre un expediente | 1.2, 3.1 |
| T2 | Realizaste la entrevista inicial a una estudiante; regístrala | Entrevista guardada y visible en el expediente | 3.2 |
| T3 | Programa una sesión presencial para la semana próxima | Sesión en el calendario con lugar | 3.3 |
| T4 | Programa una sesión virtual y una grupal con dos estudiantes | Ambas visibles; enlace correcto | 3.3 |
| T5 | La sesión de ayer ya se realizó: registra que la estudiante asistió | Asistencia registrada con su número | 3.4 |
| T6 | Una estudiante te escribió pidiendo ayuda; respóndele desde el sistema | Solicitud en «Atendida» con una respuesta | 3.7 |
| T7 | Una estudiante muestra ansiedad antes de los exámenes; derívala al servicio que corresponda | Derivación creada y servicio sugerido/elegido | 3.6 |
| T8 | Obtén la hoja de asistencia para imprimir | PDF descargado | 3.4 |
| T9 | Prepara y guarda tu informe del semestre | Informe guardado y exportado | 3.9 |

### 6.2 Coordinador (C)

| # | Escenario | Resultado esperado | Manual |
|---|---|---|---|
| C1 | Tres estudiantes nuevos no tienen tutor: asígnalos | Estudiantes asignados al tutor con menor carga | 4.1 |
| C2 | Un estudiante debe cambiar de tutor | Reasignado con motivo | 4.1 |
| C3 | Registra el plan del semestre y adjunta la resolución | «Plan vigente» | 4.4 |
| C4 | Hay que corregir el plan ya aprobado | Nueva revisión, versión aprobada conservada | 4.4 |
| C5 | Consulta cuántos estudiantes de tu escuela están en riesgo y exporta el tablero | Cifra encontrada y archivo descargado | 4.5 |

### 6.3 Personal de la DBU / administrador (D)

| # | Escenario | Resultado esperado | Manual |
|---|---|---|---|
| D1 | Crea la cuenta de una psicóloga | Cuenta con servicio Psicología | 7.1 |
| D2 | Habilita la evaluación para la escuela | Escuela «Habilitada» | 7.5 |
| D3 | Revisa los casos derivados y cuáles llevan más tiempo | Encuentra el seguimiento y el plazo | 7.6 |
| D4 | Averigua quién cambió el estado de un caso | Encuentra el registro en la bitácora | 7.6 |
| D5 | Cambia la duración de las sesiones a 40 minutos | Parámetro cambiado | 7.3 |
| D6 | Desactiva la cuenta de una persona que ya no trabaja | Cuenta inactiva | 7.1 |

### 6.4 Profesional de servicio (S)

| # | Escenario | Resultado esperado | Manual |
|---|---|---|---|
| S1 | Te avisaron de un caso nuevo; ábrelo | Abre el caso correcto desde el aviso | 5.1 |
| S2 | Empieza a atender el caso y avanza su estado | «Recibido» y «En atención» | 5.2 |
| S3 | Termina la atención con tus observaciones y ciérralo | «Cerrado» con observaciones | 5.2 |
| S4 | Obtén la constancia para firmarla | PDF descargado | 5.3 |

### 6.5 Estudiante (E) — solo si se autoriza su participación

| # | Escenario | Resultado esperado | Manual |
|---|---|---|---|
| E1 | Pide apoyo a tu tutor | Solicitud «Pendiente» | 2.2 |
| E2 | Averigua cuándo y dónde es tu próxima sesión | Encuentra fecha y lugar | 2.1 |
| E3 | Mira si tu tutor te respondió | Ve la respuesta | 2.2 |
| E4 | Evalúa a tu tutor | Evaluación enviada | 2.3 |

### 6.6 Vicerrectorado (V)

| # | Escenario | Resultado esperado | Manual |
|---|---|---|---|
| V1 | Consulta las cifras por escuela y exporta el informe | Archivo descargado | 6 |
| V2 | Compara el último semestre cerrado con el actual | Elige el semestre en el filtro | 6 |

## 7. Qué se registra

| Instrumento | Quién lo llena | Qué produce |
|---|---|---|
| **Hoja de observación** (anexo A) | Observador, por tarea | Éxito (sí / con ayuda / no), tiempo, errores, comentarios |
| **Cuestionario SUS** (anexo B) | Participante, al final | Puntaje de usabilidad de 0 a 100 |
| **Preguntas abiertas** (anexo C) | Conductor, en la conversación final | Lo mejor, lo más confuso, qué cambiaría |
| **Registro de hallazgos** (anexo E) | Observador y conductor | Lista priorizada de defectos y mejoras |
| **Consentimiento** (anexo D) | Participante | Constancia de participación informada |

**Medidas que se pueden informar**

- **Tasa de éxito por tarea** = tareas completadas sin ayuda / tareas intentadas. Se informan también «con ayuda» y «no completó».
- **Tiempo por tarea**: mediana y rango (no promedio, si hay pocos datos). Con 2 a 3 personas por rol, **no se calculan porcentajes de mejora ni se generaliza**: se describe lo observado.
- **Puntaje SUS**: se calcula por persona y se informa el valor de cada una y su media. Una referencia habitual: 68 puntos se considera «promedio» en estudios con SUS; sin una muestra grande no se afirma que el sistema «sea bueno o malo» por ese número.
- **Hallazgos**: cantidad por severidad y cuántos se corrigieron.

## 8. Hallazgos: severidad y decisión

Cada hallazgo se registra con la plantilla del anexo E y se clasifica:

| Severidad | Criterio | Decisión por defecto |
|---|---|---|
| **Crítica** | Pérdida o exposición de datos, o impide completar una tarea esencial a cualquier persona | Se corrige **antes** de la v1.0.0 |
| **Alta** | Impide o dificulta mucho una tarea frecuente; hay solución alternativa difícil | Se corrige antes de la v1.0.0 |
| **Media** | La persona se confunde o se equivoca pero termina; mala redacción | Se corrige si hay tiempo, si no se documenta |
| **Baja** | Detalle estético o preferencia | Se registra para una versión posterior |

Regla práctica para las prioridades: un problema que **dos o más personas** sufren en la misma pantalla sube un nivel. La decisión final sobre qué entra en TT-103 (correcciones del 16 y 17 de noviembre) la toma quien conduce el proyecto con el asesor.

## 9. Después del piloto

1. **Mismo día:** consolidar las hojas, calcular los puntajes SUS y completar el registro de hallazgos mientras se recuerda el contexto.
2. **Al día siguiente:** priorizar los hallazgos (sección 8) y crear una tarea por cada uno que se vaya a corregir (TT-103: 16 y 17/11).
3. **Tras corregir:** repetir solo las tareas afectadas (re-prueba de regresión) y actualizar la matriz de trazabilidad.
4. **Para el informe** (`docs/informe-practicas/`): actualizar las secciones 8.2 y 8.4 con los resultados reales (participantes por rol, tasas de éxito, SUS, hallazgos y su estado) y el punto 13 de `CONTROL_DE_EVIDENCIAS.md`. Conservar las hojas originales (anonimizadas) como anexo.
5. **Limpieza:** restaurar o borrar la base del piloto, desactivar cuentas temporales y retirar los consentimientos a su custodia designada.

## 10. Anexos

### Anexo A — Hoja de observación (una por participante)

| Campo | |
|---|---|
| Código del participante / rol | |
| Fecha y hora · versión del sistema | |
| Experiencia previa (ninguna / poca / mucha) | |
| Dispositivo y navegador | |
| Observador | |

| Tarea | Resultado (S = sin ayuda · A = con ayuda · N = no completó) | Tiempo (min:seg) | Errores o dudas observadas | Frase textual del participante |
|---|---|---|---|---|
| T1 | | | | |
| T2 | | | | |
| … | | | | |

Tipos de ayuda: **P** pista · **E** explicación · **R** lo resolvió el observador. Anotar en qué pantalla ocurrió.

### Anexo B — Cuestionario de usabilidad SUS

Para cada afirmación, el participante marca de **1** (muy en desacuerdo) a **5** (muy de acuerdo).

| # | Afirmación | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | Creo que me gustaría usar este sistema con frecuencia | | | | | |
| 2 | Encontré el sistema innecesariamente complejo | | | | | |
| 3 | Pensé que el sistema era fácil de usar | | | | | |
| 4 | Creo que necesitaría el apoyo de una persona con conocimientos técnicos para usar el sistema | | | | | |
| 5 | Encontré que las diversas funciones del sistema estaban bien integradas | | | | | |
| 6 | Pensé que había demasiada inconsistencia en el sistema | | | | | |
| 7 | Imagino que la mayoría de las personas aprendería a usar este sistema muy rápidamente | | | | | |
| 8 | Encontré el sistema muy incómodo de usar | | | | | |
| 9 | Me sentí muy seguro/a usando el sistema | | | | | |
| 10 | Necesité aprender muchas cosas antes de poder empezar a usar el sistema | | | | | |

**Puntaje:** en las preguntas impares (1, 3, 5, 7, 9) se resta 1 a la respuesta; en las pares (2, 4, 6, 8, 10) se resta la respuesta a 5. Se suman los diez valores y se **multiplica por 2,5**: el resultado va de 0 a 100.

### Anexo C — Preguntas abiertas

1. ¿Qué fue lo más fácil o lo que más le gustó?
2. ¿Qué fue lo más confuso o lo que le hizo dudar?
3. ¿Hubo algo que esperaba encontrar y no encontró?
4. ¿Qué cambiaría primero?
5. ¿Lo usaría en su trabajo diario? ¿Qué necesitaría para hacerlo?
6. ¿Le preocupó algo sobre la privacidad de la información?

### Anexo D — Consentimiento (modelo base)

> Adapte el texto al formato que la UNTRM o la DBU exijan; esta guía no sustituye un asesoramiento legal.
>
> Yo, __________ (código del participante: ____), acepto participar de forma voluntaria en la prueba piloto del Sistema de Información de Tutoría de la UNTRM. Entiendo que: (1) se prueba el sistema y no a mi persona; (2) puedo detenerme en cualquier momento; (3) mis respuestas se usarán de forma anónima, con un código, para mejorar el sistema y para el informe de prácticas; (4) los datos de estudiantes que se usen son ficticios o están autorizados por la DBU.
>
> Firma: __________ Fecha: __________

### Anexo E — Registro de hallazgos (una fila por hallazgo)

| Id | Fecha | Rol / tarea | Pantalla | Qué ocurrió (pasos) | Qué esperaba la persona | Severidad | Personas afectadas | Propuesta | Decisión | Tarea / PR | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|
| H-01 | | | | | | | | | | | |

Estados: **Nuevo · Aceptado · Descartado (con motivo) · En corrección · Corregido y re-probado**.

### Anexo F — Escenario de datos ficticios

`docs/piloto/estudiantes_ficticios_piloto.xlsx`: 12 estudiantes de ejemplo para la *Carga masiva* (columnas `codigo, nombres, apellidos, correo, telefono, ciclo, escuela`). Comprobado: se importan sin errores en el entorno de desarrollo. Antes de usarlo en el entorno del piloto, confirme que los nombres de la columna *escuela* coinciden con *Catálogos → Escuelas* (no importan mayúsculas ni acentos); las filas cuya escuela no exista se omiten y aparecen con su error en el reporte de la carga. Un coordinador solo puede cargar estudiantes de las escuelas que coordina; la DBU, de cualquiera.
