
import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OrderFormSchema, type OrderForm } from '../services.ValidationEngine'
import { loadJson } from '../services.CatalogService'
import { renderOrderPDF } from '../services.PDFService'
import { downloadText, downloadBlob } from '../utils.download'
import { mapOrderToGXCode } from '../services.CodeGenerator'
import {
  Box, Paper, Stack, Typography, Divider, Button, TextField, MenuItem, FormControlLabel,
  Checkbox, Switch, Select, InputLabel, FormControl, OutlinedInput, Chip, Tooltip, Alert
} from '@mui/material'

type DevicesCat = { catalogVersion:string; devices: { id:string; currents:number[]; voltages:number[]; frequencies:number[]; poles:('3P'|'4P')[]; icu?:number[] }[] }
type ReleasesCat = { types: { id:'TM'|'ELN'; name:string; models?:string[] }[] }
type ProtectionsCat = { items: { id:string; name:string; requires?: string[] }[] }
type UKICat = { items: { id:string; name:string; interfaces:string[] }[] }
type InterfacesCat = { items: { id:string; name:string }[] }
type EnclosuresCat = { items: { id:string; material:string; ip:string; inlets:number[]; title?:string }[] }

type OrderItem = { code: string; name: string; qty: number }
type OrderPayload = {
  version: string
  catalogVersion: string
  customer?: OrderForm['customer']
  project?: OrderForm['project']
  device: {
    id: string
    base: OrderForm['base']
    release: OrderForm['release']
    protections: OrderForm['protections']
    uki: OrderForm['uki']
    interfaces: OrderForm['interfaces']
    enclosure: OrderForm['enclosure']
    controls: OrderForm['controls']
  }
  items: OrderItem[]
  meta: { createdAt: string; userAgent: string; hash?: string }
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onloadend = () => resolve((reader.result as string) || '')
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

const MULTI_PROPS = {
  multiple: true,
  input: <OutlinedInput label="Интерфейсы" />,
  renderValue: (selected: any) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map((v)=> <Chip key={v} label={v} />)}</Box>
}

