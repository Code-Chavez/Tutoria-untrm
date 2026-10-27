# Decisiones que necesitamos (solo las P0), en lenguaje sencillo

Son **10 preguntas en 4 bloques**, de las 31 del levantamiento (las demás están en [02](02_PREGUNTAS_INSTITUCIONALES.md) y no bloquean). Cada una tiene opciones, una **recomendación del equipo** (es una propuesta, no una decisión) y sus consecuencias. Para responder basta con escribir, por ejemplo, `Q01: B` o `Q20: A, con la Resolución N.° …`. Nada se implementa hasta que haya respuesta.

> Mientras no haya respuesta, **no se detiene todo**: se avanza con lo que no depende de estas decisiones (ver [05](05_REQUISITOS_SIN_DEPENDENCIAS.md)). Solo la certificación y los permisos configurables esperan.

---

## Bloque 1 · Roles y seguridad de la administración (Q01, Q02, Q05)

**Q01 · ¿Los roles pasan a ser configurables?** Hoy hay 7 roles fijos y se pueden crear roles solo con nombre (sin permisos). El requisito RF-04 aprobado habla de 5 roles fijos.

| Opción | Qué significa |
|---|---|
| A | Roles fijos (como hoy). Nadie crea roles; solo se ajustan los permisos de los existentes |
| **B (recomendada)** | El Administrador DBU **crea roles y les asigna permisos de una lista fija**; los roles base (al menos Administrador DBU) quedan protegidos y no se pueden borrar ni vaciar |
| C | Libertad total, incluso crear permisos nuevos |

*Por qué B:* el servidor ya autoriza por permisos guardados en la base. *Consecuencias:* hay que quitar las 43 comprobaciones por nombre de rol del servidor (y las del cliente) antes de que un rol nuevo sea útil; el **alcance** (propios, escuela, facultad) seguiría saliendo de la función real de la persona, no de un ajuste libre. A deja RF-04 como está (la diferencia entre 5 y 7 roles se aclara en Q02); C no se recomienda por riesgo de seguridad.

**Q02 · ¿"Coordinador", "Responsable de escuela" y "Decano" son uno, dos o tres perfiles?** Los documentos no coinciden: RF-04 lista 5 roles; la historia HU-04 lista 7 (con «Responsable de escuela» distinto de «Coordinador» y **sin** Decano); el sistema tiene 7 (con Decano y **sin** «Responsable de escuela»). El Protocolo, Art. 5, nombra «coordinador del sistema de tutoría de las **facultades**» y «responsable del sistema de tutoría de las **escuelas profesionales**».

| Opción | Qué significa |
|---|---|
| **A (recomendada hasta que la DBU confirme)** | Se mantiene lo actual: «Coordinador» (por escuela) y «Decano» (por facultad) |
| B | Separar «coordinador de facultad» y «responsable de escuela» como dos perfiles, como sugiere el Art. 5 |
| C | Otra estructura que indique la DBU |

*Consecuencias de B:* nuevo alcance por facultad para la coordinación, cambios en a quién llegan las solicitudes y en las pantallas por rol.

**Q05 · Reglas para no dejar el sistema sin administrador.** Hoy se puede desactivar o cambiar de rol al único administrador sin que nada lo impida.

| Opción | Qué significa |
|---|---|
| **A (recomendada)** | Siempre debe quedar **al menos 1** administrador activo; nadie puede desactivarse ni degradarse a sí mismo si es el único |
| B | Mínimo 2 administradores activos |

*Consecuencias:* es una regla de seguridad sin costo para los usuarios; solo hace falta que la DBU confirme el número mínimo. Se propone además que ningún rol pueda asignar roles de **mayor** privilegio que el suyo (también a confirmar).

---

## Bloque 2 · Cómo devuelve la escuela la lista (Q11)

**Q11 · ¿Por dónde entrega la escuela la lista de estudiantes o docentes?** Hoy el pedido sale por correo y la escuela **responde ese correo con el archivo**; después una persona lo carga. El sistema solo permite marcar «recibido».

| Opción | Qué significa |
|---|---|
| **A (recomendada por ahora)** | Se mantiene: respuesta por correo y carga manual; se mejora el pedido (vista previa, fecha límite, seguimiento) |
| B | La escuela sube el archivo al sistema con un enlace seguro de un solo uso, sin cuenta |
| C | Cada escuela tiene una cuenta con carga directa |

