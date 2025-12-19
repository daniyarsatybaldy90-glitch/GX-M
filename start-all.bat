@echo off
cd /d "c:\Users\Daniyar Satybaldy\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator"

REM Start backend with PM2
call npx pm2 restart backend

REM Start ngrok in a new window
start "ngrok" cmd.exe /c "npx ngrok http 3000"

exit /b 0
