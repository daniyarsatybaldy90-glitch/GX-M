#!/usr/bin/env node

/**
 * Тестирование интеграции Google Drive
 * Используйте это для локального тестирования перед деплоем
 */

import googleDriveService from './GoogleDriveBackendService.js'
import * as XLSX from 'xlsx'

async function testGoogleDrive() {
  console.log('🔍 Тестирование Google Drive интеграции...\n')

  // Проверка переменных окружения
  console.log('📋 Проверка переменных окружения:')
  const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const hasKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const hasFolderId = !!process.env.GOOGLE_DRIVE_FOLDER_ID

  console.log(`  ✅ GOOGLE_SERVICE_ACCOUNT_EMAIL: ${hasEmail ? '✓' : '✗ ОТСУТСТВУЕТ'}`)
  console.log(`  ✅ GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: ${hasKey ? '✓' : '✗ ОТСУТСТВУЕТ'}`)
  console.log(`  ✅ GOOGLE_DRIVE_FOLDER_ID: ${hasFolderId ? '✓' : '✗ ОТСУТСТВУЕТ'}`)

  if (!hasEmail || !hasKey || !hasFolderId) {
    console.log('\n❌ Ошибка: Не все переменные окружения установлены')
    console.log('\nДобавьте в .env.local или переменные системы:')
    console.log('  - GOOGLE_SERVICE_ACCOUNT_EMAIL')
    console.log('  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
    console.log('  - GOOGLE_DRIVE_FOLDER_ID')
    process.exit(1)
  }

  // Создание тестового Excel файла
  console.log('\n📝 Создание тестового Excel файла...')
  const workbook = XLSX.utils.book_new()
  const testData = [
    ['Параметр', 'Значение'],
    ['Тест', 'Google Drive интеграция'],
    ['Дата', new Date().toISOString()],
    ['Статус', '✅ Успешно']
  ]
  const sheet = XLSX.utils.aoa_to_sheet(testData)
  XLSX.utils.book_append_sheet(workbook, sheet, 'Test')
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

  // Загрузка на Google Drive
  console.log('☁️  Загрузка на Google Drive...')
  const result = await googleDriveService.uploadExcelFile(
    `test-${Date.now()}.xlsx`,
    buffer
  )

  if (result) {
    console.log('✅ Успешно загружено на Google Drive!')
    console.log(`📄 Файл ID: ${result.id}`)
    console.log(`🔗 Ссылка: ${result.webViewLink}`)
    console.log('\n🎉 Google Drive интеграция работает корректно!')
  } else {
    console.log('❌ Ошибка при загрузке на Google Drive')
    console.log('Проверьте:')
    console.log('  1. Что Service Account поделили папкой на Google Drive')
    console.log('  2. Что переменные окружения установлены верно')
    console.log('  3. Интернет соединение')
    process.exit(1)
  }
}

testGoogleDrive().catch(err => {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
})
