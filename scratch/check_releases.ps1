[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/pyrevitlabs/pyRevit/releases/latest"
foreach ($asset in $releases.assets) {
    if ($asset.name -like "*signed.exe" -or $asset.name -like "*.exe") {
        [PSCustomObject]@{
            Name = $asset.name
            SizeMB = [Math]::Round($asset.size / 1MB, 2)
            Url = $asset.browser_download_url
        }
    }
}
