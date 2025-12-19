export interface GXCodeParams {
  current: number
  tripUnit: 'TM' | 'EM'
  body: 'CS' | 'NS' | 'EX'
  ip: string
  control: 'ML' | 'RD' | 'FM'
  protocol: 'MB' | 'PB' | 'ET' | 'NO'
}

/**
 * Генерирует код GX-модели в формате:
 * GX-M[XXX]-[R]-[C]-[IP]-[UC]-[PRT]
 * 
 * [XXX] — номинальный ток в амперах
 * [R] — тип расцепителя (TM/EM)
 * [C] — материал корпуса (CS/NS/EX)
 * [IP] — степень защиты (IP40, IP54, IP65, etc.)
 * [UC] — управление (ML/RD/FM)
 * [PRT] — интерфейс (MB/PB/ET/NO)
 */
export function generateGXCode(params: GXCodeParams): string {
  return `GX-M${params.current}-${params.tripUnit}-${params.body}-${params.ip}-${params.control}-${params.protocol}`
}

export function mapOrderToGXCode(order: any): string {
  const device = order.device || {}
  const base = device.base || {}
  const release = device.release || {}
  const enclosure = device.enclosure || {}
  const controls = device.controls || {}
  const interfaces = device.interfaces || []

  // Map release type to TM or EM
  const tripUnitMap: { [key: string]: 'TM' | 'EM' } = {
    'TM': 'TM',
    'EN': 'EM',  // EN treated as electronic
    'EM': 'EM'
  }
  const tripUnit: 'TM' | 'EM' = tripUnitMap[release.type] || 'TM'

  // Determine body material from enclosure material
  let body: 'CS' | 'NS' | 'EX' = 'CS' // default to carbon steel
  if (enclosure.material === 'stainless') {
    body = 'NS' // nержавеющая сталь
  } else if (enclosure.material === 'explosive') {
    body = 'EX' // взрывозащищённый
  }

  // Get IP rating from enclosure (default IP40 if not specified)
  const ip = enclosure.ip || 'IP40'

  // Determine control type from controlType
  let control: 'ML' | 'RD' | 'FM' = 'ML' // default to local
  if (controls.controlType === 'remote') {
    control = 'RD' // дистанционное
  } else if (controls.controlType === 'combined') {
    control = 'FM' // комбинированное
  }

  // Determine protocol/interface
  let protocol: 'MB' | 'PB' | 'ET' | 'NO' = 'NO' // default to no connection
  if (interfaces && interfaces.length > 0) {
    const firstInterface = interfaces[0].toUpperCase()
    if (firstInterface.includes('MODBUS')) {
      protocol = 'MB' // Modbus RTU or TCP
    } else if (firstInterface.includes('PROFIBUS')) {
      protocol = 'PB' // Profibus DP
    } else if (firstInterface.includes('ETHERNET') || firstInterface.includes('ETHERNETIP')) {
      protocol = 'ET' // Ethernet/IP
    }
  }

  return generateGXCode({
    current: base.current || 400,
    tripUnit,
    body,
    ip,
    control,
    protocol
  })
}
