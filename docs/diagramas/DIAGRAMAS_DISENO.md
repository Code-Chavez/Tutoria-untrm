# Diagramas de diseño del SIT UNTRM

**Estado:** actual (implementado), salvo lo marcado como *propuesto* o *pendiente*. **Referencia:** `develop` al 19/11/2026 (`v1.0.0-beta.4`). **Formato:** Mermaid; las figuras de casos de uso, entidad-relación y clases se generan con scripts desde las fuentes (`docs/diagramas/casos-de-uso/*.puml`, `server/prisma/schema.prisma`, `server/src/domain/entities`); las de esta página están dibujadas a mano a partir del código y de las pantallas, y cada una dice de dónde sale.

## DOC-D01 · Contexto del sistema

**Propósito:** personas, sistema y servicios externos, con sus límites. **Fuente:** roles en `server/prisma/seed` y `docs/MANUAL_TECNICO.md` (modelo de roles); correo y respaldo en `docs/MANUAL_TECNICO.md`.

```mermaid
flowchart LR
    est["Estudiante (Tutorado)"]
    doc["Docente tutor"]
    coord["Coordinador de escuela"]
    serv["Profesional de servicio"]
    dbu["Administración DBU"]
    vice["Vicerrectorado"]
    dec["Decano"]
    subgraph sit["SIT UNTRM"]
      cli["Cliente web (React)"]
      api["API (Express)"]
      bd[("PostgreSQL 16")]
    end
    smtp["Servidor de correo institucional (SMTP)"]
    resp["Copia de respaldo fuera del servidor"]
    est --> cli
    doc --> cli
    coord --> cli
    serv --> cli
    dbu --> cli
    vice --> cli
    dec --> cli
    cli -->|"HTTPS / JSON"| api
    api --> bd
    api -->|"avisos y pedidos"| smtp
    bd -.->|"respaldo programado"| resp
    classDef pendiente stroke-dasharray: 5 5
    class smtp,resp pendiente
```

Las líneas punteadas indican servicios cuya entrega institucional sigue pendiente de TI.

## DOC-D05a · Actividades: de la solicitud de tutoría a la atención o la derivación

**Propósito:** recorrido de una necesidad de acompañamiento. **Fuente:** estados de `TutoringRequest` y `StudentReferral` (`server/src/domain/entities`) y el manual de usuario (secciones del tutor).

```mermaid
flowchart TD
    A(["Una necesidad de acompañamiento"]) --> B["El estudiante pide tutoría, o el docente la registra"]
    B --> C{"¿Quién la recibe?"}
    C -->|"tutor asignado"| D["Revisa la solicitud (PENDIENTE)"]
    C -->|"coordinador (sin tutor)"| D
    D --> E{"¿Se agenda?"}
    E -->|"sí"| F["Programa una sesión individual o grupal"]
    F --> G["Registra la asistencia (Anexo 4)"]
    G --> H["Completa la ficha de seguimiento (Anexo 5)"]
    H --> I{"¿Necesita atención especializada?"}
    I -->|"sí"| J["Ficha de derivación (Anexo 6)"]
    J --> K["Servicio destino: Escuela, Psicopedagogía, Psicología, Asistencia Social o Salud"]
    K --> L["Recibe, atiende y cierra el caso"]
    I -->|"no"| M(["Solicitud ATENDIDA"])
    E -->|"responde sin sesión"| M
    L --> M
```

## DOC-D05b · Actividades: preparación y cierre del periodo

**Propósito:** ciclo de un periodo académico en el sistema. **Fuente:** `docs/MANUAL_USUARIO.md` (Periodo académico) y `PeriodLifecycleUseCases.ts`.

