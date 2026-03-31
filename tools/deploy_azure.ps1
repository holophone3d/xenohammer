<#
.SYNOPSIS
    Deploy dist/ to Azure (Storage static website, Static Web App, or both).
.DESCRIPTION
    Targets:
      storage  - Clear & upload to $web container on a Storage Account
      swa      - Deploy to Azure Static Web App
      both     - Deploy to both targets
.PARAMETER Target
    Deployment target: "storage", "swa", or "both" (default: both)
.EXAMPLE
    .\deploy_azure.ps1                  # Deploy to both
    .\deploy_azure.ps1 -Target swa      # Static Web App only
    .\deploy_azure.ps1 -Target storage  # Storage account only
#>
param(
    [ValidateSet("storage", "swa", "both")]
    [string]$Target = "both"
)

$ErrorActionPreference = "Stop"
$distPath = Join-Path $PSScriptRoot "..\dist"
$StorageAccount = "xenohammer"
$SwaName = "xenohammer"

if (-not (Test-Path $distPath)) {
    Write-Error "dist/ not found. Run '.\tools\package_site.ps1' first."
    exit 1
}

# Ensure logged in
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    if ($LASTEXITCODE -ne 0) { Write-Error "Azure login failed."; exit 1 }
}

$fileCount = (Get-ChildItem $distPath -Recurse -File).Count
$failed = @()

# --- Storage Account ---
if ($Target -eq "storage" -or $Target -eq "both") {
    Write-Host "`n=== Storage: '$StorageAccount' ===" -ForegroundColor Green

    Write-Host "Clearing `$web container..." -ForegroundColor Yellow
    az storage blob delete-batch `
        --account-name $StorageAccount `
        --source '$web' `
        --auth-mode key `
        --only-show-errors

    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED to clear `$web container." -ForegroundColor Red
        $failed += "storage"
    } else {
        Write-Host "Uploading $fileCount files to `$web..." -ForegroundColor Yellow
        az storage blob upload-batch `
            --account-name $StorageAccount `
            --destination '$web' `
            --source $distPath `
            --auth-mode key `
            --overwrite `
            --only-show-errors

        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAILED to upload to storage." -ForegroundColor Red
            $failed += "storage"
        } else {
            Write-Host "Storage deploy OK ($fileCount files)" -ForegroundColor Green
        }
    }
}

# --- Static Web App ---
if ($Target -eq "swa" -or $Target -eq "both") {
    Write-Host "`n=== Static Web App: '$SwaName' ===" -ForegroundColor Green

    # Get deployment token
    $token = az staticwebapp secrets list --name $SwaName --query "properties.apiKey" -o tsv 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED to get SWA deployment token." -ForegroundColor Red
        $failed += "swa"
    } else {
        Write-Host "Deploying $fileCount files..." -ForegroundColor Yellow
        # Use SWA CLI if available, otherwise fall back to az staticwebapp deploy
        $swaCmd = Get-Command swa -ErrorAction SilentlyContinue
        if (-not $swaCmd) {
            Write-Host "Installing SWA CLI..." -ForegroundColor Yellow
            $ErrorActionPreference = "Continue"
            npm install -g @azure/static-web-apps-cli 2>&1 | Out-Null
            $ErrorActionPreference = "Stop"
        }
        $ErrorActionPreference = "Continue"
        swa deploy $distPath --deployment-token $token --env production
        $swaExit = $LASTEXITCODE
        $ErrorActionPreference = "Stop"

        if ($swaExit -ne 0) {
            Write-Host "FAILED to deploy to SWA." -ForegroundColor Red
            $failed += "swa"
        } else {
            Write-Host "SWA deploy OK ($fileCount files)" -ForegroundColor Green
        }
    }
}

# --- Summary ---
Write-Host "`n=== DONE ===" -ForegroundColor Green
if ($failed.Count -gt 0) {
    Write-Host "Failed targets: $($failed -join ', ')" -ForegroundColor Red
    exit 1
} else {
    Write-Host "All targets deployed successfully ($fileCount files)" -ForegroundColor Green
}
