# Auto-start script for GX-M400 Configurator
cd "c:\Users\Daniyar Satybaldy\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator"

# Start backend with PM2
Write-Host "Starting backend with PM2..."
npx pm2 restart backend

# Wait a moment
Start-Sleep -Seconds 2

# Start ngrok in a new window
Write-Host "Starting ngrok..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\Daniyar Satybaldy\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator'; npx ngrok http 3000"

Write-Host "Both services started!"