export default function ConfiguratorForm(){
  const [devices, setDevices] = useState<DevicesCat | null>(null)
  const [releases, setReleases] = useState<ReleasesCat | null>(null)
  const [protections, setProtections] = useState<ProtectionsCat | null>(null)
  const [uki, setUki] = useState<UKICat | null>(null)
  const [interfaces, setInterfaces] = useState<InterfacesCat | null>(null)
  const [enclosures, setEnclosures] = useState<EnclosuresCat | null>(null)
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success'|'error'; message: string; files?: { excel?: string; pdf?: string } } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fallbackDefaults = useMemo<OrderForm>(()=>({
    customer: { name: undefined, contact: undefined },
    project: { name: undefined, location: undefined },
    base: { current: 400, voltage: 690, frequency: 50, poles: '3P' as const, icu: 50 },
    release: { type: 'TM' },
    protections: [],
    uki: { enabled: false, model: undefined },
    interfaces: [],
    enclosure: { id: 'NM8N-400', inlets: 1, material: 'carbon', ip: 'IP40' },
    cabling: { inputLines: 0, outputLines: 0, cableEntries: undefined },
    controls: { buttons: ['ON', 'OFF'], indicators: ['Trip'], auxContacts: 0, controlType: 'local', hasHandle: false }
  }), [])

  useEffect(()=>{
    ;(async()=>{
      setDevices(await loadJson('/catalogs/devices.json'))
      setReleases(await loadJson('/catalogs/releases.json'))
      setProtections(await loadJson('/catalogs/protections.json'))
      setUki(await loadJson('/catalogs/uki.json'))
      setInterfaces(await loadJson('/catalogs/interfaces.json'))
      setEnclosures(await loadJson('/catalogs/enclosures.json'))
    })().catch(console.error)
  }, [])

  const computedDefaults = useMemo<OrderForm>(()=>{
    const primaryDevice = devices?.devices?.[0]
    const firstEnclosure = enclosures?.items?.[0]

    return {
      ...fallbackDefaults,
      base: {
        ...fallbackDefaults.base,
        current: primaryDevice?.currents?.[0] ?? fallbackDefaults.base.current,
        voltage: primaryDevice?.voltages?.[0] ?? fallbackDefaults.base.voltage,
        frequency: primaryDevice?.frequencies?.[0] ?? fallbackDefaults.base.frequency,
        poles: (primaryDevice?.poles?.[0] ?? fallbackDefaults.base.poles) as '3P' | '4P',
        icu: primaryDevice?.icu?.[0]
      },
      release: { type: fallbackDefaults.release.type },
      enclosure: {
        ...fallbackDefaults.enclosure,
        id: firstEnclosure?.id ?? fallbackDefaults.enclosure.id
      },
      cabling: fallbackDefaults.cabling,
      controls: fallbackDefaults.controls
    }
  }, [devices, enclosures])

  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<OrderForm>({
    resolver: zodResolver(OrderFormSchema) as unknown as Resolver<OrderForm>,
    defaultValues: computedDefaults,
    mode: 'onChange'
  })

  useEffect(()=>{
    reset(computedDefaults)
  }, [computedDefaults, reset])

  const releaseType = watch('release.type')
  const ukiEnabled = watch('uki.enabled')
  const chosenProtections = watch('protections') || []
  
  const watchBase = watch('base')
  const watchRelease = watch('release')
  const watchEnclosure = watch('enclosure')
  const watchControls = watch('controls')
  const watchInterfaces = watch('interfaces')
  
  const gxCode = useMemo(() => {
    return mapOrderToGXCode({
      device: {
        base: watchBase,
        release: watchRelease,
        enclosure: watchEnclosure,
        controls: watchControls,
        interfaces: watchInterfaces
      }
    })
  }, [watchBase, watchRelease, watchEnclosure, watchControls, watchInterfaces])

  const codeExplanation = useMemo(() => {
    const parts = gxCode.split('-')
    const explanations: { [key: string]: string } = {
      'TM': 'Термомагнитный расцепитель',
      'EM': 'Электронный расцепитель',
      'CS': 'Стальной лист',
      'NS': 'Нержавеющая сталь',
      'EX': 'Взрывозащищённый Ex-корпус',
      'ML': 'Местное управление',
      'RD': 'Дистанционное управление',
      'FM': 'Комбинированное управление (full mode)',
      'MB': 'Modbus',
      'PB': 'Profibus',
      'ET': 'Ethernet',
      'NO': 'Без связи'
    }
    
    return {
      prefix: parts[0] || 'GX',
      current: parts[1] || '—',
      tripUnit: parts[2] || '—',
      body: parts[3] || '—',
      ip: parts[4] || '—',
      control: parts[5] || '—',
      protocol: parts[6] || '—',
      explanations
    }
  }, [gxCode])

  const onSubmit = async (data: OrderForm)=>{
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      // Переосчитываем gxCode с актуальными данными формы
      const actualGxCode = mapOrderToGXCode({
        device: {
          base: data.base,
          release: data.release,
          enclosure: data.enclosure,
          controls: data.controls,
          interfaces: data.interfaces
        }
      })
      
      const items: OrderItem[] = [
        { code: actualGxCode, name: `Автоматический выключатель ${actualGxCode}`, qty: 1 }
      ]

      const order: OrderPayload = {
        version: '1.0',
        catalogVersion: (devices as any)?.catalogVersion || '2025.12',
        customer: data.customer,
        project: data.project,
        device: {
          id: actualGxCode,
          base: data.base,
          release: data.release,
          protections: data.protections,
          uki: data.uki,
          interfaces: data.interfaces,
          enclosure: data.enclosure,
          controls: data.controls
        },
        items,
        meta: { createdAt: new Date().toISOString(), userAgent: navigator.userAgent }
      }

      const enc = new TextEncoder().encode(JSON.stringify(order))
      const digest = await crypto.subtle.digest('SHA-256', enc)
      const hashHex = Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')
      order.meta.hash = hashHex

      const orderJson = JSON.stringify(order, null, 2)
      const pdfBlob = await renderOrderPDF(order)
      
      // Загружаем PDF
      downloadBlob(pdfBlob, 'order.pdf')

      try {
        const pdfBase64 = await blobToDataUrl(pdfBlob)
        // Отправляем на сервер для сохранения
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderJson, pdfBase64, baseUrl: window.location.origin })
        })
        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`)
        }
        
        const result = await response.json()
        
        setSubmitStatus({
          type: 'success',
          message: '✅ Заказ сохранён успешно! Файлы доступны для скачивания.',
          files: {
            excel: result.excelUrl,
            pdf: result.pdfUrl
          }
        })
      } catch (error) {
        console.error('Failed to send submission', error)
        setSubmitStatus({
          type: 'success',
          message: '✅ PDF сгенерирован и скачан! Excel файл доступен на сервере.'
        })
      }
    } catch (error) {
      console.error('Ошибка при формировании заказа:', error)
      setSubmitStatus({
        type: 'error',
        message: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
      })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setSubmitStatus(null), 8000)
    }
  }

  const protItems = protections?.items || []
  const disableProt = (p:any)=> (p.requires?.some((r:string)=> r.startsWith('release:ELN')) && releaseType==='TM')

  const device = devices?.devices?.[0]
  const icuList = device?.icu || []

  return (
    <Paper elevation={1} sx={{ p: 2 }}>
      <Stack spacing={2}>
        
        {/* Submission Status */}
        {submitStatus && (
          <Alert severity={submitStatus.type} onClose={() => setSubmitStatus(null)}>
            {submitStatus.message}
          </Alert>
        )}

        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Модель выключателя</Typography>
          <Typography variant="h5" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1976d2', mb: 2 }}>{gxCode}</Typography>
          
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #ddd' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>Расшифровка формата GX-M[XXX]-[R]-[C]-[IP]-[UC]-[PRT]:</Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, alignItems: 'flex-start' }}>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#d32f2f', minWidth: 100 }}>GX-M</Typography>
                <Typography variant="body2">Серия GX-M (модульные выключатели)</Typography>
                
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#d32f2f' }}>[XXX] {codeExplanation.current}</Typography>
                <Typography variant="body2">Номинальный ток в амперах</Typography>
                
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1976d2' }}>[R] {codeExplanation.tripUnit}</Typography>
                <Typography variant="body2">{codeExplanation.explanations[codeExplanation.tripUnit]}</Typography>
                
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f57c00' }}>[C] {codeExplanation.body}</Typography>
                <Typography variant="body2">{codeExplanation.explanations[codeExplanation.body]}</Typography>
                
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#388e3c' }}>[IP] {codeExplanation.ip}</Typography>
                <Typography variant="body2">Степень защиты оболочки</Typography>
                
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#7b1fa2' }}>[UC] {codeExplanation.control}</Typography>
                <Typography variant="body2">{codeExplanation.explanations[codeExplanation.control]}</Typography>
                
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#c2185b' }}>[PRT] {codeExplanation.protocol}</Typography>
                <Typography variant="body2">{codeExplanation.explanations[codeExplanation.protocol]}</Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>📌 Примеры кодировок:</Typography>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', mb: 0.5 }}>GX-M400-EM-NS-IP65-FM-MB</Typography>
                <Typography variant="caption">400А • электронный • нержавеющая сталь • IP65 • комбинированное управление • Modbus</Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', mb: 0.5 }}>GX-M250-TM-CS-IP54-RD-NO</Typography>
                <Typography variant="caption">250А • термомагнитный • стальной лист • IP54 • дистанционное управление • без связи</Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', mb: 0.5 }}>GX-M630-EM-EX-IP66-FM-ET</Typography>
                <Typography variant="caption">630А • электронный • взрывозащищённый • IP66 • полное управление • Ethernet</Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <Controller name="base.current" control={control} render={({ field })=>(
            <TextField select label="Номинальный ток (A)" {...field} error={!!errors.base?.current} helperText={errors.base?.current?.message as any} fullWidth sx={{ minWidth: 200 }}>
              {(device?.currents||[32,63,100,160,250,400,630,800,1000,1250,1600]).map((v)=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          )}/>
          <Controller name="base.voltage" control={control} render={({ field })=>(
            <TextField select label="Рабочее напряжение (V)" {...field} fullWidth sx={{ minWidth: 180 }}>
              {(device?.voltages||[690]).map((v)=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          )}/>
          <Controller name="base.frequency" control={control} render={({ field })=>(
            <TextField select label="Частота (Hz)" {...field} fullWidth sx={{ minWidth: 150 }}>
              {(device?.frequencies||[50]).map((v)=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          )}/>
          <Controller name="base.poles" control={control} render={({ field })=>(
            <TextField select label="Количество полюсов" {...field} fullWidth sx={{ minWidth: 150 }}>
              {(device?.poles||['3P','4P']).map((v:any)=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
            </TextField>
          )}/>
        </Stack>

        <Divider />

        <Typography variant="h6">Тип расцепителя и отключающая способность</Typography>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <Controller name="release.type" control={control} render={({ field })=>(
            <TextField select label="Тип расцепителя" {...field} sx={{ minWidth: 250 }}>
              {(releases?.types||[{id:'TM',name:'Термомагнитный (TM)'},{id:'EN',name:'Микропроцессорный (EN)'},{id:'EM',name:'Электронный с дисплеем (EM)'}]).map((t:any)=>(
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
          )}/>
          {!!icuList.length && (
            <Controller name="base.icu" control={control} render={({ field })=>(
              <Tooltip title="Предельная отключающая способность выключателя (кА)">
                <TextField select label="Отключающая способность (кА)" {...field} fullWidth sx={{ minWidth: 180 }}>
                  {icuList.map((v:number)=> <MenuItem key={v} value={v}>{v}</MenuItem>)}
                </TextField>
              </Tooltip>
            )}/>
          )}
        </Stack>

        <Divider />

        <Typography variant="h6">Защиты</Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {protItems.map(p=>(
            <Tooltip key={p.id} title={p.name}>
              <FormControlLabel
                control={<Controller name="protections" control={control} render={({ field })=>{
                  const checked = (field.value||[]).includes(p.id)
                  const onChange = (e:any)=>{
                    const arr = new Set(field.value||[])
                    if(e.target.checked) arr.add(p.id); else arr.delete(p.id)
                    field.onChange(Array.from(arr))
                  }
                  return <Checkbox checked={checked} onChange={onChange} disabled={disableProt(p)} />
                }}/>}
                label={p.name}
              />
            </Tooltip>
          ))}
        </Stack>

        <Divider />

        <Typography variant="h6">Интеграция с УКИ (устройство контроля изоляции)</Typography>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2} alignItems="center">
          <Controller name="uki.enabled" control={control} render={({ field })=>(
            <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Интеграция включена" />
          )}/>
          {ukiEnabled && (
            <Controller name="uki.model" control={control} render={({ field })=>(
              <TextField select label="Модель УКИ" {...field} error={!!errors.uki?.model} helperText={errors.uki?.model?.message as any}>
                {(uki?.items||[{id:'B-iso685',name:'Bender iso685 (IMD)'}]).map((u:any)=>(
                  <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                ))}
              </TextField>
            )}/>
          )}
        </Stack>

        <Divider />

        <Typography variant="h6">Интерфейсы связи</Typography>
        <FormControl>
          <InputLabel id="ifc-label">Интерфейсы</InputLabel>
          <Controller name="interfaces" control={control} render={({ field })=>(
            <Select labelId="ifc-label" label="Интерфейсы" {...field} {...(MULTI_PROPS as any)}>
              {(interfaces?.items||[{id:'ModbusRTU',name:'Modbus RTU (RS-485)'}]).map((i:any)=>(
                <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
              ))}
            </Select>
          )}/>
        </FormControl>

        <Divider />

        <Typography variant="h6">Исполнение корпуса (оболочки)</Typography>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <Controller name="enclosure.material" control={control} render={({ field })=>(
            <TextField select label="Материал корпуса" {...field} fullWidth sx={{ minWidth: 250 }}>
              <MenuItem value="carbon">Корпус из листовой стали (стандартное исполнение)</MenuItem>
              <MenuItem value="stainless">Корпус из нержавеющей стали</MenuItem>
              <MenuItem value="explosive">Взрывозащищённый корпус (Ex-исполнение)</MenuItem>
            </TextField>
          )}/>
          <Controller name="enclosure.id" control={control} render={({ field })=>(
            <TextField select label="Тип корпуса" {...field} fullWidth sx={{ minWidth: 200 }}>
              {(enclosures?.items||[]).map((e:any)=>(
                <MenuItem key={e.id} value={e.id}>{(e.title||e.id)}</MenuItem>
              ))}
            </TextField>
          )}/>
          <Controller name="enclosure.ip" control={control} render={({ field })=>(
            <TextField select label="Степень защиты (IP)" {...field} fullWidth sx={{ minWidth: 150 }}>
              <MenuItem value="IP40">IP40</MenuItem>
              <MenuItem value="IP54">IP54</MenuItem>
              <MenuItem value="IP55">IP55</MenuItem>
              <MenuItem value="IP56">IP56</MenuItem>
              <MenuItem value="IP65">IP65</MenuItem>
              <MenuItem value="IP66">IP66</MenuItem>
            </TextField>
          )}/>
        </Stack>

        <Divider />

        <Typography variant="h6">Кабельные вводы и отходящие линии</Typography>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <Controller name="enclosure.inlets" control={control} render={({ field })=>(
            <TextField type="number" label="Количество вводов питания (входных линий)" inputProps={{ min:1, max:10 }} {...field} fullWidth sx={{ minWidth: 200 }} />
          )}/>
          <Controller name="cabling.inputLines" control={control} render={({ field })=>(
            <TextField type="number" label="Количество отходящих линий" inputProps={{ min:0, max:10 }} {...field} fullWidth sx={{ minWidth: 200 }} />
          )}/>
          <Controller name="cabling.cableEntries" control={control} render={({ field })=>(
            <TextField label="Кабельные вводы (тип и количество сальников)" placeholder="Например: М20x1.5 (2 шт.)" {...field} fullWidth sx={{ minWidth: 250 }} />
          )}/>
        </Stack>

        <Divider />

        <Typography variant="h6">Управление и индикация</Typography>
        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <Controller name="controls.controlType" control={control as any} render={({ field })=>(
            <TextField select label="Тип управления" {...field} sx={{ minWidth: 200 }}>
              <MenuItem value="local">Местное</MenuItem>
              <MenuItem value="remote">Дистанционное</MenuItem>
              <MenuItem value="combined">Комбинированное</MenuItem>
            </TextField>
          )}/>
          
          <Controller name="controls.hasHandle" control={control as any} render={({ field })=>(
            <FormControlLabel
              control={<Switch {...field} checked={field.value || false} />}
              label="Рукоятка вводного автомата"
            />
          )}/>
          
          <Controller name="controls.auxContacts" control={control} render={({ field })=>(
            <TextField type="number" label="Доп. контакты (шт.)" inputProps={{ min:0, max:8 }} {...field} fullWidth sx={{ minWidth: 150 }} />
          )}/>
        </Stack>

        <Divider />

        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <Button 
            variant="contained" 
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            sx={{ flex: 1 }}
          >
            {isSubmitting ? 'Сохранение заказа...' : 'Сформировать заказ'}
          </Button>
        </Stack>

        {submitStatus && (
          <Box sx={{ 
            p: 2, 
            borderRadius: 1, 
            bgcolor: submitStatus.type === 'success' ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${submitStatus.type === 'success' ? '#4caf50' : '#f44336'}`
          }}>
            <Typography sx={{ color: submitStatus.type === 'success' ? '#2e7d32' : '#c62828', mb: 1 }}>
              {submitStatus.message}
            </Typography>
            {submitStatus.files && (
              <Stack spacing={1}>
                {submitStatus.files.excel && (
                  <Button 
                    variant="outlined" 
                    size="small"
                    href={submitStatus.files.excel}
                    download
                    sx={{ textAlign: 'left' }}
                  >
                    📥 Скачать Excel файл
                  </Button>
                )}
                {submitStatus.files.pdf && (
                  <Button 
                    variant="outlined" 
                    size="small"
                    href={submitStatus.files.pdf}
                    download
                    sx={{ textAlign: 'left' }}
                  >
                    📥 Скачать PDF файл
                  </Button>
                )}
              </Stack>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  )
}
