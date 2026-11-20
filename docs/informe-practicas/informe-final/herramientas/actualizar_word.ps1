# Abre el informe en Word, actualiza los índices y los campos (tabla de contenido, listas de tablas y figuras, números de página),
# guarda el .docx y exporta el PDF. Requiere Microsoft Word. Uso: powershell -File actualizar_word.ps1
param([string]$Docx = (Join-Path (Split-Path $PSScriptRoot -Parent) 'Informe_Final_Practicas_Brayni_Chavez.docx'))
$ErrorActionPreference = 'Stop'
$pdf = [System.IO.Path]::ChangeExtension($Docx, '.pdf')
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($Docx)
  $doc.Repaginate()
  foreach ($toc in @($doc.TablesOfContents)) { $toc.Update() }
  foreach ($toc in @($doc.TablesOfFigures)) { $toc.Update() }
  $null = $doc.Fields.Update()
  foreach ($toc in @($doc.TablesOfContents)) { $toc.Update() }
  foreach ($toc in @($doc.TablesOfFigures)) { $toc.Update() }
  $doc.Repaginate()
  $paginas = $doc.ComputeStatistics(2)
  "paginas=$paginas"
  "indices: contenido=" + $doc.TablesOfContents.Count + " tablas_y_figuras=" + $doc.TablesOfFigures.Count
  $doc.Save()
  $doc.ExportAsFixedFormat($pdf, 17)
  $doc.Close($false)
} finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
"pdf=" + (Get-Item $pdf).Length + " bytes"
