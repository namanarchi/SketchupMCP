[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$url = "https://github.com/pyrevitlabs/pyRevit/releases/download/v6.5.5.26237%2B2040/pyRevit_6.5.5.26237_signed.exe"
$dest = "c:\Users\MAI KHANH\source\repos\namanarchi\SketchupMCP\scratch\pyRevit_setup.exe"

Write-Host "Dang tai pyRevit tu: $url"
Write-Host "Luu tai: $dest"

$wc = New-Object System.Net.WebClient
$wc.DownloadFile($url, $dest)

if (Test-Path $dest) {
    $size = (Get-Item $dest).Length / 1MB
    Write-Host ("Tai thanh cong! Dung luong: {0:N2} MB" -f $size)
} else {
    Write-Host "Tai that bai!"
}
