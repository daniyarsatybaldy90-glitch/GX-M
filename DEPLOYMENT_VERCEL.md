# Развертывание GX-M Configurator на Vercel

## Шаг 1: Подготовка к развертыванию

### 1.1 Обновите package.json для Vercel

```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "dev": "vite",
    "preview": "vite preview",
    "start": "node server/index.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### 1.2 Создайте файл `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/server/:path*"
    },
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "GOOGLE_DRIVE_FOLDER_ID": "@GOOGLE_DRIVE_FOLDER_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL": "@GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY": "@GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
  }
}
```

## Шаг 2: Создание Google Service Account

### 2.1 Откройте Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте новый проект (или используйте существующий)
3. Перейдите в "APIs & Services" → "Credentials"

### 2.2 Создайте Service Account

1. Нажмите "Create Credentials" → "Service Account"
2. Заполните детали:
   - Service account name: `gx-m-configurator-sa`
   - Service account ID: будет заполнено автоматически
   - Нажмите "Create and Continue"
3. Пропустите дополнительные шаги (нажимайте "Continue")
4. На странице Service Account нажмите на созданный аккаунт

### 2.3 Создайте Private Key

1. Откройте вкладку "Keys"
2. Нажмите "Add Key" → "Create new key"
3. Выберите "JSON"
4. Нажмите "Create"
5. Файл с ключом автоматически скачается

### 2.4 Сохраните данные из JSON ключа

Откройте скачанный JSON файл и найдите:
- `client_email` → скопируйте как `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → скопируйте как `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Шаг 3: Создание папки на Google Drive

### 3.1 Создайте папку для заказов

1. Откройте Google Drive: https://drive.google.com/
2. Создайте новую папку "GX-M Orders"
3. Нажмите правую кнопку мыши → "Share"
4. Поделитесь с email из `GOOGLE_SERVICE_ACCOUNT_EMAIL`
5. Скопируйте ID папки из URL:
   - URL: `https://drive.google.com/drive/folders/FOLDER_ID`
   - `FOLDER_ID` → скопируйте как `GOOGLE_DRIVE_FOLDER_ID`

## Шаг 4: Развертывание на Vercel

### 4.1 Подготовьте GitHub репозиторий

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push -u origin main
```

### 4.2 Создайте проект на Vercel

1. Перейдите на https://vercel.com/
2. Нажмите "New Project"
3. Импортируйте репозиторий `GX-M`
4. Нажмите "Import"

### 4.3 Добавьте переменные окружения

В разделе "Environment Variables" добавьте:

```
GOOGLE_DRIVE_FOLDER_ID = your_folder_id
GOOGLE_SERVICE_ACCOUNT_EMAIL = your_service_account_email@appspot.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = your_private_key
```

**Важно:** приватный ключ может содержать специальные символы, убедитесь что он скопирован полностью.

### 4.4 Нажмите "Deploy"

Vercel автоматически:
1. Собирет проект (`npm run build`)
2. Запустит сервер
3. Выдаст публичную ссылку

## Шаг 5: Получение публичной ссылки

После развертывания вы получите ссылку вида:
```
https://gx-m-configurator-xxxxxx.vercel.app
```

**Эту ссылку отправьте заказчикам!**

## Шаг 6: Проверка работы

1. Откройте https://your-vercel-link.vercel.app
2. Заполните форму конфигурации
3. Нажмите "Сформировать заказ"
4. Проверьте что файлы сохранились на Google Drive:
   - https://drive.google.com/drive/folders/YOUR_FOLDER_ID

## Альтернативные хостинги

Если не хотите использовать Vercel, можете развернуть на:

### Heroku (с картой)
```bash
heroku login
heroku create your-app-name
git push heroku main
```

### Railway.app (рекомендуется)
1. Перейдите на https://railway.app/
2. Подключите GitHub репозиторий
3. Добавьте переменные окружения
4. Автоматически развернется с публичной ссылкой

### Render.com
1. Перейдите на https://render.com/
2. Создайте Web Service
3. Подключите GitHub
4. Добавьте Environment Variables
5. Deploy!

## Решение проблем

### Ошибка при загрузке на Google Drive
- Проверьте что Service Account имеет доступ к папке на Google Drive
- Убедитесь что приватный ключ полностью скопирован (включая начало и конец)
- Проверьте что GOOGLE_DRIVE_FOLDER_ID верный

### Ссылка не работает
- Проверьте что деплой завершился успешно в Vercel
- Очистите кэш браузера (Ctrl+Shift+Delete)
- Откройте в инкогнито режиме

### Заказы не сохраняются локально
- Убедитесь что папка `submissions` существует на сервере
- Проверьте права доступа на папку (755 или 777)

## Обновление кода после развертывания

Просто сделайте `git push`:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel автоматически переразвернет приложение!
