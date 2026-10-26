# Lists visible top-level windows owned by any descendant of the given root process ids.
# Output: JSON array of { pid, name, title, root }. Used by lib/screen.mjs to keep agents off the
# owner's screen.
param([string]$Roots = '')

$ErrorActionPreference = 'SilentlyContinue'
$rootIds = @($Roots -split ',' | Where-Object { $_ } | ForEach-Object { [int]$_ })
if (-not $rootIds.Count) { '[]'; exit 0 }

Add-Type @"
using System; using System.Collections.Generic; using System.Runtime.InteropServices; using System.Text;
public class AtelierWin {
  public delegate bool P(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(P p, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  public static List<string> Visible() {
    var list = new List<string>();
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h) || GetWindow(h, 4) != IntPtr.Zero) return true; // skip hidden and owned popups
      uint pid; GetWindowThreadProcessId(h, out pid);
      var sb = new StringBuilder(256); GetWindowText(h, sb, 256);
      list.Add(pid + "\t" + sb.ToString());
      return true;
    }, IntPtr.Zero);
    return list;
  }
}
"@

$procs = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CreationDate
$children = @{}
$created = @{}
foreach ($p in $procs) {
  $k = [int]$p.ParentProcessId
  if (-not $children.ContainsKey($k)) { $children[$k] = New-Object System.Collections.ArrayList }
  [void]$children[$k].Add($p)
  $created[[int]$p.ProcessId] = $p.CreationDate
}
$owner = @{}   # pid -> root
$names = @{}
foreach ($p in $procs) { $names[[int]$p.ProcessId] = $p.Name }
foreach ($r in $rootIds) {
  if (-not $created.ContainsKey($r)) { continue }
  $queue = New-Object System.Collections.Queue
  $queue.Enqueue($r)
  while ($queue.Count) {
    $id = [int]$queue.Dequeue()
    if ($owner.ContainsKey($id)) { continue }
    $owner[$id] = $r
    if ($children.ContainsKey($id)) {
      foreach ($c in $children[$id]) {
        # Windows reuses process ids, and a process keeps its parent's id after the parent exits. A real
        # child is always created after its parent; anything older only inherited a recycled id (that's
        # how the owner's own Chrome, Settings and installers were once mistaken for an agent's).
        if ($c.CreationDate -ge $created[$id]) { $queue.Enqueue([int]$c.ProcessId) }
      }
    }
  }
}
$out = @()
foreach ($line in [AtelierWin]::Visible()) {
  $parts = $line -split "`t", 2
  $id = [int]$parts[0]
  if (-not $owner.ContainsKey($id)) { continue }
  $name = [string]$names[$id]
  if ($name -match '^(conhost|cmd|powershell|pwsh|bash|node|claude|git|OpenConsole|WindowsTerminal)\.exe$') { continue }
  # Never anything that belongs to Windows or is one of the owner's everyday apps, whatever its ancestry.
  if ($name -match '^(explorer|svchost|dwm|sihost|ctfmon|SystemSettings|ApplicationFrameHost|TextInputHost|ShellExperienceHost|StartMenuExperienceHost|SearchApp|SearchHost|RuntimeBroker|LockApp|SecurityHealthSystray|msedge|msedgewebview2|chrome|firefox|brave|Code|Discord|Spotify|Steam|steamwebhelper|Overwolf|Claude|Wispr Flow|tailscale.*|wixstdba|msiexec|setup.*|.*installer.*|Taskmgr|mmc|notepad|WINWORD|EXCEL|POWERPNT|Teams|Zoom|obs64)\.exe$') { continue }
  $out += [pscustomobject]@{ pid = $id; name = $name; title = $parts[1]; root = $owner[$id] }
}
ConvertTo-Json -InputObject @($out) -Compress
