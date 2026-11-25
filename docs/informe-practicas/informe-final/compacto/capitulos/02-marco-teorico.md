# Capítulo II. Marco teórico y normativo

Este capítulo reúne los conceptos y las normas en los que se apoya el proyecto. Cada fuente citada es externa al repositorio del sistema y figura en las referencias en formato APA 7.

## 2.1 La tutoría universitaria

La tutoría universitaria es un proceso de acompañamiento del estudiante durante su formación. En el Perú, su organización y sus resultados han sido estudiados en distintas universidades. La evaluación del sistema de tutoría de la Universidad Nacional de San Martín, con un diseño descriptivo no experimental y cuestionarios aplicados a docentes, estudiantes y personal administrativo, encontró que la tutoría de inicio de estudios se valoraba como regular, la de permanencia como parcialmente desarrollada y la de egreso como deficiente, y señaló como carencias la falta de acceso a la información de los estudiantes, la ausencia de planificación y de documentación que respalden a los tutores, y el escaso conocimiento de la tutoría entre estudiantes y tutores (García-Castro et al., 2023). La construcción y validación de una escala para valorar el servicio de tutoría universitaria (Alegre Bravo, 2025) muestra, además, que el servicio puede ser objeto de medición con instrumentos específicos, como lo hace el cuestionario de evaluación que incorpora el sistema.

La investigación sobre permanencia en la educación superior ofrece un marco para entender por qué importa este acompañamiento. El modelo de Tinto (1975) sintetiza la deserción como un proceso en el que la integración académica y social del estudiante con la institución influye en su decisión de continuar. Aunque el modelo no se evalúa en este proyecto, orienta el diseño: el sistema ayuda a detectar a tiempo a los estudiantes en riesgo, a registrar lo que se hizo por ellos y a derivarlos a los servicios que corresponden.

## 2.2 Marco normativo

**Ley Universitaria.** La Ley N.° 30220 (2014) rige el sistema universitario peruano y, entre los deberes de los docentes, incluye brindar tutoría a los estudiantes para orientarlos en su desarrollo profesional o académico (art. 87). Esa obligación es el fundamento legal de que el servicio exista y se organice.

**Protocolo de la UNTRM.** El Protocolo de Acompañamiento de Tutoría N.° 01-2024-UNTRM/DBU, aprobado por la Resolución de Consejo Universitario N.° 283-2024 (UNTRM, 2024), es el documento institucional que el sistema sistematiza. Define actores, actividades y formatos (los anexos del protocolo), que el sistema reproduce como registros: entrevista inicial, hoja de asistencia, ficha de seguimiento, ficha de derivación, cuestionario de evaluación y planes e informes semestrales.

**Protección de datos personales.** La Ley N.° 29733 (2011) tiene por objeto garantizar el derecho fundamental a la protección de los datos personales, y su reglamento vigente, aprobado por el Decreto Supremo N.° 016-2024-JUS (2024), sustituyó al de 2013. Para un sistema de tutoría, que trata datos de estudiantes y, en las derivaciones, datos de salud, psicología y situación social, esto exige tratar los datos con finalidad definida, limitar el acceso a quienes los necesitan y dejar rastro de las consultas y los cambios. La decisión institucional sobre el tratamiento de datos reales (anonimato de la evaluación, alcance de lo visible por rol) sigue pendiente de la DBU y se declara como tal en este informe.

## 2.3 Ingeniería de software y desarrollo iterativo e incremental

La ingeniería de software organiza el desarrollo de sistemas en actividades de especificación, diseño, implementación, verificación y evolución, y distingue los procesos dirigidos por un plan de los procesos que se adaptan al cambio (Sommerville, 2016). Entre los enfoques adaptativos, el desarrollo iterativo e incremental no es reciente: Larman y Basili (2003) rastrean su práctica hasta mediados de la década de 1950 y muestran que se aplicó mucho antes de que existieran los marcos ágiles actuales. En ese enfoque el sistema se construye en incrementos, cada uno de los cuales se revisa y se corrige en iteraciones posteriores.

