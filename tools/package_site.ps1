<#
.SYNOPSIS
    Package the XenoHammer site + playable game into a single deployable folder.

.DESCRIPTION
    Source layout:
      site/                  (landing page source: index.html, archives/)
      game/web/              (TypeScript game source)
      game/web/assets/       (game assets: graphics, sounds, fonts)

    Output structure:
      dist/
      ├── index.html               (landing page)
      ├── archives/                (archived Tripod/external content)
      └── play/                    (the game - fully self-contained)
          ├── index.html
          ├── favicon.ico
          └── assets/              (game assets: graphics, sounds, fonts, JS)

.PARAMETER SkipBuild
    Reuse existing game/web/dist instead of running vite build.

.EXAMPLE
    .\tools\package_site.ps1
    .\tools\package_site.ps1 -SkipBuild
#>
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$Root     = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DistDir  = Join-Path $Root 'dist'
$WebDir   = Join-Path $Root 'game\web'
$SiteDir  = Join-Path $Root 'site'

# --- Clean ---
function Clean {
    if (Test-Path $DistDir) {
        Remove-Item $DistDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $DistDir | Out-Null
    Write-Host "Cleaned $DistDir"
}

# --- Build game ---
function Build-Game {
    if ($SkipBuild) {
        Write-Host 'Skipping game build (-SkipBuild)'
        return
    }
    Write-Host 'Building game...'
    Push-Location $WebDir
    try {
        $output = & npx vite build 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Build failed!`n$output"
        }
        Write-Host 'Game built successfully'
    } finally {
        Pop-Location
    }
}

# --- Copy game dist -> dist/play ---
function Copy-Game {
    $src = Join-Path $WebDir 'dist'
    $dst = Join-Path $DistDir 'play'
    Copy-Item -Path $src -Destination $dst -Recurse
    Write-Host "Copied game to $dst"
}

# --- Copy site source with path rewriting ---
function Copy-Site {
    # Copy archives
    $srcArchives = Join-Path $SiteDir 'archives'
    $dstArchives = Join-Path $DistDir 'archives'
    Copy-Item -Path $srcArchives -Destination $dstArchives -Recurse
    Write-Host 'Copied archives'

    # Copy hero video if it exists
    $heroVideo = Join-Path $SiteDir 'hero-gameplay.webm'
    if (Test-Path $heroVideo) {
        Copy-Item $heroVideo -Destination (Join-Path $DistDir 'hero-gameplay.webm')
        Write-Host 'Copied hero video'
    }

    # Copy downloads folder if it exists
    $srcDownloads = Join-Path $SiteDir 'downloads'
    $dstDownloads = Join-Path $DistDir 'downloads'
    if (Test-Path $srcDownloads) {
        Copy-Item -Path $srcDownloads -Destination $dstDownloads -Recurse
        Write-Host 'Copied downloads'
    }

    # Copy images folder if it exists
    $srcImages = Join-Path $SiteDir 'images'
    $dstImages = Join-Path $DistDir 'images'
    if (Test-Path $srcImages) {
        Copy-Item -Path $srcImages -Destination $dstImages -Recurse
        Write-Host 'Copied images'
    }

    # Read, rewrite, and write site/index.html
    $html = Get-Content -Path (Join-Path $SiteDir 'index.html') -Raw -Encoding UTF8
    $html = $html.Replace('../game/web/dist/index.html', 'play/index.html')
    $html = $html.Replace('../game/web/assets/fonts/mine.ttf', 'play/assets/fonts/mine.ttf')
    [System.IO.File]::WriteAllText((Join-Path $DistDir 'index.html'), $html, [System.Text.UTF8Encoding]::new($false))
    Write-Host 'Copied and rewritten site index.html'
}

# --- Report ---
function Show-Report {
    $files = Get-ChildItem -Path $DistDir -Recurse -File
    $totalFiles = $files.Count
    $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($totalSize / 1MB, 1)

    Write-Host ''
    Write-Host '=== PACKAGED SITE ==='
    Write-Host "Output: $DistDir"
    Write-Host "Files:  $totalFiles"
    Write-Host "Size:   $sizeMB MB"
    Write-Host ''
    Write-Host 'Ready to upload! The dist/ folder is fully self-contained.'
}

# --- Main ---
Clean
Build-Game
Copy-Game
Copy-Site
Show-Report
