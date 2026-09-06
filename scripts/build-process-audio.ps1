$ErrorActionPreference = 'Stop'

$vswhere = 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) {
  throw 'Visual Studio Build Tools não foi encontrado. Instale o componente Desktop development with C++.'
}

$installPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $installPath) {
  throw 'O compilador C++ do Visual Studio não foi encontrado.'
}

$msbuild = Join-Path $installPath 'MSBuild\Current\Bin\MSBuild.exe'
$project = Join-Path $PSScriptRoot '..\native\process-audio-capture\process-audio-capture.vcxproj'
& $msbuild $project '/t:Build' '/p:Configuration=Release;Platform=x64' '/m'
if ($LASTEXITCODE -ne 0) {
  throw "A compilação do capturador nativo falhou (código $LASTEXITCODE)."
}
