# scan.ps1 - WIA/TWAIN Scanner Script for Windows
# Usage:
#   .\scan.ps1 -Action list              -> List available scanners
#   .\scan.ps1 -Action scan              -> Direct scan (no dialog)
#   .\scan.ps1 -Action dialog            -> Scan with Windows scanning UI
#   .\scan.ps1 -Action scan -Resolution 300 -ScannerIndex 2

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

    # ========== SCAN WITH WINDOWS DIALOG ==========
    if ($Action -eq "dialog") {
        $dialog = New-Object -ComObject WIA.CommonDialog
        # ShowAcquireImage(DeviceType, Intent, Quality, FormatID, ShowProgress, ShowUI)
        $image = $dialog.ShowAcquireImage(1, 0, 0, "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}", $false, $true)
        if ($image) {
            if ($OutputPath -eq "") {
                $OutputPath = [System.IO.Path]::Combine(
                    [System.IO.Path]::GetTempPath(),
                    "wia_scan_$(Get-Date -Format 'yyyyMMdd_HHmmss').jpg"
                )
            }
            $image.SaveFile($OutputPath)
            Write-Output "OK:$OutputPath"
        } else {
            Write-Output "CANCELLED"
        }
        exit 0
    }

    # ========== DIRECT SCAN (NO DIALOG) ==========
    if ($Action -eq "scan") {
        $deviceManager = New-Object -ComObject WIA.DeviceManager

        # Find scanner by index
        $scannerCount = 0
        $scanner = $null
        for ($i = 1; $i -le $deviceManager.DeviceInfos.Count; $i++) {
            $deviceInfo = $deviceManager.DeviceInfos.Item($i)
            if ($deviceInfo.Type -eq 1) {
                $scannerCount++
                if ($scannerCount -eq $ScannerIndex) {
                    $scanner = $deviceInfo
                    break
                }
            }
        }

        if (-not $scanner) {
            Write-Output "ERROR:No scanner found. Make sure a scanner is connected and TWAIN/WIA drivers are installed."
            exit 1
        }

        # Connect to scanner
        $device = $scanner.Connect()
        $item = $device.Items.Item(1)

        # Try to set scan properties
        try {
            foreach ($prop in $item.Properties) {
                if ($prop.Name -eq "Horizontal Resolution") { $prop.Value = $Resolution }
                elseif ($prop.Name -eq "Vertical Resolution") { $prop.Value = $Resolution }
                elseif ($prop.Name -eq "Current Intent") { $prop.Value = $ColorMode }
            }
        } catch {
            # Some properties may not be settable on all scanners
        }

        # Perform scan
        $image = $item.Transfer()

        if ($OutputPath -eq "") {
            $ext = "bmp"
            $OutputPath = [System.IO.Path]::Combine(
                [System.IO.Path]::GetTempPath(),
                "wia_scan_$(Get-Date -Format 'yyyyMMdd_HHmmss').$ext"
            )
        }

        $image.SaveFile($OutputPath)
        Write-Output "OK:$OutputPath"
        exit 0
    }

    Write-Output "ERROR:Unknown action '$Action'. Use 'scan', 'list', or 'dialog'."
    exit 1

} catch {
    Write-Output "ERROR:$($_.Exception.Message)"
    exit 1
}
