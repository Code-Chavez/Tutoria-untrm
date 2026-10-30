# Fixture aislado de ConfirmDialog

Importa el componente y los estilos reales del cliente. No es una ruta del producto: se compila con su propia configuración y no inicia API, correo, sesión ni base de datos. La espera de tres segundos y el error son simulaciones explícitas, no cambios de los plazos de producción.

Desde `e2e`, ejecutar `DIALOG_CHANNEL=chrome pnpm exec playwright test --config playwright.dialog.config.ts` (en PowerShell: `$env:DIALOG_CHANNEL='chrome'` antes del comando). Se puede usar `msedge`; sin canal se usa Firefox. El servidor de la prueba se limita a `127.0.0.1`. Las pruebas se encuentran en `e2e/dialog-tests/`, fuera de la suite que opera sobre datos del sistema.

El workflow `dialog-browser.yml` prueba Firefox en un ejecutor Linux desechable. No instala Visual C++ en el equipo del usuario. Comprueba foco, Tab/Shift+Tab, Escape, confirmación única, rechazo y desbloqueo, tamaño de 375×812 y las dos preferencias de movimiento.

Una rueda quieta es esperada cuando `prefers-reduced-motion: reduce`: el estado de carga y el resultado siguen funcionando. No se debe ignorar esa preferencia para hacer girar el indicador.

La comprobación de este componente no equivale a recorrer toda la aplicación, a una prueba con lector de pantalla ni al soporte de diálogos anidados. Safari real requiere una comprobación en un dispositivo Apple; WebKit de Playwright no lo sustituye.
