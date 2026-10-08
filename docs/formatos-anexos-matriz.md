# Matriz de formatos del Protocolo de Tutoría (Anexos 3 a 9)

**Estado:** borrador para validar con la DBU (hallazgo A14). Se preparó a partir del código del sistema; **no se
contrastó campo por campo con el PDF oficial**, que no está en el repositorio. Cada fila "Pendiente de validar" es una
pregunta para la DBU. Nada de lo que sigue asume que un clic o un registro en pantalla equivalga a una firma: donde el
formato exige firma, el sistema produce el impreso y guarda el **escaneo firmado**.

## Mecanismo de conformidad acordado

Impreso firmado a mano + escaneo adjunto (decisión del responsable del proyecto). Cada documento firmado conserva: el
archivo (PDF/PNG/JPG, máx. 10 MB), **quién lo adjuntó, cuándo y la huella SHA-256**, y deja una entrada en la bitácora
de auditoría (`SIGNED_DOCUMENT_ATTACHED`). El acceso al archivo sigue la misma regla que el caso al que pertenece.

## Matriz

| Anexo | Formato | Qué registra hoy el sistema | Documento imprimible | Firma / conformidad | Pendiente de validar con la DBU |
|---|---|---|---|---|---|
| **3** | Entrevista inicial tutorial | Filiación adicional (nacimiento, procedencia, edad, religión, estado civil, orden entre hermanos, dirección, año de ingreso), motivos (académico, personal-emocional, vocacional + detalle), aspectos tratados, acuerdos. Persona de red de apoyo (nombre, parentesco, edad, ocupación, celular). El autor es el tutor autenticado. | Ficha en el expediente (PDF). Sin formato de firma. | El sistema registra al tutor como autor; **no hay conformidad del tutorado**. | ¿El formato exige firma del tutorado y del tutor? ¿Se imprime y escanea como la hoja del Anexo 4? |
| **4** | Hoja de asistencia a la tutoría individual (8 filas) | Sesión individual, fecha, tema, modalidad y **asistencia confirmada por el tutor** con número de sesión por tutor, tutorado y semestre (A08). | **Sí (A14):** hoja con filiación, 8 filas numeradas y columna «Firma del tutorado» + firma del tutor. | **Hoja firmada y escaneada** adjunta al tutorado y al semestre. La confirmación en pantalla no reemplaza la firma del estudiante. | ¿Tope de 8 por semestre (aplicado así)? ¿Una hoja por tutor o por tutorado? ¿Las sesiones grupales llevan otra hoja? |
| **5** | Ficha de seguimiento | Datos del docente y del tutorado, observaciones y acuerdos de seguimiento (HU-24). | Ficha en el expediente (PDF). | Sin firma registrada. | ¿Exige firma del tutor/tutorado? |
| **6** | Constancia / ficha de derivación | Los 17 aspectos observados (4 categorías), motivo, servicio de destino, instancia que recibe, estado y su historial. | **Sí (A14):** constancia con filiación completa (código, facultad, escuela, ciclo, correo, teléfono, tutor), datos de quien deriva, estado, aspectos, motivo, servicio, y **dos líneas de firma** (quien deriva y quien recibe). | **Constancia firmada y escaneada** adjunta a la derivación; la ven el tutor emisor, el servicio de destino y la DBU. | ¿Faltan campos de filiación del formato oficial? ¿Quién firma por el servicio receptor? |
| **7** | Cuestionario de evaluación de la función tutorial | Respuestas anónimas del estudiante por escuela y periodo (sin vínculo con la identidad). | Resultados agregados (PDF/Excel). | **No aplica firma:** es anónimo por diseño. | ¿Se requiere constancia de participación sin romper el anonimato? |
| **8** | Plan de trabajo semestral | Datos generales, objetivos, cronograma, recursos, presupuesto y actividades operativas; versiones aprobadas y revisiones (A12); resolución de aprobación en PDF. | Plan en PDF por versión aprobada. | La **resolución de aprobación** (PDF adjunto) es la evidencia de conformidad de la autoridad. | ¿Debe llevar firma del coordinador además de la resolución? |
| **9** | Informe semestral del tutor | Datos generales, tutorías individuales y grupales del periodo (desde asistencias registradas), tablas de resultados. | Informe en PDF con línea de firma del docente tutor. | Línea de firma del tutor en el impreso; **sin adjunto firmado todavía**. | ¿Se adjunta el informe firmado y quién lo recibe (coordinación/DBU)? |

## Documento canónico y resúmenes

- **Canónico:** el impreso del formato (constancia del Anexo 6, hoja del Anexo 4) con todos sus campos y firmas.
- **Resúmenes:** expediente del tutorado, tablero e informes consolidados; se calculan de lo registrado y **no reemplazan**
  al formato firmado.

## Cómo se verifica una conformidad

1. Abrir la derivación (Anexo 6) o el expediente del tutorado (Anexo 4).
2. En «Constancia firmada» / «Hoja firmada del semestre» se ve cada documento con quién lo adjuntó, la fecha y la huella.
3. La bitácora de auditoría (`/auditoria`, acción *SIGNED_DOCUMENT_ATTACHED*) registra la operación con su autor.
4. La huella SHA-256 permite comprobar que el archivo conservado es el mismo que se adjuntó.
