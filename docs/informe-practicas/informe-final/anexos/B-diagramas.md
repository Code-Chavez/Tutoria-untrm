# Anexo B. Diagramas de diseño

Este anexo reúne los diagramas que se generan desde las fuentes del proyecto: los casos de uso (de las fuentes PlantUML), el modelo entidad-relación y el diccionario de datos (del esquema de Prisma, 50 tablas) y las clases de dominio (de las entidades del servidor). Los demás diagramas de diseño (contexto, actividades, secuencia, estados, componentes y despliegue) están en el Capítulo V, junto al texto que los explica. Referencia: `develop` al 19/11/2026 (`v1.0.0-beta.4`). Estado: actual (implementado).

## B.1 Diagramas de casos de uso

Cada figura muestra los actores y los casos de uso de un grupo de funciones. El alcance de cada actor está restringido por rol, escuela, servicio y periodo. Los identificadores (por ejemplo AC01, PE04) son de la documentación de casos de uso y no son historias del Product Backlog.

![Casos de uso: Vista general del SIT. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/cu-01.png)

![Casos de uso: Acceso y cuenta personal. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/cu-02.png)

![Casos de uso: Portal del estudiante. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/cu-03.png)

![Casos de uso: Acompañamiento del docente tutor. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/cu-04.png)

![Casos de uso: Preparación y gestión del periodo. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/cu-05.png)

![Casos de uso: Derivación y atención especializada. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/cu-06.png)

![Casos de uso: Informes y evaluación del servicio. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/cu-07.png)

![Casos de uso: Administración y supervisión institucional. Fuente: fuentes PlantUML de los casos de uso; v1.0.0-beta.4.](../figuras/cu-08.png)

[[horizontal]]
## B.2 Modelo entidad-relación por módulo

Cada figura muestra las tablas de un módulo con sus columnas de clave (PK clave primaria, FK clave foránea, UK única) y las relaciones entre ellas; una tabla de otro módulo aparece solo con su nombre. Todas las columnas están en el diccionario de datos (B.4). Las figuras se generan con un script a partir de `schema.prisma`, que falla si una tabla queda sin módulo.

![Entidad-relación ER-01: Acceso, cuentas y auditoría. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../figuras/er-01.png)

![Entidad-relación ER-02: Estructura académica y configuración. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../figuras/er-02.png)

![Entidad-relación ER-03: Estudiantes y acompañamiento del tutor. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../figuras/er-03.png)

![Entidad-relación ER-04: Solicitudes y sesiones de tutoría. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../figuras/er-04.png)

![Entidad-relación ER-05: Derivaciones, avisos y documentos. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../figuras/er-05.png)

![Entidad-relación ER-06: Evaluación, planes, informes y pedidos de listas. Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../figuras/er-06.png)

![Entidad-relación ER-07: Certificación del docente tutor (demostración). Fuente: esquema de la base de datos (Prisma); v1.0.0-beta.4.](../figuras/er-07.png)

## B.3 Clases de dominio por módulo

Las clases se generan desde las interfaces TypeScript de `server/src/domain/entities`; las asociaciones se infieren de los campos terminados en `Id` que apuntan a otra entidad del mismo diagrama. Muestran hasta 14 atributos por clase. No representan los módulos de certificación, pedidos de listas, asignación por ciclo ni amonestaciones, cuyos tipos viven junto a sus casos de uso; esos módulos se describen por su esquema de datos (B.2).

![Clases de dominio: Acceso y auditoría. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../figuras/cl-01.png)

![Clases de dominio: Estructura académica y configuración. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../figuras/cl-02.png)

![Clases de dominio: Estudiantes y acompañamiento del tutor. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../figuras/cl-03.png)

![Clases de dominio: Solicitudes y sesiones de tutoría. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../figuras/cl-04.png)

![Clases de dominio: Derivaciones, avisos y documentos. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../figuras/cl-05.png)

![Clases de dominio: Evaluación, planes e informes. Fuente: entidades del dominio del servidor; v1.0.0-beta.4.](../figuras/cl-06.png)

[[vertical]]
[[incluir: ../../../diagramas/entidad-relacion/DICCIONARIO_DE_DATOS.md | 1 | B.4 Diccionario de datos]]