# 🚀 Быстрый старт: GX-M Configurator с Google Drive

## За 5 минут до публичной ссылки

### Вариант 1: Railway.app (САМЫЙ БЫСТРЫЙ ✅)

1. **Создайте Service Account**
   - https://console.cloud.google.com → APIs & Services → Credentials
   - Create Service Account → Create Key (JSON)
   - Сохраните `client_email` и `private_key`

2. **Создайте папку на Google Drive**
   - https://drive.google.com
   - Новая папка "GX-M Orders"
   - Поделитесь с email из Service Account
   - Скопируйте папку ID из URL

3. **Разверните на Railway**
   ```bash
   npm install -g railway
   railway login
   cd c:\Users\Daniyar\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator
   railway init
   railway up
   ```

4. **Добавьте переменные в Railway**
   - https://railway.app → ваш проект → Variables
   - Добавьте:
     ```
     GOOGLE_DRIVE_FOLDER_ID=YOUR_FOLDER_ID
     GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email@appspot.gserviceaccount.com
     GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
     NODE_ENV=production
     ```

5. **Получите ссылку**
   - https://railway.app → Deployments
   - Скопируйте URL вида: `https://your-app-xxx.railway.app`
   - Отправьте заказчикам! 🎉

### Вариант 2: Vercel (РЕКОМЕНДУЕТСЯ)

Смотрите полную инструкцию: [DEPLOYMENT_VERCEL.md](./DEPLOYMENT_VERCEL.md)

### Вариант 3: Локально с ngrok (ДЛЯ ТЕСТИРОВАНИЯ)

1. **Установите ngrok**
   ```powershell
   choco install ngrok
   # или скачайте с https://ngrok.com/download
   ```

2. **Запустите сервер локально**
   ```powershell
   cd "c:\Users\Daniyar\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator"
   npm run build
   node server/index.js
   ```
   Сервер запустится на http://localhost:3000

3. **В отдельном терминале создайте публичный туннель**
   ```powershell
   ngrok http 3000
   ```

4. **Скопируйте URL**
   - Из консоли ngrok скопируйте URL вида: `https://xxxx-xx-xxx-xx-xxx.ngrok.io`
   - Отправьте заказчикам!

---

## Команды для быстрого старта

### Локальное тестирование
```powershell
cd "c:\Users\Daniyar\OneDrive\Desktop\gx-m400-configurator\gx-m400-configurator"
npm install
npm run build
node server/index.js
# Откройте http://localhost:3000
```

### Отправка на GitHub
```powershell
git add .
git commit -m "Add Google Drive integration"
git push origin main
```

### Проверка что работает
1. Откройте ссылку вашего сервера (localhost или Vercel/Railway)
2. Заполните форму конфигурации
3. Нажмите "Сформировать заказ"
4. Проверьте Google Drive на новый Excel файл ✅

---

## Структура переменных окружения

```env
# Google Drive
GOOGLE_DRIVE_FOLDER_ID=1ABC-xyz123DEF-xyz456  # ID папки из URL Drive
GOOGLE_SERVICE_ACCOUNT_EMAIL=sa-123@appspot.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n

# Server
PORT=3000
NODE_ENV=production
```

---

## Если что-то не работает

### Google Drive не сохраняет файлы
- ✅ Проверьте что Service Account поделили папкой на Drive
- ✅ Убедитесь что FOLDER_ID скопирован верно (без лишних символов)
- ✅ Проверьте что приватный ключ полностью скопирован

### Ссылка не открывается
- ✅ Дождитесь окончания деплоя (обычно 2-5 минут)
- ✅ Очистите кэш браузера (Ctrl+Shift+Delete)
- ✅ Проверьте логи в Vercel/Railway

### Форма не работает
- ✅ Откройте DevTools (F12)
- ✅ Проверьте консоль на ошибки
- ✅ Проверьте что сервер запустился

---

## Готово! 🎉

Теперь у вас есть:
✅ Генератор моделей выключателей CHINT NM8N  
✅ Форма для конфигурации  
✅ Генерация PDF с QR-кодом  
✅ Экспорт в Excel  
✅ Сохранение на Google Drive  
✅ Публичная ссылка для заказчиков  

Отправляйте ссылку заказчикам! 🚀
