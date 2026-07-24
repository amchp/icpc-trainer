$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Add-UserPathEntry {
    param([Parameter(Mandatory = $true)][string]$Entry)

    $current = [Environment]::GetEnvironmentVariable("Path", "User")
    $entries = @($current -split ";" | Where-Object { $_ })
    if ($entries -notcontains $Entry) {
        [Environment]::SetEnvironmentVariable("Path", (($entries + $Entry) -join ";"), "User")
    }
    if (($env:Path -split ";") -notcontains $Entry) {
        $env:Path = "$Entry;$env:Path"
    }
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "WinGet is required. Install 'App Installer' from Microsoft Store, then run this script again."
}

Write-Host "Installing Visual Studio Code and MSYS2..."
winget install --exact --id Microsoft.VisualStudioCode --accept-package-agreements --accept-source-agreements --silent
if ($LASTEXITCODE -ne 0) { throw "VS Code installation failed with exit code $LASTEXITCODE. Check WinGet, then run this script again." }
winget install --exact --id MSYS2.MSYS2 --accept-package-agreements --accept-source-agreements --silent
if ($LASTEXITCODE -ne 0) { throw "MSYS2 installation failed with exit code $LASTEXITCODE. Check WinGet, then run this script again." }

$msysBash = "C:\msys64\usr\bin\bash.exe"
if (-not (Test-Path $msysBash)) {
    throw "MSYS2 was not found at C:\msys64. Check the WinGet output, then run this script again."
}

Write-Host "Installing the MSYS2 UCRT64 C++ toolchain..."
& $msysBash -lc "pacman -Syu --noconfirm"
if ($LASTEXITCODE -ne 0) { throw "The first MSYS2 system update failed with exit code $LASTEXITCODE. Fix pacman, then run this script again." }
& $msysBash -lc "pacman -Syu --noconfirm"
if ($LASTEXITCODE -ne 0) { throw "The second MSYS2 system update failed with exit code $LASTEXITCODE. Fix pacman, then run this script again." }
& $msysBash -lc "pacman -S --needed --noconfirm mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-gdb"
if ($LASTEXITCODE -ne 0) { throw "The UCRT64 compiler installation failed with exit code $LASTEXITCODE. Fix pacman, then run this script again." }

$compilerDirectory = "C:\msys64\ucrt64\bin"
$vscodeDirectory = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin"
Add-UserPathEntry -Entry $compilerDirectory
if (Test-Path $vscodeDirectory) { Add-UserPathEntry -Entry $vscodeDirectory }

$codeCommand = Get-Command code.cmd -ErrorAction SilentlyContinue
$codePath = if ($codeCommand) { $codeCommand.Source } else { "$vscodeDirectory\code.cmd" }
if (-not (Test-Path $codePath)) {
    $codePath = $null
}
if (-not $codePath) {
    throw "VS Code installed, but code.cmd was not found. Open a new PowerShell window and run this script again."
}

Write-Host "Installing the Microsoft C/C++ extension..."
& $codePath --install-extension ms-vscode.cpptools --force
if ($LASTEXITCODE -ne 0) { throw "The Microsoft C/C++ extension installation failed with exit code $LASTEXITCODE. Open VS Code, check its connection, then run this script again." }

$settingsDirectory = Join-Path $env:APPDATA "Code\User"
$settingsPath = Join-Path $settingsDirectory "settings.json"
New-Item -ItemType Directory -Force -Path $settingsDirectory | Out-Null

$settings = [PSCustomObject]@{}
if (Test-Path $settingsPath) {
    try {
        $rawSettings = Get-Content -Raw $settingsPath
        if ($rawSettings.Trim()) { $settings = $rawSettings | ConvertFrom-Json }
    } catch {
        throw "VS Code settings.json is invalid. Repair $settingsPath, then run this script again."
    }
}

$settings | Add-Member -NotePropertyName "C_Cpp.default.compilerPath" -NotePropertyValue "$compilerDirectory\g++.exe" -Force
$settings | Add-Member -NotePropertyName "C_Cpp.default.cStandard" -NotePropertyValue "c17" -Force
$settings | Add-Member -NotePropertyName "C_Cpp.default.intelliSenseMode" -NotePropertyValue "windows-gcc-x64" -Force
$settings | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $settingsPath

$compiler = "$compilerDirectory\g++.exe"
if (-not (Test-Path $compiler)) { throw "g++.exe was not installed at $compiler." }

& $compiler --version
if ($LASTEXITCODE -ne 0) { throw "g++ verification failed with exit code $LASTEXITCODE. Open a new terminal, check PATH, then run this script again." }
Write-Host "C++ setup complete. Compiler: $compiler"
Write-Host "Open a new terminal before compiling so every app sees the updated user PATH."
