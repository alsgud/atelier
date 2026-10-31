# Ends every leftover "atelier run ghjy" process and the agents under it.
# Safe to run twice: if none are left it just says so.
$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'atelier(\.mjs)?"?\s+run\s+ghjy' }
if (-not $procs) { "No ghjy runners left."; exit 0 }
foreach ($p in $procs) {
  "Ending runner $($p.ProcessId) (started $($p.CreationDate))"
  taskkill /T /F /PID $p.ProcessId | Out-Null
}
Start-Sleep -Seconds 2
$left = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'atelier(\.mjs)?"?\s+run\s+ghjy' }
"Runners left: $(@($left).Count)"
