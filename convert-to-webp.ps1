<#
  convert-to-webp.ps1
  --------------------
  Converts the remaining non-WebP images on the IGO Groups site to real .webp
  files, SIDE BY SIDE with the originals (nothing is deleted or renamed, so
  the live site keeps working exactly as-is until the HTML is updated).

  Covers:
   1. assets\images\*.png / *.jpg   (department team photos + brand logos,
      including assets\images\brands\*)
   2. assets\img\office\*.png / *.jpg / *.jpeg  (office/gallery/testimonial
      banner photos)
   3. assets\img\leadership\*.jpg / *.jpeg  (already small from the earlier
      optimize-images.ps1 pass, but converting to .webp squeezes out a bit
      more and gives you real .webp files if you want fully consistent
      formats)

  Requires ImageMagick (free). If you don't have it:
    1. Download & install from https://imagemagick.org/script/download.php#windows
       (grab the "ImageMagick-x.x.x-Q16-HDRI-x64-dll.exe" installer, default
       options are fine — just make sure "Install legacy utilities" and
       "Add application directory to your system path" stay checked).
    2. Close and reopen PowerShell so it picks up the new PATH.

  HOW TO RUN (Windows):
    1. Open PowerShell in this folder (Shift+Right-click > "Open PowerShell
       window here", or `cd "D:\Igo-websites\IGO Groups"`).
    2. Run:  powershell -ExecutionPolicy Bypass -File .\convert-to-webp.ps1
    3. Check webp-conversion-log.txt afterwards for the full report.
    4. Tell Claude when it's done — the HTML files still reference the old
       .png/.jpg filenames, so the new .webp files won't be used until those
       references are switched over. Claude will do that swap for you once
       you confirm the conversion finished.

  Nothing is deleted, renamed, or overwritten — this only ADDS new .webp
  files next to the originals.
#>

$root = $PSScriptRoot
$logPath = Join-Path $root "webp-conversion-log.txt"
$log = New-Object System.Collections.Generic.List[string]

$magick = Get-Command magick -ErrorAction SilentlyContinue
if (-not $magick) {
    Write-Host ""
    Write-Host "ImageMagick ('magick' command) was not found on your PATH." -ForegroundColor Yellow
    Write-Host "Install it first from: https://imagemagick.org/script/download.php#windows"
    Write-Host "Then close and reopen PowerShell and run this script again."
    Write-Host ""
    exit 1
}

$targets = @(
    (Join-Path $root "assets\images"),
    (Join-Path $root "assets\img\office"),
    (Join-Path $root "assets\img\leadership")
)

$totalBefore = 0
$totalAfter = 0
$count = 0
$skipped = 0

foreach ($folder in $targets) {
    if (-not (Test-Path $folder)) { continue }
    Get-ChildItem -Path $folder -Include *.jpg,*.jpeg,*.JPG,*.JPEG,*.png,*.PNG -Recurse -File |
        ForEach-Object {
            $src = $_.FullName
            $webpPath = [System.IO.Path]::ChangeExtension($src, ".webp")

            if (Test-Path $webpPath) {
                $skipped++
                return
            }

            $origSize = (Get-Item $src).Length
            & magick $src -quality 82 $webpPath 2>$null

            if (Test-Path $webpPath) {
                $newSize = (Get-Item $webpPath).Length
                $totalBefore += $origSize
                $totalAfter += $newSize
                $count++
                $log.Add(("{0} -> {1} : {2}KB -> {3}KB" -f $src, $webpPath, `
                    [math]::Round($origSize/1KB), [math]::Round($newSize/1KB)))
            } else {
                $log.Add("FAILED: $src")
            }
        }
}

$summary = "Converted {0} files ({1} already had a .webp, skipped). Before: {2} MB  After: {3} MB  Saved: {4} MB" -f `
    $count, $skipped, [math]::Round($totalBefore/1MB,2), [math]::Round($totalAfter/1MB,2), `
    [math]::Round(($totalBefore-$totalAfter)/1MB,2)

$log.Add(""); $log.Add($summary)
$log | Out-File -FilePath $logPath -Encoding utf8

Write-Host ""
Write-Host $summary
Write-Host "Full per-file log written to: $logPath"
Write-Host ""
Write-Host "Next step: tell Claude this finished, and it will switch the HTML" -ForegroundColor Cyan
Write-Host "files over to the new .webp images." -ForegroundColor Cyan
