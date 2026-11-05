$out = 'C:\tmp\runs\flaky\cpu2.csv'
while ($true) {
  $p = (Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'").PercentProcessorTime
  $m = (Get-CimInstance Win32_OperatingSystem); $free = [math]::Round($m.FreePhysicalMemory/1024)
  Add-Content -Path $out -Value ("{0},{1},{2}" -f (Get-Date).ToUniversalTime().ToString('o'), $p, $free)
  Start-Sleep -Seconds 3
}