```mermaid
flowchart TD
    A(["Periodo abierto por la administración"]) --> B["Pedir las listas a las escuelas o facultades"]
    B --> C["Cargar estudiantes y docentes del periodo"]
    C --> D["Asignar un tutor por ciclo"]
    D --> E{"¿El tutor acepta?"}
    E -->|"sí"| F["Acompañamiento: sesiones, seguimientos, derivaciones"]
    E -->|"no"| D
    F --> G["Informes semestrales y plan de trabajo"]
    G --> H["Revisar pendientes del cierre"]
    H --> I["La DBU escribe el nombre del periodo para confirmar"]
    I --> J(["Periodo CERRADO: solo lectura y resumen guardado"])
```

## DOC-D06a · Secuencia: inicio de sesión

**Propósito:** autenticación con renovación de sesión. **Fuente:** `docs/MANUAL_TECNICO.md` (seguridad) y las rutas de autenticación.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant C as Cliente web
    participant A as API (AuthController)
    participant L as Caso de uso de acceso
    participant R as Repositorios (Prisma)
    U->>C: correo y contraseña
    C->>A: POST /api/auth/login
    A->>L: ejecutar(credenciales)
    L->>R: buscar usuario y comprobar bloqueo
    R-->>L: usuario activo
    L->>L: comparar con bcrypt
    alt credenciales válidas
        L->>R: guardar el token de renovación
        L-->>A: token de acceso y de renovación (JWT)
        A-->>C: 200 con la sesión
        C-->>U: panel según el rol
    else inválidas
        L->>R: sumar intento fallido (bloqueo tras 5 intentos)
        A-->>C: 401 con mensaje genérico
    end
```

## DOC-D06b · Secuencia: solicitud de tutoría y aviso por correo

**Propósito:** cómo viaja una solicitud y su aviso. **Fuente:** `TutoringRequest`, `Notification` y `EmailOutbox` en `schema.prisma`; `EmailOutboxWorker` en `server/src/infrastructure/services`.

```mermaid
sequenceDiagram
    actor E as Estudiante
    participant C as Cliente web
    participant A as API
    participant U as Caso de uso de solicitudes
    participant B as PostgreSQL
    participant W as Proceso de envío de correos
    participant M as Servidor SMTP
    actor T as Tutor o coordinador
    E->>C: motivo y tipo de caso
    C->>A: POST /api/students/:id/tutoring-requests
    A->>U: ejecutar(solicitud)
    U->>U: validar permiso, alcance y destinatario
    U->>B: guardar la solicitud y el aviso (con su correo en cola si el correo está habilitado)
    B-->>U: confirmado
    U-->>A: solicitud registrada
    A-->>C: 201
    W->>B: tomar correos en cola
    W->>M: enviar aviso
    M-->>T: correo y campana de avisos
```

## DOC-D07a · Estados de la solicitud de tutoría

**Fuente:** `TUTORING_REQUEST_STATUSES` en `server/src/domain/entities/TutoringRequest.ts` y `UpdateTutoringRequestStatusUseCase.ts` (avanza sin retroceder; al atenderla se deja una respuesta).

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE
    PENDIENTE --> EN_ATENCION
    EN_ATENCION --> ATENDIDA : con respuesta para el estudiante
    ATENDIDA --> [*]
```

## DOC-D07b · Estados de la derivación

**Fuente:** `ReferralStatus` y la regla de avance en `referralAccess.ts`: el estado solo avanza; se puede saltar una etapa, no retroceder.

```mermaid
stateDiagram-v2
    [*] --> ENVIADO
    ENVIADO --> RECIBIDO
    RECIBIDO --> EN_ATENCION
    EN_ATENCION --> ATENDIDO
    ATENDIDO --> CERRADO
    CERRADO --> [*]
```

## DOC-D07c · Estados del trámite de certificación (demostración)

**Fuente:** `server/src/domain/certification/certificateWorkflow.ts` y `certificateStatus.ts`. Los estados `PENDIENTE_DE_FIRMA`, `FIRMADO_INCORPORADO` y `ENTREGADO` existen en el modelo pero **ningún certificado de demostración puede alcanzarlos**; esperan la plantilla oficial.

