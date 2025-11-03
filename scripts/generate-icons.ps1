param(
  [string]$Source = "app/icons/app-icon-256.png"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Source)) {
  Write-Error "Source image not found: $Source. Place a 256x256 PNG there or pass -Source <path>."
}

Add-Type -AssemblyName System.Drawing

function Save-Resized([System.Drawing.Image]$img, [int]$size, [string]$destPath) {
  $null = New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($destPath))
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gfx.DrawImage($img, 0, 0, $size, $size)
  $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $gfx.Dispose()
  $bmp.Dispose()
  Write-Host "Wrote $destPath"
}

$img = [System.Drawing.Image]::FromFile((Resolve-Path $Source))

try {
  Save-Resized -img $img -size 180 -destPath "public/icons/apple-touch-icon.png"
  Save-Resized -img $img -size 192 -destPath "public/icons/icon-192.png"
  Save-Resized -img $img -size 512 -destPath "public/icons/icon-512.png"
}
finally {
  $img.Dispose()
}

