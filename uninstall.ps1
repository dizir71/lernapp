# uninstall.ps1 – Autostart und Dateien entfernen
$APPNAME = "BWL-Lernapp"
$TARGET = Join-Path $env:USERPROFILE $APPNAME
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop "$APPNAME.lnk"

# Task löschen
$taskName = "$APPNAME-Server"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Firewallregel löschen
netsh advfirewall firewall delete rule name="$APPNAME-8000" | Out-Null

# Verknüpfung löschen
if (Test-Path $lnk) { Remove-Item $lnk -Force }

# Dateien löschen
if (Test-Path $TARGET) { Remove-Item $TARGET -Recurse -Force }

Write-Host "Entfernt." -ForegroundColor Green
