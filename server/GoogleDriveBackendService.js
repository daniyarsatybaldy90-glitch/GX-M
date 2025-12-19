import { google } from 'googleapis'
import * as fs from 'node:fs/promises'

/**
 * Google Drive Backend Service
 * Сохранение файлов на Google Drive с использованием Service Account
 */

class GoogleDriveBackendService {
  private drive = null
  private folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'

  constructor() {
    this.initialize()
  }

  /**
   * Инициализировать Google Drive API с сервисным аккаунтом
   */
  private initialize() {
    try {
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

      if (!privateKey || !clientEmail) {
        console.warn('Google Drive Service Account не настроен')
        return
      }

      // Парсим приватный ключ (может быть в формате с \n)
      const key = privateKey.replace(/\\n/g, '\n')

      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: 'gx-m400-configurator',
          private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID || 'key1',
          private_key: key,
          client_email: clientEmail,
          client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID || '123456789',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
        },
        scopes: ['https://www.googleapis.com/auth/drive.file']
      })

      this.drive = google.drive({ version: 'v3', auth })
    } catch (error) {
      console.error('Failed to initialize Google Drive Service:', error)
    }
  }

  /**
   * Загрузить Excel файл на Google Drive
   */
  public async uploadExcelFile(fileName: string, fileBuffer: Buffer): Promise<{ id: string; webViewLink: string } | null> {
    if (!this.drive) {
      console.warn('Google Drive не инициализирован')
      return null
    }

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [this.folderId],
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        media: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          body: fileBuffer
        },
        fields: 'id, webViewLink'
      })

      const fileId = response.data.id
      const webViewLink = response.data.webViewLink

      // Даём публичный доступ файлу (опционально)
      try {
        await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        })
      } catch (err) {
        console.warn('Failed to set public permission:', err)
      }

      return { id: fileId, webViewLink }
    } catch (error) {
      console.error('Failed to upload file to Google Drive:', error)
      return null
    }
  }

  /**
   * Загрузить PDF файл на Google Drive
   */
  public async uploadPdfFile(fileName: string, fileBuffer: Buffer): Promise<{ id: string; webViewLink: string } | null> {
    if (!this.drive) {
      console.warn('Google Drive не инициализирован')
      return null
    }

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [this.folderId],
          mimeType: 'application/pdf'
        },
        media: {
          mimeType: 'application/pdf',
          body: fileBuffer
        },
        fields: 'id, webViewLink'
      })

      const fileId = response.data.id
      const webViewLink = response.data.webViewLink

      // Даём публичный доступ файлу
      try {
        await this.drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        })
      } catch (err) {
        console.warn('Failed to set public permission:', err)
      }

      return { id: fileId, webViewLink }
    } catch (error) {
      console.error('Failed to upload PDF to Google Drive:', error)
      return null
    }
  }

  /**
   * Создать папку на Google Drive для хранения заказов
   */
  public async createOrderFolder(folderName: string): Promise<string | null> {
    if (!this.drive) {
      console.warn('Google Drive не инициализирован')
      return null
    }

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [this.folderId]
        },
        fields: 'id'
      })

      return response.data.id
    } catch (error) {
      console.error('Failed to create folder:', error)
      return null
    }
  }
}

export default new GoogleDriveBackendService()
