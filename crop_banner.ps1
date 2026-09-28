Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\MAI KHANH\.gemini\antigravity-ide\brain\0225c4eb-2395-424b-85f4-6898a627de73\.user_uploaded\media_1790609993526.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# Inset by 1 pixel inside the boundary so no edge fringe or drop shadow leaks
$minX = 60
$minY = 225
$bw = 951
$bh = 160

$rect = New-Object System.Drawing.Rectangle($minX, $minY, $bw, $bh)
$cropped = $bmp.Clone($rect, $bmp.PixelFormat)

$outPath = "c:\Users\MAI KHANH\source\repos\namanarchi\SketchupMCP\textures\pano_dinh_du_an_cu_lao_phuoc_hung.png"
$cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved refined banner ($bw x $bh) to: $outPath"

$cropped.Dispose()
$bmp.Dispose()
