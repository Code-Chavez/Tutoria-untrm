# Control de evidencias del informe

Fecha de corte: 10 de octubre de 2026. Este archivo reúne notas de revisión; no forma parte del cuerpo del informe.

## Fuentes utilizadas

- Plan presentado en PDF y su versión Word: datos, objetivos y cronograma. Se preservaron como fuentes sin modificarlos.
- Siete documentos Word de requisitos y planificación suministrados en esta conversación.
- README, historial, esquema y estructura del checkout local.
- Auditorías del 8 de octubre, matriz de trazabilidad y evidencias de aceptación del 9 de octubre.
- README de E2E del commit c4ef02b, que incorpora dos recorridos escritos y deja los demás pendientes.

## Confirmaciones necesarias para la versión final

1. Nombre del asesor: se usó el de la carátula del plan, Eder Nicanor Figueroa Piscoya; el cuerpo contiene otra variante.
2. Título formal registrado: el borrador regulariza ortografía del título del plan, sin cambiar su tema.
3. Unidad efectiva, supervisor inmediato, modalidad, horario, control de actividades y horas acreditadas.
4. Formato obligatorio de la escuela: la estructura y el formato de esta versión son provisionales.
5. Evidencia de entrevistas y del diagnóstico anterior al sistema; no se inventaron problemas ni mediciones institucionales.
6. Diagramas AS-IS/TO-BE, casos de uso, arquitectura y MER finales. No se presentan como anexos existentes sin cotejarlos.
7. Logs y resultados de la versión de entrega. No se trasladaron conteos de pruebas anteriores como cifras actuales.
8. Ejecución y resultados de E2E: dos recorridos escritos no equivalen a una suite completa aprobada.
9. Piloto, usabilidad y rendimiento: no se inventaron participantes, tiempos ni mejoras porcentuales.
10. Cambio de nombres y roles: sigue tratado como propuesta hasta comprobar implementación y aceptación.
11. Presupuesto realizado: el plan contiene S/ 4 330 presupuestados, no un gasto acreditado. No se incluyó como costo ejecutado.
12. Evidencias de capacitación, instalación institucional, aprobación y entrega formal.

## Criterios editoriales

El texto describe productos verificables y avances. La sección de dificultades recoge hallazgos del proyecto, sin inventar experiencias personales. Las conclusiones son parciales y están vinculadas a los objetivos. Los manuales se mantienen para una etapa posterior, conforme a la solicitud del usuario.

Las referencias numeradas corresponden a documentos de trabajo, no a una bibliografía normativa final. Se revisará el estilo y la metadata al adoptar el formato de la escuela. No se incluyeron credenciales, documentos de identidad, teléfonos personales ni información clínica.

## Cambios frente a la base

Se redactaron resumen, introducción, información general, diagnóstico documental, objetivos, metodología, actividades por módulo, pruebas, resultados, dificultades, conclusiones parciales y recomendaciones. Se preservó INFORME_PRACTICAS_BASE.md como esquema original.


---

# Actualización del 11 de octubre de 2026 (versión V02)

Fecha de corte: 11 de octubre de 2026. Fuente de la redacción: `INFORME_PRACTICAS_REDACCION_V02.md`; el documento Word se genera con `generar_informe.py`. La V01 se conserva sin cambios.

## Qué cambió frente a la V01

- Referencia técnica: de `c4ef02b` al commit `3860bd2` de `develop` (integración continua en verde) y la etiqueta `v0.4.1`.
- Se agregó la tabla de **entregas realizadas** (6 versiones, con fechas tomadas de las etiquetas del repositorio).
- Se incorporaron las secciones 7.8 (pruebas de extremo a extremo), 7.9 (revisión de seguridad) y 7.10 (manuales) y se reescribió el apartado 8 con una **tabla de resultados verificados**.
- Se actualizaron conclusiones, recomendaciones y referencias [14]-[17].

## Cifras del informe y de dónde salen

| Cifra | Valor | Fuente verificable |
| --- | --- | --- |
| Pruebas del servidor | 689 (89 conjuntos), cobertura de sentencias 82,1 % | Registro del trabajo «Server — Test» de la ejecución de CI 38157422328 (commit 3860bd2) |
| Pruebas del cliente | 299 (58 archivos), cobertura de sentencias 64,0 % | Registro del trabajo «Client — Test» de la misma ejecución |
| Pruebas E2E | 36 en 8 recorridos | `e2e/tests/` (9+5+4+5+4+2+3+4); cada recorrido se ejecutó y pasó localmente, no en una sola corrida |
| Modelos de datos / migraciones | 34 / 35 | `server/prisma/schema.prisma`, `server/prisma/migrations/` |
| Tamaño del código | ~17 mil líneas del servidor (339 archivos); ~17 mil del cliente sin pruebas | Recuento sobre el commit de referencia; orden de magnitud |
| Fechas de las versiones | v0.0.1 01/09 · v0.1.0 24/09 · v0.2.0 25/09 · v0.3.0 01/10 · v0.4.0 09/10 · v0.4.1 10/10 | `git tag` (fecha del tag) |
| Hallazgos de seguridad | 0 altos, 1 medio, 6 bajos (5 corregidos y 1 documentado), 3 informativos | `docs/INFORME_SEGURIDAD_2026-10-11.md` |

## Qué NO está en el informe porque no existe evidencia en el repositorio

Siguen las confirmaciones 1 a 12 de la sección anterior. Además, tras el desarrollo de octubre:

13. **Piloto con usuarios reales** (objetivo 5): sin participantes, instrumento ni resultados. No se redactó ningún resultado.
14. **Rendimiento y usabilidad**: no se ejecutaron pruebas de carga ni mediciones con usuarios; las ejecuciones E2E se hicieron en un equipo cargado y no sirven como medida.
15. **Validación de formatos por la DBU** (anexos 3, 5, 8 y 9): pendiente; está en `docs/formatos-anexos-matriz.md`.
16. **Infraestructura de producción** (dominio, servidor, cuenta de correo, destino de copias externas): sin decidir; el sistema solo se ensayó localmente.
17. **Escáner dinámico de seguridad** (OWASP ZAP): no ejecutado.
18. **Horas acreditadas, asistencia, supervisor y constancias**: no hay registros en el repositorio. El plan consigna 120 días hábiles, que es una programación.
19. **Diagramas AS-IS/TO-BE, casos de uso y MER**: no se encuentran como archivos en el repositorio; el informe no los presenta como existentes.
20. **Capturas de pantalla** de la aplicación: no se incluyeron (se pueden generar con la suite E2E sobre la versión definitiva).

## Cómo regenerar el Word

```bash
python -m pip install python-docx
python docs/informe-practicas/generar_informe.py
```

El script lee la V02 en Markdown y escribe `Informe_Practicas_Brayni_Chavez_V02.docx`. `verificar_word.ps1` lo abre con Word y exporta un PDF para revisar la paginación (requiere Word instalado).

## Criterio editorial mantenido

Se describen productos y resultados verificables; lo previsto en el plan se distingue de lo ejecutado; no se atribuyen mejoras cuantificadas, participantes, tiempos ni horas sin fuente; las dificultades recogen hallazgos reales del proyecto. Antes de entregar, revisar el nombre del asesor, el título formal, el formato exigido por la escuela y completar los puntos 13 a 20 según corresponda.
