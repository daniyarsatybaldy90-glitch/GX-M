$TaskName = "GX-M400-Auto-Start"
$ScriptPath = "c:\Users\Daniyar Satybaldy\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator\start-all.ps1"

# Create principal (system account with highest privileges)
$Principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Create trigger (at startup)
$Trigger = New-ScheduledTaskTrigger -AtStartup

# Create action (run PowerShell script)
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -NoProfile -File `"$ScriptPath`""

# Create settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task
Register-ScheduledTask -TaskName $TaskName -Principal $Principal -Trigger $Trigger -Action $Action -Settings $Settings -Force

Write-Host "✅ Task 'GX-M400-Auto-Start' created successfully!"
Write-Host "The application will automatically start when your computer boots up."
