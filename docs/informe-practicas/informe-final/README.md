# Informe final de prácticas

Fuentes y herramientas del informe final de prácticas preprofesionales (Word y PDF). El texto está en Markdown (`capitulos/` y `anexos/`); el Word se genera, no se edita a mano.

## Reconstruir el informe

1. Instalar una vez el renderizador de diagramas (fuera del repositorio) y Python con `python-docx` y `pypdf`:
   `mkdir C:/tmp/mmdc && cd C:/tmp/mmdc && npm init -y && PUPPETEER_SKIP_DOWNLOAD=1 npm install @mermaid-js/mermaid-cli@11.4.2`
2. `python ../../diagramas/entidad-relacion/generar_er.py` (diagramas entidad-relación y diccionario de datos desde `schema.prisma`).
3. `python herramientas/renderizar_diagramas.py` (figuras en `figuras/`, no se versiona).
4. `python herramientas/preparar_anexos.py` (anexos A, B y F, derivados de otras fuentes).
5. `python generar_informe_final.py` (escribe `Informe_Final_Practicas_Brayni_Chavez.docx`).
6. `powershell -File herramientas/actualizar_word.ps1` (Word actualiza los índices y los campos y exporta el PDF).

## Reglas del contenido

- Todas las referencias de `capitulos/08-referencias.md` son **externas** al proyecto, están en APA 7 y se comprobaron contra su fuente (DOI, editorial o página oficial). Los documentos del proyecto se presentan como anexos (evidencia), no como referencias.
- No se inventa nada sobre horas, asistencia, supervisor, constancias, piloto con usuarios ni aprobaciones: van como «pendiente de acreditar» (Anexo L).
- Cada cifra del informe indica su commit y su fuente.
