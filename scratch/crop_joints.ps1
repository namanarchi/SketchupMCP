Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("scratch/MAT CAT NHA GIA CONG, KHU THANH PHAM.png")
Write-Host "Size: $($img.Width) x $($img.Height)"

# Vùng đỉnh cột trục C (khoảng X: 50 đến 250, Y: 100 đến 300)
$cropRect = New-Object System.Drawing.Rectangle(70, 100, 220, 200)
$bmp = New-Object System.Drawing.Bitmap($cropRect.Width, $cropRect.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,$cropRect.Width,$cropRect.Height)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save("scratch/crop_dinh_cot.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Vùng đỉnh cột giữa nóc trục B
$cropRectB = New-Object System.Drawing.Rectangle(430, 80, 220, 200)
$bmpB = New-Object System.Drawing.Bitmap($cropRectB.Width, $cropRectB.Height)
$gB = [System.Drawing.Graphics]::FromImage($bmpB)
$gB.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,$cropRectB.Width,$cropRectB.Height)), $cropRectB, [System.Drawing.GraphicsUnit]::Pixel)
$bmpB.Save("scratch/crop_noc.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$gB.Dispose()
$bmpB.Dispose()
$img.Dispose()
Write-Host "Done cropping"