*Consecuencias:* B y C exigen validar archivos, guardar datos personales recibidos y definir plazos de conservación; dependen de la decisión de TI sobre el servidor de correo y de almacenamiento. A no cambia nada para la escuela.

---

## Bloque 3 · Lugar de la tutoría (Q17)

**Q17 · ¿Quién decide el lugar?** Hoy lo escribe el **docente al programar** la sesión (HU-20 lo establece así); la solicitud del estudiante no tiene lugar.

| Opción | Qué significa |
|---|---|
| **A (recomendada como primer paso)** | El estudiante **propone** el lugar o la modalidad al solicitar; el docente o la coordinación lo **confirman** al programar |
| B | El estudiante **elige** de un catálogo de lugares disponibles y su elección es definitiva si el lugar está libre |
| C | El estudiante solo elige presencial o virtual; el lugar lo fija el docente (como hoy) |

*Consecuencias:* B necesita un catálogo de lugares por sede o escuela, quién lo administra y validar conflictos (pregunta Q18, no bloqueante) y cambia el criterio de HU-20; A cambia el formulario de solicitud y el aviso, sin catálogo; C casi no cambia el sistema pero no cumple lo pedido.

---

## Bloque 4 · Certificación del docente tutor (Q20, Q21, Q22, Q23, Q24)

**Q20 · ¿Quién tiene competencia para emitir?** El Protocolo, Art. 23.a, dice que «**la facultad** puede otorgar reconocimientos formales»; el certificado de ejemplo lo emite un **director de escuela** y cita una **Resolución de Decanato**. No se asume nada.

| Opción | Qué significa |
|---|---|
| A | Emite la facultad (decanato) |
| B | Emite cada escuela, con resolución de decanato que lo autoriza (como el ejemplo) |
| C | Emite una instancia central (DBU o Vicerrectorado) |

*Recomendación:* no hay una que el equipo pueda sostener; **pedir la Resolución de Decanato** del ejemplo y que la DBU confirme. *Consecuencias:* decide el rol que emite, el alcance (escuela o facultad), quién firma y el formato del número de registro.

**Q21 y Q22 · ¿Qué debe cumplir el docente y quién lo valida?** El Protocolo no fija umbrales (sesiones, informes, evaluación). El sistema **no debe escribir «cumplió correctamente»** solo porque haya actividad registrada.

| Opción | Qué significa |
|---|---|
| **A (recomendada)** | Constancia de **participación**: figurar en la comisión/resolución y haber aceptado la designación; la valida una persona de la escuela o facultad que se define |
| B | Cumplimiento con evidencias y **umbrales que la facultad apruebe por escrito** (sesiones, informe, evaluación…) |
| C | Mixto: participación + el informe semestral presentado |

*Consecuencias:* A es lo más simple y no inventa criterios; B y C requieren que el informe semestral tenga estados (presentado, revisado), que hoy no los tiene.

**Q23 · ¿Qué tipo de firma exige la universidad?** Son tres cosas distintas. El ejemplo observado usa una firma digital criptográfica.

| Opción | Qué significa |
|---|---|
| **A (recomendada)** | **Firma externa:** el sistema genera el certificado **sin firmar**, la autoridad lo firma con la herramienta de la universidad y el sistema guarda el PDF **ya firmado** (el patrón que ya existe para dos formatos). Sin claves dentro del sistema |
| B | Imagen de firma o sello pegada en el PDF |
| C | Firma digital hecha dentro del sistema (guardar y usar certificados o claves) |

*Consecuencias:* A no custodia secretos y es verificable con la herramienta institucional; B solo sirve si la universidad acepta una imagen como firma; C es la más costosa y riesgosa (claves, vigencia, revocación).

**Q24 · ¿Quién entrega la plantilla original sin firmar, los logotipos oficiales y los textos aprobados?** No se debe editar el ejemplo firmado para cambiar el nombre.

| Opción | Qué significa |
|---|---|
| **A (recomendada)** | La DBU o Vicerrectorado entrega la plantilla sin firmar, los logotipos y los textos |
| B | El equipo propone un diseño y la universidad lo aprueba |

*Consecuencias:* sin plantilla no se puede empezar a generar PDF; con B se agrega una ronda de aprobación.
