import { Container, CssBaseline, Typography, Box, AppBar, Toolbar } from '@mui/material'
import ConfiguratorForm from './components/ConfiguratorForm'

export default function App(){
  return (
    <>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>GX-M400 Конфигуратор</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" gutterBottom>Конфигурация комплектного устройства рудничного исполнения GX-M</Typography>
          <Typography color="text.secondary">MVP • локальные справочники • экспорт JSON/PDF</Typography>
        </Box>
        <ConfiguratorForm />
      </Container>
    </>
  )
}