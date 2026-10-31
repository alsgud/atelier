# Clears stray Atelier processes that slow the PC. Safe to run twice.
# 1) every "atelier run ghjy" (atelier-ui's builder, stopped by the lead) and the agents under it
# 2) "atelier watch" processes whose parent has gone (orphans)
# 3) "atelier tick" processes older than 10 minutes (a tick should finish in seconds)
# Other projects' runners are only reported, never ended.
$all = Get-CimInstance Win32_Process
$ids = @{}; foreach ($p in $all) { $ids[[int]$p.ProcessId] = $true }
$atelier = $all | Where-Object { $_.CommandLine -match 'atelier(\.mjs)?"?\s+(run|watch|tick)\b' }
$cut = (Get-Date).AddMinutes(-10)
$ended = 0
foreach ($p in $atelier) {
  $cl = $p.CommandLine; $why = $null
  if ($cl -match '\srun\s+ghjy\b') { $why = 'ghjy runner' }
  elseif ($cl -match '\swatch\b' -and -not $ids[[int]$p.ParentProcessId]) { $why = 'orphan watch' }
  elseif ($cl -match '\stick\b' -and $p.CreationDate -lt $cut) { $why = 'stuck tick' }
  if ($why) {
    "Ending $why $($p.ProcessId) (started $($p.CreationDate))"
    taskkill /T /F /PID $p.ProcessId 2>$null | Out-Null
    $ended++
  }
}
"Ended: $ended"
"Runners still alive per task (other projects untouched):"
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'atelier(\.mjs)?"?\s+run\s+(\w+)' } |
  ForEach-Object { if ($_.CommandLine -match '\srun\s+(\w+)') { $Matches[1] } } |
  Group-Object | ForEach-Object { "  $($_.Name): $($_.Count)" }
