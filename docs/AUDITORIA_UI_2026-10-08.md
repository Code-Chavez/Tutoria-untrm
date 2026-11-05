# Revisión de interfaz y navegación — SIT UNTRM

Fecha: 8 de octubre de 2026. Instancia: http://localhost:5173/. Cuenta proporcionada por el usuario, autenticada como **Administrador DBU**. La contraseña no se conserva en este informe.

## Resultado

El acceso funcionó y se recorrieron las 18 entradas del menú del administrador, además del perfil, notificaciones, formularios de alta y pestañas de Administración y Catálogos. No se observaron excepciones ni advertencias en la consola capturada durante el recorrido. Esto no significa que todos los procesos estén certificados: se encontraron defectos de navegación, controles duplicados y pantallas pendientes.

**Corregir antes del release:** las dos versiones de configuración, la selección simultánea de opciones del menú y los títulos incorrectos. Después, simplificar iconos/acciones y mejorar accesibilidad.

El trabajo fue de revisión: no se crearon estudiantes, usuarios, planes ni derivaciones; no se alteraron parámetros reales, permisos o contraseñas. Se generó una consulta de informe sin modificar datos. No se cambiaron archivos de implementación ni se creó un commit o release.

## Hallazgos comprobados

### UI-01 · P2 · Dos opciones activas a la vez

En `/derivaciones/seguimiento` quedan seleccionadas **Casos derivados** y **Seguimiento DBU**. Se confirmó visualmente y mediante `aria-current="page"` en ambos enlaces. En `/informes/consolidado` ocurre lo mismo con **Informes** e **Informe consolidado**.

**Causa:** `client/src/shared/components/layout/Sidebar.tsx`, función `isActive`, acepta tanto coincidencia exacta como cualquier subruta de cada entrada.

**Mejora:** seleccionar únicamente el destino más específico entre las entradas visibles, o utilizar coincidencia exacta en las entradas con una pantalla independiente. Las rutas de detalle del expediente deben seguir seleccionando Expediente. **Aceptación:** en cada una de las 18 páginas existe exactamente una entrada activa; en perfil puede no existir ninguna.

### UI-02 · P2 · Configuración de parámetros duplicada y una versión sin persistencia

Existen `/parametros`, con configuración real por parámetro, y **Administración → Parámetros**, con una vista previa que indica que el backend se conectará próximamente. Esta última ofrece un botón **Guardar parámetros**.

**Evidencia adicional:** `SystemParametersPanel` en `client/src/features/admin/pages/UserManagementPage.tsx` utiliza estado local y `setSaved(true)`; no llama al servicio real. Se revisó el código para confirmar el comportamiento, sin cambiar valores de producción.

**Impacto:** el administrador puede usar la versión equivocada y creer que ha configurado el sistema.

**Mejora:** eliminar la implementación local y enlazar a `/parametros`, o reutilizar el mismo componente funcional. **Aceptación:** una sola fuente de configuración y todos los accesos muestran los mismos valores persistidos.

### UI-03 · P2 · Catálogos duplicado con mensaje contradictorio

**Administración → Catálogos** muestra “Este módulo estará disponible en una próxima iteración”, mientras que `/catalogos` ya permite consultar facultades, escuelas, periodos, ciclos, servicios y motivos.

**Mejora:** sustituir la pestaña pendiente por un enlace a la pantalla existente o consolidar la navegación. **Aceptación:** cualquier acceso a Catálogos conduce a la misma funcionalidad; no queda un mensaje de ausencia para una función implementada.

### UI-04 · P2 · Título y breadcrumb incorrectos

En `/informes`, el contenido muestra **Consolidado de horarios y asistencia**, pero la barra superior dice **Panel de inicio**, grupo Principal. En `/derivaciones/seguimiento`, el título superior sigue siendo **Casos derivados**, aunque el contenido es Seguimiento de Derivaciones.

**Causa:** faltan metadatos específicos para ambas rutas en `client/src/shared/components/layout/AppLayout.tsx`; la primera usa el fallback y la segunda hereda el nombre de su ruta base.

**Mejora:** añadir metadatos explícitos y compartir una definición de rutas entre menú, título y breadcrumbs. **Aceptación:** URL, selección del menú, título superior y encabezado de contenido describen la misma tarea.

### UI-05 · P2 · Acceso rápido de registro repite la acción de consulta

