$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

npm run build:win
Write-Host "Windows installer build complete. Check dist\\ for the .exe installer."
