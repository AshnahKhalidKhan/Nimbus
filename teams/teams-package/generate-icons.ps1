$ErrorActionPreference = 'Stop'
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
Add-Type -AssemblyName System.Drawing

# 32x32 outline: white border on transparent
$bmp32 = New-Object System.Drawing.Bitmap(32, 32)
$g = [System.Drawing.Graphics]::FromImage($bmp32)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2)
$g.DrawRectangle($pen, 3, 3, 25, 25)
$g.Dispose()
$pen.Dispose()
$p32 = Join-Path $base 'icon-outline.png'
$bmp32.Save($p32, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp32.Dispose()

# 192x192 color: accent purple #5B21B6
$bmp192 = New-Object System.Drawing.Bitmap(192, 192)
$g2 = [System.Drawing.Graphics]::FromImage($bmp192)
$g2.Clear([System.Drawing.Color]::FromArgb(255, 91, 33, 182))
$g2.Dispose()
$p192 = Join-Path $base 'icon-color.png'
$bmp192.Save($p192, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp192.Dispose()

Write-Host "Created: $p32"
Write-Host "Created: $p192"
