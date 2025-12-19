# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️ This script requires Administrator privileges!"
    Write-Host "Restarting with Administrator rights..."
    Start-Sleep -Seconds 2
    
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process powershell -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$scriptPath`""
    exit
}

Write-Host "✅ Running as Administrator"
Write-Host ""
Write-Host "Creating Task Scheduler task for auto-start..."

$TaskName = "GX-M400-Auto-Start"
$ScriptPath = "$PSScriptRoot\start-all.ps1"

try {
    # Remove existing task if it exists
    Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false

    # Create principal
    $Principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest

    # Create trigger
    $Trigger = New-ScheduledTaskTrigger -AtStartup

    # Create action
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -NoProfile -File `"$ScriptPath`""

    # Create settings
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

    # Register task
    Register-ScheduledTask -TaskName $TaskName -Principal $Principal -Trigger $Trigger -Action $Action -Settings $Settings -Force | Out-Null

    Write-Host ""
    Write-Host "✅✅✅ SUCCESS! ✅✅✅"
    Write-Host ""
    Write-Host "Task 'GX-M400-Auto-Start' has been created!"
    Write-Host ""
    Write-Host "Your application will automatically start when your computer boots up:"
    Write-Host "  - Backend server (PM2)"
    Write-Host "  - ngrok tunnel"
    Write-Host ""
    Write-Host "After reboot, the app will be available at:"
    Write-Host "  https://prefinancial-leatrice-mesne.ngrok-free.dev"
    Write-Host ""
}
catch {
    Write-Host "❌ Error: $_"
    Write-Host ""
    Write-Host "Please make sure to run this script as Administrator."
}

Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
