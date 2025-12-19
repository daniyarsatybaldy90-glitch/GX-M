/**
 * Google Drive Service
 * Управление авторизацией и загрузкой файлов на Google Drive
 */

interface GoogleAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface GoogleDriveFile {
  id: string
  name: string
  webViewLink: string
}

class GoogleDriveService {
  private accessToken: string | null = null
  private folderId: string = 'root' // Папка для сохранения файлов
  private clientId: string = ''
  private redirectUri: string = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth-callback`

  /**
   * Инициализировать сервис с OAuth Client ID
   */
  public initialize(clientId: string): void {
    this.clientId = clientId
  }

  /**
   * Получить URL для авторизации Google
   */
  public getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file',
      access_type: 'offline',
      prompt: 'consent'
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Установить access token
   */
  public setAccessToken(token: string): void {
    this.accessToken = token
    localStorage.setItem('gx_google_access_token', token)
  }

  /**
   * Получить сохранённый access token
   */
  public getAccessToken(): string | null {
    if (this.accessToken) {
      return this.accessToken
    }
    const stored = localStorage.getItem('gx_google_access_token')
    if (stored) {
      this.accessToken = stored
      return stored
    }
    return null
  }

  /**
   * Проверить авторизацию
   */
  public isAuthorized(): boolean {
    return this.getAccessToken() !== null
  }

  /**
   * Выход
   */
  public logout(): void {
    this.accessToken = null
    localStorage.removeItem('gx_google_access_token')
  }

  /**
   * Загрузить файл на Google Drive
   */
  public async uploadFile(fileName: string, fileData: Blob, mimeType: string = 'application/json'): Promise<GoogleDriveFile> {
    const token = this.getAccessToken()
    if (!token) {
      throw new Error('Не авторизованы в Google Drive')
    }

    // Создаём FormData для multipart upload
    const formData = new FormData()
    const metadata = {
      name: fileName,
      parents: [this.folderId]
    }
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', fileData, fileName)

    try {
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Ошибка загрузки: ${error.error?.message}`)
      }

      return await response.json() as GoogleDriveFile
    } catch (error) {
      console.error('Ошибка при загрузке файла на Google Drive:', error)
      throw error
    }
  }

  /**
   * Загрузить JSON заказ
   */
  public async uploadOrderJSON(order: any): Promise<GoogleDriveFile> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `GX-M-заказ-${timestamp}.json`
    const jsonBlob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' })
    return this.uploadFile(fileName, jsonBlob)
  }

  /**
   * Загрузить PDF заказ
   */
  public async uploadOrderPDF(pdfData: Blob): Promise<GoogleDriveFile> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `GX-M-заказ-${timestamp}.pdf`
    return this.uploadFile(fileName, pdfData, 'application/pdf')
  }

  /**
   * Установить папку для сохранения
   */
  public setFolderId(folderId: string): void {
    this.folderId = folderId
  }

  /**
   * Создать папку на Drive
   */
  public async createFolder(folderName: string, parentFolderId: string = 'root'): Promise<string> {
    const token = this.getAccessToken()
    if (!token) {
      throw new Error('Не авторизованы в Google Drive')
    }

    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    }

    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Ошибка создания папки: ${error.error?.message}`)
      }

      const data = await response.json() as { id: string }
      return data.id
    } catch (error) {
      console.error('Ошибка при создании папки:', error)
      throw error
    }
  }

  /**
   * Получить список файлов из папки
   */
  public async listFiles(folderId: string = 'root', pageSize: number = 10): Promise<GoogleDriveFile[]> {
    const token = this.getAccessToken()
    if (!token) {
      throw new Error('Не авторизованы в Google Drive')
    }

    try {
      const query = `'${folderId}' in parents and trashed=false`
      const params = new URLSearchParams({
        q: query,
        spaces: 'drive',
        fields: 'files(id,name,webViewLink)',
        pageSize: pageSize.toString()
      })

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Ошибка получения файлов: ${error.error?.message}`)
      }

      const data = await response.json() as { files: GoogleDriveFile[] }
      return data.files || []
    } catch (error) {
      console.error('Ошибка при получении списка файлов:', error)
      throw error
    }
  }
}

// Экспортируем singleton
export const googleDriveService = new GoogleDriveService()
export default GoogleDriveService
