$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$revitDir = "C:\Program Files\Autodesk\Revit 2020"
$sourceDir = $PSScriptRoot
$outFile = "$sourceDir\RevitMCPBridge.dll"

$sources = Get-ChildItem -Path "$sourceDir\src" -Filter "*.cs" | ForEach-Object { $_.FullName }

$argsList = @(
    "/target:library",
    "/out:$outFile",
    "/optimize+",
    "/warn:0",
    "/r:`"$revitDir\RevitAPI.dll`"",
    "/r:`"$revitDir\RevitAPIUI.dll`"",
    "/r:System.dll",
    "/r:System.Core.dll",
    "/r:System.Web.Extensions.dll"
) + $sources

Write-Host "Compiling RevitMCPBridge.dll..."
& $csc $argsList

if ($LASTEXITCODE -eq 0 -and (Test-Path $outFile)) {
    Write-Host "BUILD SUCCESS: $outFile ($((Get-Item $outFile).Length) bytes)" -ForegroundColor Green
    
    # Copy to Revit 2020 Addins directory
    $addinDir = "C:\ProgramData\Autodesk\Revit\Addins\2020"
    $targetDir = "$addinDir\RevitMCPBridge"
    if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
    
    Copy-Item $outFile "$targetDir\RevitMCPBridge.dll" -Force
    Copy-Item "$sourceDir\RevitMCPBridge.addin" "$addinDir\RevitMCPBridge.addin" -Force
    Write-Host "DEPLOYED TO: $addinDir\RevitMCPBridge.addin" -ForegroundColor Cyan
} else {
    Write-Host "BUILD FAILED!" -ForegroundColor Red
}
