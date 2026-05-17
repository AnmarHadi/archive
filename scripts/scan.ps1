# scan.ps1 - WIA Scanner Script for Windows
# Usage:
#   .\scan.ps1 -Action list              -> List available scanners
#   .\scan.ps1 -Action scan              -> Direct scan (no dialog, silent)
#   .\scan.ps1 -Action scan -Resolution 300 -ScannerIndex 2 -ColorMode 2
#
# The "scan" action performs a SILENT scan without opening any external dialog.
# All scanning happens in the background and the image is saved to OutputPath.

param(
    [string]$Action = "scan",
    [string]$OutputPath = "",
    [int]$Resolution = 200,
    [int]$ScannerIndex = 1,
    [int]$ColorMode = 1          # 1=Color, 2=Grayscale, 4=Text(B&W)
)

$ErrorActionPreference = "Stop"

function Get-WiaScanners {
    $deviceManager = New-Object -ComObject WIA.DeviceManager
    $scanners = @()
    for ($i = 1; $i -le $deviceManager.DeviceInfos.Count; $i++) {
        $deviceInfo = $deviceManager.DeviceInfos.Item($i)
        if ($deviceInfo.Type -eq 1) {  # ScannerDevice
            try {
                $name = $deviceInfo.Properties.Item("Name").Value
            } catch {
                $name = "Scanner $i"
            }
            $scanners += @{ Index = $i; Name = $name }
        }
    }
    return $scanners
}

function Convert-BmpToJpg {
    param([string]$BmpPath, [string]$JpgPath)
    try {
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile($BmpPath)
        $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | 
            Where-Object { $_.MimeType -eq 'image/jpeg' }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, 92L
        )
        $img.Save($JpgPath, $jpgEncoder, $encoderParams)
        $img.Dispose()
        return $true
    } catch {
        return $false
    }
}

try {
    # ========== LIST SCANNERS ==========
    if ($Action -eq "list") {
        $scanners = Get-WiaScanners
        if ($scanners.Count -eq 0) {
            Write-Output "NO_SCANNERS"
        } else {
            foreach ($s in $scanners) {
                Write-Output "$($s.Index)|$($s.Name)"
            }
        }
        exit 0
    }

    # ========== SILENT SCAN (NO DIALOG) ==========
    if ($Action -eq "scan") {
        $deviceManager = New-Object -ComObject WIA.DeviceManager

        # Find scanner by index (only counting scanner-type devices)
        $scannerCount = 0
        $scanner = $null
        $scannerName = ""
        for ($i = 1; $i -le $deviceManager.DeviceInfos.Count; $i++) {
            $deviceInfo = $deviceManager.DeviceInfos.Item($i)
            if ($deviceInfo.Type -eq 1) {
                $scannerCount++
                if ($scannerCount -eq $ScannerIndex) {
                    $scanner = $deviceInfo
                    try {
                        $scannerName = $deviceInfo.Properties.Item("Name").Value
                    } catch {
                        $scannerName = "Scanner $ScannerIndex"
                    }
                    break
                }
            }
        }

        if (-not $scanner) {
            Write-Output "ERROR:No scanner found at index $ScannerIndex. Connected scanners: $scannerCount. Make sure a scanner is connected and WIA drivers are installed."
            exit 1
        }

        # Connect to scanner device
        Write-Verbose "Connecting to scanner: $scannerName"
        $device = $scanner.Connect()

        # Get the first scan item (usually the flatbed)
        if ($device.Items.Count -eq 0) {
            Write-Output "ERROR:Scanner has no scan items available. The scanner may not be ready."
            exit 1
        }

        $item = $device.Items.Item(1)

        # Try to set scan properties (resolution, color mode, paper size)
        try {
            foreach ($prop in $item.Properties) {
                $propName = $prop.Name
                if ($propName -eq "Horizontal Resolution" -or $propName -eq "Horizontal Extent") {
                    try { $prop.Value = $Resolution } catch {}
                }
                elseif ($propName -eq "Vertical Resolution" -or $propName -eq "Vertical Extent") {
                    try { $prop.Value = $Resolution } catch {}
                }
                elseif ($propName -eq "Current Intent") {
                    try { $prop.Value = $ColorMode } catch {}
                }
            }
        } catch {
            # Some properties may not be settable on all scanners - continue anyway
        }

        # Perform the actual scan - this is silent, no dialog
        Write-Verbose "Starting silent scan..."
        $image = $item.Transfer()

        if (-not $image) {
            Write-Output "ERROR:Scan command returned no image. The scanner may be busy or not responding."
            exit 1
        }

        # Save as BMP first (WIA native format), then convert to JPEG
        $bmpPath = if ($OutputPath -ne "") {
            $OutputPath -replace '\.\w+$', '.bmp'
        } else {
            [System.IO.Path]::Combine(
                [System.IO.Path]::GetTempPath(),
                "wia_scan_$(Get-Date -Format 'yyyyMMdd_HHmmss').bmp"
            )
        }

        # Save the raw scan
        $image.SaveFile($bmpPath)

        # Convert BMP to JPEG for smaller file size
        $jpgPath = if ($OutputPath -ne "") {
            $OutputPath
        } else {
            [System.IO.Path]::Combine(
                [System.IO.Path]::GetTempPath(),
                "wia_scan_$(Get-Date -Format 'yyyyMMdd_HHmmss').jpg"
            )
        }

        $converted = Convert-BmpToJpg -BmpPath $bmpPath -JpgPath $jpgPath

        if ($converted) {
            # Clean up BMP file
            try { Remove-Item $bmpPath -Force } catch {}
            Write-Output "OK:$jpgPath"
        } else {
            # If conversion fails, return BMP file
            Write-Output "OK:$bmpPath"
        }
        exit 0
    }

    Write-Output "ERROR:Unknown action '$Action'. Use 'scan' or 'list'."
    exit 1

} catch {
    $errMsg = $_.Exception.Message
    # Provide more helpful error messages
    if ($errMsg -match "0x80210015" -or $errMsg -match "WIA_ERROR_NO_DEVICE_AVAILABLE") {
        Write-Output "ERROR:No WIA scanner device available. Please check: 1) Scanner is powered on and connected, 2) WIA driver is installed, 3) Scanner is not being used by another application."
    } elseif ($errMsg -match "0x80210006" -or $errMsg -match "WIA_ERROR_BUSY") {
        Write-Output "ERROR:Scanner is busy. Please wait for the current operation to finish or restart the scanner."
    } elseif ($errMsg -match "0x8021000A" -or $errMsg -match "WIA_ERROR_WARMING_UP") {
        Write-Output "ERROR:Scanner is warming up. Please wait a moment and try again."
    } elseif ($errMsg -match "0x8021000B" -or $errMsg -match "WIA_ERROR_USER_INTERVENTION") {
        Write-Output "ERROR:Scanner requires user intervention. Please check the scanner (paper jam, cover open, etc.)."
    } elseif ($errMsg -match "0x80210004" -or $errMsg -match "WIA_ERROR_PAPER_JAM") {
        Write-Output "ERROR:Paper jam detected. Please clear the paper jam and try again."
    } elseif ($errMsg -match "0x80210005" -or $errMsg -match "WIA_ERROR_PAPER_EMPTY") {
        Write-Output "ERROR:No paper in the scanner feeder. Please load paper and try again."
    } elseif ($errMsg -match "COM object") {
        Write-Output "ERROR:WIA COM component not available. This feature requires Windows with WIA support. Make sure Windows Image Acquisition service is running."
    } else {
        Write-Output "ERROR:$errMsg"
    }
    exit 1
}