```mermaid
stateDiagram-v2
    [*] --> INICIADO
    INICIADO --> EN_REVISION : presentar
    EN_REVISION --> OBSERVADO : observar
    OBSERVADO --> EN_REVISION : reenviar
    EN_REVISION --> RECHAZADO : rechazar
    EN_REVISION --> APROBADO : aprobar
    APROBADO --> GENERADO_SIN_FIRMA : generar PDF de demostración
    INICIADO --> ANULADO : anular
    EN_REVISION --> ANULADO : anular
    OBSERVADO --> ANULADO : anular
    APROBADO --> ANULADO : anular
    GENERADO_SIN_FIRMA --> ANULADO : anular
    RECHAZADO --> [*]
    ANULADO --> [*]
    GENERADO_SIN_FIRMA --> PENDIENTE_DE_FIRMA : con plantilla oficial (no disponible)
    PENDIENTE_DE_FIRMA --> FIRMADO_INCORPORADO
    FIRMADO_INCORPORADO --> ENTREGADO
```

## DOC-D07d · Estados del periodo académico

**Fuente:** `stateOf` en `server/src/application/use-cases/periods/PeriodLifecycleUseCases.ts`. Solo se puede cerrar el vigente, escribiendo su nombre; solo se reabre un cerrado si no hay otro vigente.

```mermaid
stateDiagram-v2
    [*] --> SIN_ABRIR
    SIN_ABRIR --> VIGENTE : abrir
    VIGENTE --> CERRADO : cerrar con confirmación
    CERRADO --> VIGENTE : reabrir (si no hay otro vigente)
```

## DOC-D08 · Componentes

**Fuente:** `docs/MANUAL_TECNICO.md` (arquitectura) y las carpetas `server/src` y `client/src`.

```mermaid
flowchart TB
    subgraph cliente["Cliente (React + Vite)"]
      pag["Páginas por funcionalidad (features)"]
      est["Estado y caché de peticiones (React Query)"]
      svc["Servicios HTTP"]
      pag --> est --> svc
    end
    subgraph api["Servidor (Node.js + Express, hexagonal)"]
      rutas["Rutas y controladores (interfaces/http)"]
      mw["Autenticación, permisos y validación (Zod)"]
      uc["Casos de uso (application)"]
      dom["Entidades y puertos (domain)"]
      inf["Adaptadores (infrastructure): repositorios Prisma, correo, PDF, seguridad"]
      cola["Proceso de envío de correos"]
      rutas --> mw --> uc --> dom
      inf -. implementa .-> dom
      uc --> inf
      cola --> inf
    end
    bd[("PostgreSQL 16")]
    smtp["SMTP"]
    svc -->|"HTTPS / JSON"| rutas
    inf --> bd
    cola --> smtp
```

## DOC-D09 · Despliegue

**Fuente:** `docker-compose.yml` (desarrollo), `docker-compose.prod.yml` (producción) y `docs/MANUAL_TECNICO.md`. El entorno institucional con HTTPS y correo **no está entregado** (pendiente de TI): lo que se muestra de producción es la definición del repositorio, no un despliegue realizado.

```mermaid
flowchart LR
    subgraph dev["Desarrollo y pruebas (Docker Compose)"]
      d1["client (Vite, 5173)"] --> d2["server (3000)"]
      d2 --> d3[("postgres:16, 5432")]
      d2 --> d4["mailpit (8025)"]
      d5["backup"] --> d3
    end
    subgraph prod["Producción (definición en docker-compose.prod.yml)"]
      p1["web (cliente servido)"] --> p2["server"]
      p2 --> p3[("postgres:16, volumen pgdata")]
      p4["backup"] --> p3
    end
    p2 -.-> p5["SMTP institucional (pendiente)"]
    p4 -.-> p6["Copia externa (pendiente)"]
```
