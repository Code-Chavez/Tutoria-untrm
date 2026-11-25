# Diagramas compactos para el informe impreso

Versiones más cortas de los diagramas de `docs/diagramas/DIAGRAMAS_DISENO.md` (mismas fuentes y mismo contenido esencial), con menos texto por nodo para que se lean bien al ancho de una hoja. `renderizar_diagramas.py` las convierte en `figuras/dc-*.png`.

## dc-d01 · Contexto

```mermaid
flowchart TB
    roles["Estudiante · Docente tutor · Coordinador<br/>Profesional de servicio · DBU · Vicerrectorado · Decano"]
    subgraph sit["SIT UNTRM"]
      cli["Cliente web (React)"] -->|"HTTPS / JSON"| api["API (Express)"]
      api --> bd[("PostgreSQL 16")]
    end
    smtp["Correo institucional (SMTP)<br/>pendiente de TI"]
    resp["Copia de respaldo externa<br/>pendiente de TI"]
    roles --> cli
    api -->|"avisos y pedidos"| smtp
    bd -.->|"respaldo programado"| resp
    classDef pendiente stroke-dasharray: 5 5
    class smtp,resp pendiente
```

## dc-d05 · Actividades

```mermaid
flowchart TB
    subgraph A["Atención de una solicitud"]
      direction TB
      A1["Solicitud del estudiante<br/>o del docente"] --> A2["Llega al tutor o, si no hay,<br/>a la coordinación"]
      A2 --> A3{"¿Se agenda?"}
      A3 -->|"sí"| A4["Sesión, asistencia (Anexo 4)<br/>y seguimiento (Anexo 5)"]
      A3 -->|"responde sin sesión"| A8(["ATENDIDA"])
      A4 --> A5{"¿Atención<br/>especializada?"}
      A5 -->|"no"| A8
      A5 -->|"sí"| A6["Derivación (Anexo 6):<br/>el servicio atiende y cierra"]
      A6 --> A8
    end
    subgraph B["Preparación y cierre del periodo"]
      direction TB
      B1["Pedir listas a escuelas<br/>o facultades"] --> B2["Cargar estudiantes<br/>y docentes"]
      B2 --> B3["Asignar un tutor por ciclo<br/>(acepta o rechaza)"]
      B3 --> B4["Acompañamiento, informes<br/>y plan semestral"]
      B4 --> B5["La DBU escribe el nombre<br/>del periodo para cerrar"]
      B5 --> B6(["CERRADO: solo lectura"])
    end
```

## dc-d06a · Secuencia del inicio de sesión

```mermaid
sequenceDiagram
    actor U as Usuario
    participant C as Cliente
    participant A as API
    participant R as Base de datos
    U->>C: correo y contraseña
    C->>A: POST /api/auth/login
    A->>R: buscar usuario, ver bloqueo
    A->>A: comparar con bcrypt
    alt válidas
        A->>R: guardar token de renovación
        A-->>C: tokens JWT
        C-->>U: panel según el rol
    else inválidas
        A->>R: sumar intento (bloqueo a los 5)
        A-->>C: 401 genérico
    end
```

## dc-d06b · Secuencia de una solicitud y su aviso

```mermaid
sequenceDiagram
    actor E as Estudiante
    participant C as Cliente
    participant A as API y BD
    participant W as Correos
    actor T as Tutor
    E->>C: motivo y caso
    C->>A: crear solicitud
    A->>A: validar permiso
    A-->>C: 201
    W->>A: tomar correos en cola
    W-->>T: correo y aviso
```
