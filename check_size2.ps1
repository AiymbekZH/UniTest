$folders = @(
    "client\node_modules",
    "client\dist",
    "client\src",
    "client\public",
    "server\node_modules",
    "server\uploads",
    ".git"
)

foreach ($f in $folders) {
    if (Test-Path $f) {
        $size = (Get-ChildItem $f -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        $sizeMB = [math]::Round($size/1MB,1)
        $count = (Get-ChildItem $f -Recurse -File -ErrorAction SilentlyContinue).Count
        Write-Output "$f : $sizeMB MB ($count files)"
    } else {
        Write-Output "$f : NOT FOUND"
    }
}
