import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import * as XLSX from 'xlsx'
import admin from 'firebase-admin'
import dotenv from 'dotenv'

// Load .env.local first, then .env
dotenv.config({ path: path.join(process.cwd(), 'server', '.env.local') })
dotenv.config({ path: path.join(process.cwd(), '.env') })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

// Initialize Firebase Admin
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })
} catch (error) {
  console.log('Firebase already initialized or not configured')
}

const bucket = admin.storage().bucket()

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.static(distDir))
app.use(express.static(submissionsDir, { prefix: '/submissions' }))

app.post('/api/submit', async (req, res) => {
  const { orderJson, pdfBase64, baseUrl } = req.body || {}

  if (typeof orderJson !== 'string') {
    res.status(400).json({ error: 'orderJson must be provided as string' })
    return
  }

  let parsedOrder
  try {
    parsedOrder = JSON.parse(orderJson)
  } catch (error) {
    res.status(400).json({ error: 'orderJson must be valid JSON' })
    return
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const excelFileName = `${timestamp}-order.xlsx`
  const pdfFileName = `${timestamp}-order.pdf`

  try {
    const workbook = XLSX.utils.book_new()
    const order = parsedOrder || {}
    const device = order.device || {}
    const base = device.base || {}
    const release = device.release || order.release || {}
    const enclosure = device.enclosure || {}
    const controls = device.controls || {}
    const meta = order.meta || {}

    const asList = (value) => Array.isArray(value) ? value.join(', ') : ''
    const boolToText = (value) => (value === true ? 'Да' : value === false ? 'Нет' : '')
    const formatNumber = (value) => (typeof value === 'number' ? value : value ?? '')
    
    const controlType = controls.controlType || 'local'
    const hasHandle = controls.hasHandle || false

    const summaryRows = [
      ['Параметр', 'Значение'],
      ['Версия заказа', order.version ?? ''],
      ['Версия каталога', order.catalogVersion ?? ''],
      ['Дата создания', meta.createdAt ?? ''],
      ['Хеш заказа', meta.hash ?? ''],
      ['User Agent', meta.userAgent ?? ''],
      ['Заказчик', order.customer?.name ?? ''],
      ['Контакты заказчика', order.customer?.contact ?? ''],
      ['Проект', order.project?.name ?? ''],
      ['Локация проекта', order.project?.location ?? ''],
      ['Аппарат', device.id ?? ''],
      ['Ток, А', formatNumber(base.current)],
      ['Напряжение, В', formatNumber(base.voltage)],
      ['Частота, Гц', formatNumber(base.frequency)],
      ['Полюса', base.poles ?? ''],
      ['Отключающая способность Icu, кА', formatNumber(base.icu)],
      ['Тип расцепителя', release.type ?? ''],
      ['Модель расцепителя', release.model ?? ''],
      ['Защиты', asList(device.protections)],
      ['УКИ установлено', boolToText(device.uki?.enabled)],
      ['Модель УКИ', device.uki?.model ?? ''],
      ['Интерфейсы', asList(device.interfaces)],
      ['Корпус', enclosure.id ?? ''],
      ['Количество вводов', formatNumber(enclosure.inlets)],
      ['Тип управления', controlType === 'combined' ? 'Комбинированное' : controlType === 'remote' ? 'Дистанционное' : 'Местное'],
      ['Рукоатка вводного автомата', hasHandle ? 'Да' : 'Нет'],
      ['Доп. контакты', formatNumber(controls.auxContacts)]
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Order')

    const normalizedItems = Array.isArray(order.items)
      ? order.items.map((item) => ({
          'Код': item.code ?? '',
          'Наименование': item.name ?? '',
          'Количество': item.qty ?? ''
        }))
      : []

    const itemsSheet = normalizedItems.length
      ? XLSX.utils.json_to_sheet(normalizedItems)
      : XLSX.utils.aoa_to_sheet([['Код', 'Наименование', 'Количество']])
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Комплектация')

    const rawSheet = XLSX.utils.aoa_to_sheet([[JSON.stringify(parsedOrder)]])
    XLSX.utils.book_append_sheet(workbook, rawSheet, 'RAW')

    const workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    // Upload Excel to Firebase Storage
    const excelFile = bucket.file(`submissions/${excelFileName}`)
    const excelSignedUrl = await new Promise((resolve, reject) => {
      excelFile.save(workbookBuffer, {
        metadata: { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      }, async (error) => {
        if (error) return reject(error)
        const [url] = await excelFile.getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })
        resolve(url)
      })
    })

    // Upload PDF to Firebase Storage if provided
    let pdfSignedUrl = null
    if (typeof pdfBase64 === 'string' && pdfBase64.startsWith('data:')) {
      const base64Part = pdfBase64.split(',')[1]
      if (base64Part) {
        const pdfBuffer = Buffer.from(base64Part, 'base64')
        const pdfFile = bucket.file(`submissions/${pdfFileName}`)
        pdfSignedUrl = await new Promise((resolve, reject) => {
          pdfFile.save(pdfBuffer, {
            metadata: { contentType: 'application/pdf' }
          }, async (error) => {
            if (error) return reject(error)
            const [url] = await pdfFile.getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })
            resolve(url)
          })
        })
      }
    }

    res.json({ 
      status: 'ok',
      excelFile: excelFileName,
      excelUrl: excelSignedUrl,
      pdfFile: pdfFileName,
      pdfUrl: pdfSignedUrl
    })
  } catch (error) {
    console.error('Failed to store submission', error)
    res.status(500).json({ error: 'Failed to store submission' })
  }
})

app.get('*', (_req, res, next) => {
  if (_req.method !== 'GET') {
    next()
    return
  }

  if (_req.path === '/guide') {
    res.sendFile(path.join(distDir, 'guide.png'), (err) => {
      if (err) {
        res.status(404).send('Guide not found')
      }
    })
    return
  }

  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) {
      next(err)
    }
  })
})

const port = 3000
app.listen(port, () => {
  console.log(`GX-M400 backend listening on http://localhost:${port}`)
})
