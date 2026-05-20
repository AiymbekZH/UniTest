Get-ChildItem -Directory | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $name = $_.Name
    $sizeMB = [math]::Round($size/1MB,1)
    $files = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue).Count
    Write-Output "$name : $sizeMB MB ($files files)"
}