En el panel, **Registrar tutorado — Alta individual de un estudiante** y **Ver tutorados** llevan a `/tutorados`. Se pulsó Registrar tutorado y se confirmó que no se abre el formulario: hay que pulsar después **Nuevo tutorado**.

**Mejora:** hacer que el acceso de registro abra el alta de manera explícita, por ruta/acción controlada. **Aceptación:** Registrar tutorado abre el formulario; Ver tutorados abre la lista sin modal.

### UI-06 · P2 · Modal de alta con soporte de teclado incompleto

Al abrir **Nuevo tutorado**, el foco permaneció en el botón exterior que lo abrió. No se detectó `role="dialog"` ni elemento `dialog`. Al pulsar Escape, el formulario continuó abierto. Cancelar sí lo cerró.

**Mejora:** componente modal compartido con nombre accesible, `aria-modal`, foco inicial, contención de Tab, cierre mediante Escape y devolución del foco al disparador. **Aceptación:** completar el recorrido abrir → navegar → cancelar solo con teclado, sin que el foco llegue al contenido de fondo.

### UI-07 · P3 · Iconos idénticos para funciones diferentes

El menú no repite etiquetas ni destinos exactos. Sí repite gráficos:

| Icono compartido | Opciones |
|---|---|
| Engranaje | Administración, Catálogos, Parámetros, Identidad visual, Evaluación de tutoría |
| Documento con barras | Seguimiento DBU, Informes, Informe consolidado |
| Gráfico circular | Indicadores, Resultados de evaluación |

La repetición de un icono no ejecuta dos veces una acción; es un problema de diferenciación visual. En una misma pantalla también se repiten títulos entre barra superior y encabezado principal; es jerarquía visual, no doble carga de módulos.

**Propuesta:** personas para Usuarios y roles; estructura/lista para Catálogos; controles deslizantes para Parámetros; paleta para Identidad; cuestionario para Evaluación; recorrido/reloj para Seguimiento DBU; documento para Horarios y asistencia; documentos agrupados para Consolidado; gráfico de barras para Resultados.

### UI-08 · P3 · Nombres de catálogos con género incorrecto

Se observaron **Nuevo facultad** y **Nuevo escuela profesional**. Otros nombres, como Nuevo periodo académico, son correctos.

**Causa:** `CatalogsPage.tsx` concatena “Nuevo” con el singular del catálogo.

**Mejora:** texto explícito por catálogo, “Nueva facultad” y “Nueva escuela profesional”, o acción neutra “Agregar…”. **Aceptación:** botones y títulos de formularios mantienen redacción correcta en las seis pestañas.

### UI-09 · P2 · Auditoría todavía sin interfaz operativa

**Administración → Bitácora de auditoría** presenta un mensaje de próxima iteración. El panel también muestra Actividad reciente como bloque pendiente, no como consulta real a movimientos.

**Mejora:** conectar una vista de bitácora con búsqueda y filtros por fecha, actor y entidad; conectar actividad reciente o retirarla del alcance visible hasta completarla. **Aceptación:** una operación conocida registrada en un entorno de pruebas aparece en la bitácora con autor y fecha; el panel refleja movimientos reales o declara claramente que la función está fuera del release.

### UI-10 · P3 · Demasiadas acciones pequeñas por estudiante

Las filas de Tutorados contienen hasta diez acciones con iconos: expediente, solicitud, entrevista, sesión, seguimiento, derivación, reasignación, cuenta, riesgo y edición. La tabla requiere desplazamiento horizontal a la anchura de escritorio revisada.

**Mejora:** dejar dos o tres acciones frecuentes y agrupar las restantes en “Más acciones” con etiquetas. Diferenciar operaciones clínicas/tutoriales de gestión administrativa. **Aceptación:** todas las acciones son descubribles sin memorizar diez iconos; el menú funciona con teclado.

### UI-11 · P3 · Tooltips duplican etiquetas en el árbol de accesibilidad

En la lectura de las filas aparecen un botón “Ver expediente” y un tooltip independiente con el mismo texto; el patrón se repite con las demás acciones. No son dos botones visuales. `IconButton.tsx` mantiene todos los tooltips en el DOM y `IconButton.module.css` los oculta con opacidad, sin retirarlos del árbol de accesibilidad.

**Mejora:** revisar visibilidad semántica y relación entre tooltip y control, con IDs únicos y presentación solo cuando corresponda. **Aceptación:** el lector de pantalla identifica cada acción una vez y recibe ayuda contextual sin recorrer todos los textos ocultos.

