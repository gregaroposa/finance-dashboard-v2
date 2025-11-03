param(
  [string]$Source = "app/icons/app-icon-256.png",
  # Background for iOS icon: hex like "#2E3F54" or "auto" to detect
  [string]$Background = "auto",
  # Padding ratio (0..0.4). 0.08 = 8% padding around glyph
  [double]$Padding = 0.08
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

function Save-ResizedWithBackground(
  [System.Drawing.Image]$img,
  [int]$size,
  [string]$destPath,
  [System.Drawing.Color]$bgColor,
  [double]$paddingRatio
) {
  $null = New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($destPath))
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  # Fill solid background so iOS doesn't show transparency
  $brush = New-Object System.Drawing.SolidBrush($bgColor)
  $gfx.FillRectangle($brush, 0, 0, $size, $size)
  $brush.Dispose()

  # Draw the source image with padding
  $pad = [Math]::Max(0.0, [Math]::Min(0.4, $paddingRatio))
  $drawSize = [int]([Math]::Round($size * (1.0 - (2.0 * $pad))))
  $offset = [int]([Math]::Round($size * $pad))
  $destRect = New-Object System.Drawing.Rectangle($offset, $offset, $drawSize, $drawSize)
  $gfx.DrawImage($img, $destRect)

  $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $gfx.Dispose()
  $bmp.Dispose()
  Write-Host "Wrote $destPath"
}

function Get-DominantColor([System.Drawing.Bitmap]$bmp, [int]$sampleStep = 2) {
  $counts = @{}
  for ($y = 0; $y -lt $bmp.Height; $y += $sampleStep) {
    for ($x = 0; $x -lt $bmp.Width; $x += $sampleStep) {
      $c = $bmp.GetPixel($x, $y)
      if ($c.A -gt 0) {
        $key = ('{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B)
        if ($counts.ContainsKey($key)) { $counts[$key]++ } else { $counts[$key] = 1 }
      }
    }
  }
  if ($counts.Count -eq 0) { return [System.Drawing.Color]::White }
  $top = $counts.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 1
  $r = [Convert]::ToInt32($top.Key.Substring(0,2),16)
  $g = [Convert]::ToInt32($top.Key.Substring(2,2),16)
  $b = [Convert]::ToInt32($top.Key.Substring(4,2),16)
  return [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
}

$img = [System.Drawing.Image]::FromFile((Resolve-Path $Source))

try {
  # Determine background color
  if ($Background -eq 'auto') {
    $bg = Get-DominantColor -bmp $img
  } else {
    $bg = [System.Drawing.ColorTranslator]::FromHtml($Background)
  }

  # iOS icon with solid background and slight padding
  Save-ResizedWithBackground -img $img -size 180 -destPath "public/icons/apple-touch-icon.png" -bgColor $bg -paddingRatio $Padding

  # Android / PWA sizes
  Save-Resized -img $img -size 192 -destPath "public/icons/icon-192.png"
  Save-Resized -img $img -size 512 -destPath "public/icons/icon-512.png"
}
finally {
  $img.Dispose()
}

