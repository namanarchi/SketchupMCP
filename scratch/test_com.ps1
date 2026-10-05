try {
    $e = New-Object -ComObject Excel.Application
    Write-Host "Excel Version: $($e.Version)"
    $e.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($e) | Out-Null
} catch {
    Write-Host "Excel COM error: $_"
}

try {
    $w = New-Object -ComObject Word.Application
    Write-Host "Word Version: $($w.Version)"
    $w.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null
} catch {
    Write-Host "Word COM error: $_"
}
