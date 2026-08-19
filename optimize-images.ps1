<#
  optimize-images.ps1
  --------------------
  Resizes/recompresses the oversized images on the IGO Groups site IN PLACE
  (same filename/path, so no HTML changes are needed and no links break).

  What it does:
   1. assets\img\leadership\*  (raw 6000x4000 phone photos used as tiny
      56-108px circular avatars on leadership.html / org-chart.html)
      -> always downscaled so the longest edge is max 400px, JPEG quality 82.
   2. assets\images\*.png / *.jpg  (department team photos, also reused as
      full-width page-hero background images)
      -> only touched if longest edge > 1920px or file > 300KB; capped to
      1920px longest edge, quality 82. PNGs stay PNG, JPEGs stay JPEG.
   3. assets\img\office\*.jpg / *.png  (office/content photos, hero banners,
      posters) -> same rule as #2: cap to 1920px longest edge, quality 82.

  Already-.webp files are left untouched (earlier passes already optimized
  those). EXIF orientation is read and baked into the pixels before resizing,
  so phone photos taken in portrait mode won't come out sideways.

  HOW TO RUN (Windows):
    1. Open PowerShell in this folder (Shift+Right-click > "Open PowerShell
       window here", or `cd "D:\Igo-websites\IGO Groups"`).
    2. Run:  powershell -ExecutionPolicy Bypass -File .\optimize-images.ps1
    3. Check image-optimization-log.txt afterwards for a before/after report.

  Nothing is renamed and no HTML file is touched by this script — it only
  overwrites the binary image files at their existing paths.
#>

Add-Type -AssemblyName System.Drawing

$root    = $PSScriptRoot
$logPath = Join-Path $root "image-optimization-log.txt"
$log     = New-Object System.Collections.Generic.List[string]

function Get-JpegCodec {
    $codecs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()
    return $codecs | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
}
$jpegCodec = Get-JpegCodec

function Get-ExifOrientation($img) {
    if ($img.PropertyIdList -contains 0x0112) {
        $prop = $img.GetPropertyItem(0x0112)
        return [BitConverter]::ToUInt16($prop.Value, 0)
    }
    return 1
}

function Apply-Orientation($img, [int]$orientation) {
    switch ($orientation) {
        2 { $img.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
        3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
        4 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
        5 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
        6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
        7 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
        8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
        default { }
    }
}

function Resize-ImageFile {
    param(
        [string]$Path,
        [int]$MaxDim,
        [int]$Quality,
        [switch]$Force,
        [int]$MinSizeBytes = 307200   # 300KB
    )
    try {
        $bytes = [System.IO.File]::ReadAllBytes($Path)
        $origSize = $bytes.Length
        $ms  = New-Object System.IO.MemoryStream(,$bytes)
        $img = [System.Drawing.Image]::FromStream($ms)

        $orientation = Get-ExifOrientation $img
        if ($orientation -ne 1) { Apply-Orientation $img $orientation }

        $origW = $img.Width
        $origH = $img.Height

        if (-not $Force -and $origW -le $MaxDim -and $origH -le $MaxDim -and $origSize -lt $MinSizeBytes) {
            $img.Dispose(); $ms.Dispose()
            return $null
        }

        $scale = [Math]::Min(1.0, $MaxDim / [Math]::Max($origW, $origH))
        $newW  = [Math]::Max(1, [int]($origW * $scale))
        $newH  = [Math]::Max(1, [int]($origH * $scale))

        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $bmp.SetResolution($img.HorizontalResolution, $img.VerticalResolution)
        $gfx = [System.Drawing.Graphics]::FromImage($bmp)
        $gfx.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gfx.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $gfx.DrawImage($img, 0, 0, $newW, $newH)
        $gfx.Dispose()

        $ext = [System.IO.Path]::GetExtension($Path).ToLower()
        $img.Dispose(); $ms.Dispose()

        $tmpPath = "$Path.tmp"
        if ($ext -eq ".png") {
            $bmp.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)
        } else {
            $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
            $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
                [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
            $bmp.Save($tmpPath, $jpegCodec, $encParams)
        }
        $bmp.Dispose()

        $newSize = (Get-Item $tmpPath).Length
        if ($newSize -gt 0 -and $newSize -lt $origSize) {
            Move-Item -Force $tmpPath $Path
        } else {
            # Safety net: if for some reason the new file isn't smaller, keep the original.
            Remove-Item $tmpPath -ErrorAction SilentlyContinue
            $newSize = $origSize
        }

        return [PSCustomObject]@{
            Path = $Path; OrigW = $origW; OrigH = $origH
            NewW = $newW; NewH = $newH
            OrigSize = $origSize; NewSize = $newSize
        }
    } catch {
        Write-Warning "FAILED: $Path -> $_"
        return $null
    }
}

$totalBefore = 0; $totalAfter = 0; $count = 0

function Process-Folder($folder, $maxDim, $quality, $force) {
    if (-not (Test-Path $folder)) { return }
    Get-ChildItem -Path $folder -Include *.jpg,*.jpeg,*.JPG,*.JPEG,*.png,*.PNG -Recurse -File |
        ForEach-Object {
            $r = Resize-ImageFile -Path $_.FullName -MaxDim $maxDim -Quality $quality -Force:$force
            if ($r) {
                $script:totalBefore += $r.OrigSize
                $script:totalAfter  += $r.NewSize
                $script:count++
                $script:log.Add(("{0}: {1}x{2} {3}KB -> {4}x{5} {6}KB" -f `
                    $r.Path, $r.OrigW, $r.OrigH, [math]::Round($r.OrigSize/1KB), `
                    $r.NewW, $r.NewH, [math]::Round($r.NewSize/1KB)))
            }
        }
}

Write-Host "Processing leadership avatars (forced cap to 400px)..."
Process-Folder (Join-Path $root "assets\img\leadership") 400 82 $true

Write-Host "Processing assets\images team photos (cap 1920px if oversized)..."
Process-Folder (Join-Path $root "assets\images") 1920 82 $false

Write-Host "Processing assets\img\office photos (cap 1920px if oversized)..."
Process-Folder (Join-Path $root "assets\img\office") 1920 82 $false

$summary = "Processed {0} files. Before: {1} MB  After: {2} MB  Saved: {3} MB" -f `
    $count, [math]::Round($totalBefore/1MB,2), [math]::Round($totalAfter/1MB,2), `
    [math]::Round(($totalBefore-$totalAfter)/1MB,2)

$log.Add(""); $log.Add($summary)
$log | Out-File -FilePath $logPath -Encoding utf8

Write-Host ""
Write-Host $summary
Write-Host "Full per-file log written to: $logPath"
