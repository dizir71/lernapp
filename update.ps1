# update.ps1 – GitHub Pages Push mit PAT im Windows Credential Manager
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoUrl  = "https://github.com/dizir71/lernapp.git"
$User     = "dizir71"
$ErrorActionPreference = "Stop"
Set-Location $RepoRoot

# 0) Git prüfen
git --version | Out-Null

# 1) Repo init
if (-not (Test-Path ".git")) {
  git init
  git branch -M main
  git remote add origin $RepoUrl
}

# 2) Git Credential Manager aktivieren (standard bei Git für Windows)
git config --global credential.helper manager-core

# 3) Prüfen ob schon Credentials für github.com existieren
$needCred = $true
try {
  git ls-remote $RepoUrl > $null 2>&1
  $needCred = $false
} catch { $needCred = $true }

# 4) Falls nötig: PAT einmalig abfragen und sicher speichern
if ($needCred) {
  Write-Host "Bitte GitHub Personal Access Token (Scope: repo) eingeben. Es wird sicher im Windows Credential Manager gespeichert." -ForegroundColor Yellow
  $sec = Read-Host "Token" -AsSecureString
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringUni([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  # an Helper übergeben und speichern
  $creds = @"
protocol=https
host=github.com
username=$User
password=$plain

"@
  $creds | git credential approve
  # Test
  git ls-remote $RepoUrl > $null
  Write-Host "Token gespeichert." -ForegroundColor Green
}

# 5) .nojekyll anlegen
if (-not (Test-Path ".nojekyll")) { New-Item -ItemType File -Name ".nojekyll" | Out-Null }

# 6) Commit & Push
git add -A
if (-not (git diff --cached --name-only)) {
  Write-Host "Keine Änderungen." -ForegroundColor Cyan
} else {
  git commit -m ("Update " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
}
git push -u origin main
Write-Host "Fertig: https://dizir71.github.io/lernapp/" -ForegroundColor Green