Este proyecto usa esa idea sobre un plan por fases (capítulo IV), sin atribuirse la aplicación de un marco de gestión determinado.

## 2.4 Arquitectura de software

El servidor del sistema usa una arquitectura hexagonal, también llamada de puertos y adaptadores. Su autor la propuso para que una aplicación pueda ser accionada por usuarios, programas, pruebas automáticas o procesos por lotes, y para desarrollarla y probarla aislada de sus bases de datos y dispositivos de ejecución finales (Cockburn, 2005). En el proyecto, el dominio y los casos de uso no dependen de la infraestructura: los repositorios (puertos) son interfaces que implementan adaptadores sobre Prisma y PostgreSQL, el correo y la generación de documentos. Esto permite probar las reglas del proceso tutorial con repositorios en memoria y cambiar la tecnología de persistencia sin reescribir las reglas.

## 2.5 Calidad del producto de software

La norma ISO/IEC 25010 define el modelo de calidad del producto de software y de sistemas; su edición de 2023 lo organiza en nueve características con sus subcaracterísticas, como referencia para especificar, medir y evaluar la calidad (International Organization for Standardization [ISO] e International Electrotechnical Commission [IEC], 2023). El proyecto la usa como lente para ordenar sus requisitos no funcionales (seguridad, rendimiento, usabilidad, mantenibilidad), no como una certificación: no se afirma que el producto cumpla la norma, sino que sus requisitos de calidad se formularon y se verificaron en la medida que muestra el capítulo VI.

## 2.6 Seguridad de aplicaciones web

La seguridad se trabajó con el OWASP Top 10:2021, un documento de concienciación que reúne los riesgos más graves de las aplicaciones web y que coloca en primer lugar el control de acceso roto (OWASP Foundation, 2021). La revisión del proyecto recorrió esas categorías sobre las rutas de la API y sobre los datos que cada rol puede ver.

Dos mecanismos concretos sustentan la autenticación. Los tokens de sesión siguen el estándar JSON Web Token, un formato compacto para transmitir afirmaciones entre dos partes que pueden firmarse o cifrarse (Jones et al., 2015). Las contraseñas se almacenan con bcrypt, un esquema diseñado para que su costo computacional pueda aumentar a medida que mejora el hardware de un atacante (Provos y Mazières, 1999).

## 2.7 Usabilidad y accesibilidad

La interfaz se revisó con las diez heurísticas de usabilidad de Nielsen (1994), reglas generales como la visibilidad del estado del sistema, el control y la libertad del usuario, la prevención de errores y la ayuda para reconocer y corregir errores. Un ejemplo del proyecto es la validación del formulario del plan semestral: marca el primer campo obligatorio vacío, lo nombra y lleva el foco hasta él, en lugar de esperar una respuesta del servidor.

Para la accesibilidad se tomó como referencia las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1 del Consorcio W3C (World Wide Web Consortium [W3C], 2025). Las pruebas de extremo a extremo incluyen verificaciones automáticas de accesibilidad, que detectan solo una parte de los problemas posibles y no sustituyen una prueba con lector de pantalla y con usuarios.

## 2.8 Tecnologías empleadas

[[tabla: Tecnologías principales y su fuente de referencia]]

| Capa | Tecnología | Uso en el sistema | Referencia |
| --- | --- | --- | --- |
| Servidor | Node.js | Entorno de ejecución de la API | OpenJS Foundation (s. f.) |
| Base de datos | PostgreSQL 16 | Persistencia relacional (50 tablas) | PostgreSQL Global Development Group (s. f.) |
| Cliente | React | Interfaz por componentes y estado | React (s. f.) |
| Pruebas | Playwright | Recorridos de extremo a extremo en navegador | Microsoft (s. f.) |
| Control de versiones | Git | Historial, ramas y versiones etiquetadas | Chacon y Straub (2014) |
| Mensajes de commit | Conventional Commits 1.0.0 | Convención para los mensajes de cada cambio | Conventional Commits (s. f.) |

Las demás herramientas (TypeScript, Express, Prisma, Docker, Jest, Vitest, Vite) se describen en el Anexo E.
