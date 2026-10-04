param([Parameter(Mandatory=$true)][string]$NodePath,[Parameter(Mandatory=$true)][string]$WranglerPath)
$ErrorActionPreference='Stop'
$previewRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $previewRoot
$previewConfig=Get-Content -LiteralPath 'wrangler.toml' -Raw
if($previewConfig -notmatch 'name = "ufl-major-update-preview"' -or $previewConfig -match '2e4969ed|9882207f|unc-ufl-match-bridge|unc-ufl-player-photos'){throw 'Unsafe preview bindings.'}
if((Get-Content '.assetsignore' -Raw) -notmatch 'assets/league/player-\*'){throw 'Player asset protection missing.'}
& $NodePath $WranglerPath pages deploy . --project-name ufl-major-update-preview --branch codex/ufl-major-update-preview
if($LASTEXITCODE -ne 0){throw 'Preview deployment failed.'}
