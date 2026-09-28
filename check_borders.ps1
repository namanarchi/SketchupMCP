Add-Type -AssemblyName System.Drawing

$texPath = "c:\Users\MAI KHANH\source\repos\namanarchi\SketchupMCP\textures\pano_dinh_du_an_cu_lao_phuoc_hung.png"
$bmp = [System.Drawing.Bitmap]::FromFile($texPath)

$w = $bmp.Width
$h = $bmp.Height
Write-Host "Checking texture: $w x $h"

# Sample the navy background color from safe spots (e.g. x=20, y=20)
$safeColor = $bmp.GetPixel(20, 20)
Write-Host "Sampled Navy Color: R=$($safeColor.R), G=$($safeColor.G), B=$($safeColor.B)"

# Check edges for any gray/shadow pixels (gray pixels have R ~ G ~ B > 80, or R > 60)
$badTop = 0; $badBottom = 0; $badLeft = 0; $badRight = 0

for ($x = 0; $x -lt $w; $x++) {
    $cTop = $bmp.GetPixel($x, 0)
    if ($cTop.R -gt 50 -or $cTop.G -gt 75 -or $cTop.B -lt 50) { $badTop++ }
    $cBot = $bmp.GetPixel($x, $h - 1)
    if ($cBot.R -gt 50 -or $cBot.G -gt 75 -or $cBot.B -lt 50) { $badBottom++ }
}

for ($y = 0; $y -lt $h; $y++) {
    $cLeft = $bmp.GetPixel(0, $y)
    if ($cLeft.R -gt 50 -or $cLeft.G -gt 75 -or $cLeft.B -lt 50) { $badLeft++ }
    $cRight = $bmp.GetPixel($w - 1, $y)
    if ($cRight.R -gt 50 -or $cRight.G -gt 75 -or $cRight.B -lt 50) { $badRight++ }
}

Write-Host "Non-navy pixels on edges: Top=$badTop, Bottom=$badBottom, Left=$badLeft, Right=$badRight"

$bmp.Dispose()
