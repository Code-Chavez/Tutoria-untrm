$ErrorActionPreference = 'Stop'
$reportDocPath = Join-Path $PSScriptRoot 'Informe_Practicas_Brayni_Chavez_V02.docx'
$reportRenderDir = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'tmp/informe-practicas-render'
New-Item -ItemType Directory -Path $reportRenderDir -Force | Out-Null
$reportPdfPath = Join-Path $reportRenderDir 'Informe_Practicas_Brayni_Chavez_V02.pdf'
$reportWordApp = $null
$reportWordDocument = $null
$reportOwnEmptyInstance = $false
try {
    $reportWordApp = New-Object -ComObject Word.Application
    $reportOwnEmptyInstance = ($reportWordApp.Documents.Count -eq 0 -and -not $reportWordApp.Visible)
    $reportWordDocument = $reportWordApp.Documents.Open($reportDocPath, $false, $true, $false)
    $reportWordDocument.Repaginate()
    $reportWordDocument.ExportAsFixedFormat($reportPdfPath, 17)
    Write-Output "PDF: $reportPdfPath"
    Write-Output "Pages: $($reportWordDocument.ComputeStatistics(2))"
} finally {
    if ($null -ne $reportWordDocument) {
        $reportWordDocument.Close(0)
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($reportWordDocument)
    }
    if ($null -ne $reportWordApp) {
        if ($reportOwnEmptyInstance -and $reportWordApp.Documents.Count -eq 0) { $reportWordApp.Quit(0) }
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($reportWordApp)
    }
}
