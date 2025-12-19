import { useState } from 'react'
import { Button, Box, CircularProgress, Alert, Typography } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import LogoutIcon from '@mui/icons-material/Logout'
import { googleDriveService } from '../services.GoogleDriveService'

interface GoogleAuthComponentProps {
  onAuthSuccess?: (token: string) => void
  onAuthError?: (error: string) => void
}

export function GoogleAuthComponent({ onAuthSuccess, onAuthError }: GoogleAuthComponentProps) {
  const [isAuthorized, setIsAuthorized] = useState(() => googleDriveService.isAuthorized())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Инициализируем сервис с вашим Client ID
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
      if (!clientId) {
        throw new Error('Google Client ID не настроен. Установите VITE_GOOGLE_CLIENT_ID в .env')
      }

      googleDriveService.initialize(clientId)

      // Используем Google OAuth popup
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      
      const authUrl = googleDriveService.getAuthUrl()
      const popup = window.open(
        authUrl,
        'Google Sign-In',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      if (!popup) {
        throw new Error('Не удалось открыть окно авторизации. Проверьте настройки браузера.')
      }

      // Слушаем сообщения от popup
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          const { accessToken, email } = event.data
          googleDriveService.setAccessToken(accessToken)
          setIsAuthorized(true)
          setUserEmail(email)
          setLoading(false)
          onAuthSuccess?.(accessToken)
          popup.close()
          window.removeEventListener('message', messageHandler)
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          const { error: authError } = event.data
          setError(authError)
          setLoading(false)
          onAuthError?.(authError)
          popup.close()
          window.removeEventListener('message', messageHandler)
        }
      }

      window.addEventListener('message', messageHandler)

      // Таймаут на случай если popup не вернёт сообщение
      const timeout = setTimeout(() => {
        setLoading(false)
        setError('Таймаут авторизации. Попробуйте ещё раз.')
        window.removeEventListener('message', messageHandler)
      }, 2 * 60 * 1000) // 2 минуты

      // Если окно закрыли без авторизации
      const pollInterval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollInterval)
          clearTimeout(timeout)
          if (!isAuthorized) {
            setLoading(false)
          }
        }
      }, 500)

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка авторизации'
      setError(errorMsg)
      setLoading(false)
      onAuthError?.(errorMsg)
    }
  }

  const handleLogout = () => {
    googleDriveService.logout()
    setIsAuthorized(false)
    setUserEmail(null)
    setError(null)
  }

  if (isAuthorized) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: '#f0f7ff', borderRadius: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            ✅ Подключено к Google Drive
          </Typography>
          {userEmail && (
            <Typography variant="caption" color="text.secondary">
              {userEmail}
            </Typography>
          )}
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
            Ваши заказы будут сохраняться на Google Drive
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          color="error"
        >
          Выйти
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {error && <Alert severity="error">{error}</Alert>}
      
      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
        onClick={handleGoogleAuth}
        disabled={loading}
        fullWidth
        sx={{
          bgcolor: '#1f2937',
          '&:hover': { bgcolor: '#111827' }
        }}
      >
        {loading ? 'Авторизация...' : 'Подключить Google Drive'}
      </Button>

      <Typography variant="caption" color="text.secondary">
        💾 Ваши заказы будут автоматически сохраняться на ваш Google Drive
      </Typography>
    </Box>
  )
}
