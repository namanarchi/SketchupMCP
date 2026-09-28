Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\MAI KHANH\.gemini\antigravity-ide\brain\0225c4eb-2395-424b-85f4-6898a627de73\.user_uploaded\media_1790612044381.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

$w = $bmp.Width
$h = $bmp.Height

$cropRect = New-Object System.Drawing.Rectangle(0, [int]($h * 0.4), $w, [int]($h * 0.6))
$cropped = $bmp.Clone($cropRect, $bmp.PixelFormat)
$outPath = "c:\Users\MAI KHANH\source\repos\namanarchi\SketchupMCP\textures\cad_jbolt_crop.png"
$cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$cropped.Dispose()
$bmp.Dispose()
Write-Host "Cropped jbolt detail to cad_jbolt_crop.png"
