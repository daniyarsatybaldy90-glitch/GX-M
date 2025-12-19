@echo off
REM Run as Administrator
cd /d "%USERPROFILE%\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator"

REM Create scheduled task for autostart
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$TaskName = 'GX-M400-Auto-Start'; " ^
  "$ScriptPath = '%USERPROFILE%\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator\start-all.ps1'; " ^
  "$Principal = New-ScheduledTaskPrincipal -UserID 'NT AUTHORITY\SYSTEM' -LogonType ServiceAccount -RunLevel Highest; " ^
  "$Trigger = New-ScheduledTaskTrigger -AtStartup; " ^
  "$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-WindowStyle Hidden -ExecutionPolicy Bypass -NoProfile -File \"$ScriptPath\"'; " ^
  "$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable; " ^
  "Register-ScheduledTask -TaskName $TaskName -Principal $Principal -Trigger $Trigger -Action $Action -Settings $Settings -Force; " ^
  "Write-Host 'Task created successfully!'"

pause
