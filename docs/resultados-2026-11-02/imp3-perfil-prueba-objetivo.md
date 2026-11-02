# IMP-3: perfil de la prueba objetivo y decisión sobre una corrección

Continuación de `docs/resultados-2026-11-01/imp3-investigacion-experimentos.md`. Solo medición: **no se cambió ninguna prueba, aserción, tiempo ni configuración.**

## Qué se midió

Una copia instrumentada de la prueba («envía el pedido con los ciclos marcados y las observaciones…», no versionada y ya borrada) con `performance.now()` entre pasos, 5 corridas en reposo sobre `develop` `3959d1c`, el archivo de la prueba solo (por eso el primer paso incluye el arranque en frío). Datos crudos: `datos/perfil-con-type.txt`. Variante con `user.paste` en lugar de `user.type` (misma aserción final): `datos/perfil-con-paste.txt`.

| Paso | Mediana (ms) |
|---|---|
| render | 96 |
| esperar el correo de la escuela (`findByText`) | 102 |
| clic «Quitar selección» (primer `getByRole`: arranque en frío de estilos de jsdom) | 455 |
| clic ciclo 3 | 155 |
| clic ciclo 4 | 128 |
| escribir 12 caracteres (`user.type`) | 385 |
| clic «Enviar pedido» | 172 |
| esperar el envío + `findByRole('alert')` | 31 |
| **Total por corrida (mediana de 5)** | **1 525** (rango 1 434–2 340; la primera corrida, 2 340, incluye el calentamiento del disco/caché) |

Con `paste`: total mediano **1 261 ms** (−264 ms, −17 %); el paso de escritura baja de 385 a 156 ms.

## Lectura

- El coste es la suma de pasos legítimos de `user-event`; **no hay un paso evitable que domine**. El más caro (≈ 0,45 s) es el primer `getByRole` del archivo, que paga el arranque en frío medido en #192 (no se elimina cambiando la prueba).
- Dentro del archivo completo la prueba tarda ≈ 2,0 s sola y ≈ 3,0 s en grupo (investigación del 1/11): el presupuesto de 5 s deja ≈ ×2,5 de margen. Con la CPU saturada las duraciones se multiplicaron ×1,7 a ×5 (mediana ×4,6): ahí incluso pruebas de 0,4 s superaron los 5 s.
- Sustituir `type` por `paste` ahorraría ≈ 0,26 s: **no cambia la conclusión** (con ×4–×5 sigue superando 5 s) y cambiaría la fidelidad de la interacción (no se simulan pulsaciones). No se aplica.

## Conclusión y decisión pendiente

No se encontró un defecto de la prueba ni del componente que una corrección pequeña pueda arreglar; la sensibilidad es a la contención de CPU de la máquina. Propuesta (para decidir): **cerrar IMP-3 como riesgo de entorno aceptado**, con (a) la regla de no valorar fallos de la suite local cuando la CPU esté saturada (repetir con la máquina libre y conservar la salida completa), (b) la CI como referencia (0 fallos de «Client — Test» en 100 ejecuciones, #192), y (c) si vuelve a aparecer con la máquina libre, abrir un nuevo hallazgo con la salida completa. Alternativas ya descritas (acortar o dividir pruebas largas, calentamiento de jsdom) quedan sin aplicar.

## Límites

N = 5 por variante, una máquina, medición en reposo (la carga no se controló); el perfil es de la prueba aislada, no dentro del archivo completo; la copia instrumentada pudo añadir un coste mínimo propio.