## Cobertura de la revisión en navegador

| Pantalla / acción | Resultado observado |
|---|---|
| Inicio de sesión | Credenciales aceptadas; rol Administrador DBU |
| Cierre de sesión | Se pulsó Salir al terminar y se confirmó regreso a `/login` con el formulario visible |
| Panel de inicio | Carga; 11 activos, 8 con tutor, 3 en riesgo; actividad reciente pendiente |
| Tutorados | 12 registros, 10 en primera página y 2 en segunda; paginación operativa; apertura/cancelación de alta y consulta de expediente |
| Asignación | Carga 11 activos y cuatro tutores; alumnos ya asignados aparecen deshabilitados; no se confirmó ninguna nueva asignación |
| Carga masiva | Interfaz y control de archivo presentes; importar deshabilitado sin archivo; importación y plantilla descargada no verificadas |
| Expediente | Buscador accesible; se abrió un expediente existente, con datos de tutor y estado; historial vacío |
| Casos derivados | Carga estado vacío sin error visible; sin datos para probar recepción, atención, cierre o constancias |
| Seguimiento DBU | Carga contadores en cero; se detectó doble selección del menú |
| Plan semestral | Carga las tres escuelas; se seleccionó una y se abrió la estructura de datos y pestañas; no se guardó plan |
| Informes | Se generó consulta para un tutor existente; cero sesiones; título superior incorrecto |
| Informe consolidado | Carga por escuela/facultad; total 11 activos, 8 con tutor y cobertura 72,7%; doble selección del menú |
| Indicadores | Carga y coincide con cifras básicas del panel/consolidado; sin sesiones ni respuestas para comprobar métricas no vacías |
| Administración | Usuarios y formulario de nuevo usuario cargan; Catálogos, Parámetros y Bitácora presentan inconsistencias/pedientes |
| Catálogos | Se abrieron las seis pestañas; se confirmó tabla cargada de ciclos 1–14, cinco servicios y tres motivos; sin modificaciones |
| Parámetros | Cuatro parámetros reales cargan: 45 minutos, 8 sesiones, umbral 2 y plazo 48 horas; botones de guardar/restablecer deshabilitados sin cambios |
| Identidad visual | Nombres, colores, logotipo y vista previa cargan; no se modificó ni guardó identidad |
| Configuración de evaluación | Tabla por escuela cargada: Sistemas habilitada, otras dos cerradas; no se cambiaron estados |
| Resultados de evaluación | Estado vacío coherente con cero respuestas; exportación deshabilitada |
| Sugerencias | Filtros cargan y muestran ausencia de comentarios |
| Perfil | Datos y formularios cargan; no se cambió información ni contraseña |
| Notificaciones | Se abre y cierra el desplegable; estado “No tienes notificaciones” |
| Exportación PDF de horarios/asistencia | Se pulsó PDF después de generar el informe; la herramienta no recibió evento de descarga en 20 s y la página no mostró error. **Inconcluso:** no se certifica descarga ni se afirma que esté rota |
| Excel y contenido de exportaciones | No certificados en esta revisión; requieren descarga verificable e inspección del archivo |
| Consola capturada | Sin errores ni advertencias observados durante el recorrido |

## Orden propuesto de mejora

1. Eliminar las implementaciones duplicadas de Catálogos y Parámetros en Administración y reutilizar las pantallas funcionales.
2. Corregir coincidencia de rutas activas y metadatos de encabezados; renombrar Informes a **Horarios y asistencia** y Administración a **Usuarios y roles** si esa es su función efectiva.
3. Dar a cada función importante un icono reconocible y agrupar el menú en Tutoría, Reportes, Evaluación y Configuración. Mantener consistencia entre sidebar, panel y títulos.
4. Conectar bitácora/actividad reciente y corregir acceso directo de alta, modales, tooltips y redacción.
5. Ejecutar pruebas con datos ficticios controlados para sesiones, asistencias, derivaciones, planes, importación, evaluaciones y descargas, más recorridos con cada rol y revisión móvil.

No se puede afirmar “ninguna cosa falla” con una sola cuenta y una base sin movimientos. La revisión sí identifica los defectos reproducidos y qué comprobaciones faltan para considerar listo el release. Los hallazgos de la auditoría anterior del 6 de octubre no se dan por vigentes ni por resueltos a partir de esta prueba de interfaz.
