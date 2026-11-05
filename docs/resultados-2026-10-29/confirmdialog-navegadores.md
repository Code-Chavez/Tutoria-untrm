# ConfirmDialog: comprobación por navegador

## Alcance

El fixture `client/qa/confirm-dialog` importa el diálogo de producción y los estilos globales reales. No utiliza cuentas, API, base de datos ni correo. Su operación controlada dura tres segundos. El servidor de CI solo escucha en loopback.

- Chrome 156.0.8078.48: las dos pruebas de `playwright.dialog.config.ts` pasan localmente.
- Edge 156.0.4314.50: las dos pruebas pasan localmente.
- Firefox: el primer contrato de teclado/carga/error/móvil pasó en GitHub Actions Linux sobre `2085fd6`; la ampliación con los dos modos de movimiento debe acreditarse con la CI del commit siguiente.
- Safari real: el usuario probó la página en un iPhone 11 Pro, informó que abre y se presenta bien y observó una rueda quieta. Tras actualizar la página confirmó que el dispositivo solicita reducir movimiento. Se conserva esa preferencia. La versión de iOS no fue proporcionada y no se presenta como una prueba automatizada ni como recorrido de toda la aplicación.

En Chrome/Edge se comprueba: foco inicial en Cancelar, Tab/Shift+Tab dentro, Escape y retorno al origen, bloqueo mientras se confirma, contador de una sola operación, recuperación ante rechazo y ausencia de desbordamiento a 375×812. El primer arnés temporal usó un selector `status` ambiguo (el párrafo y el output); se corrigió el selector y se conservaron los registros previos. No fue un fallo del producto.

## Animación y accesibilidad

La regla existente de `global.css` reduce la duración de animaciones y limita su iteración cuando el sistema solicita movimiento reducido. Las pruebas nuevas verifican que, sin esa preferencia, el transform del indicador cambia, y que con ella el indicador queda limitado a una iteración mientras el diálogo anuncia carga y finalmente muestra el resultado. No se cambió el componente para forzar movimiento.

## Límites

No se acreditan lector de pantalla, diálogos anidados, todas las versiones de navegadores ni toda la aplicación. El Firefox descargado para Windows no arrancó (`spawn UNKNOWN`); no se instaló Visual C++. El resultado de Firefox se obtiene en Linux y se declara como tal. Los registros completos quedan locales, sin publicar datos de cuentas ni capturas.
