import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'
import { ROBOTO_REGULAR_BASE64 } from './pdf.font'
import { mapOrderToGXCode } from './services.CodeGenerator'

export async function renderOrderPDF(order:any): Promise<Blob>{
  const doc = new jsPDF({ unit:'pt', format:'a4' })
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(14)
  
  const gxCode = mapOrderToGXCode(order)
  doc.text(`Конфигурация комплектного устройства рудничного исполнения GX-M`, 40, 40)
  doc.setFontSize(12)
  doc.text(`Код: ${gxCode}`, 40, 56)

  const rows: any[] = []
  
  // Информация о заказчике
  if(order.customer?.name || order.customer?.contact) {
    rows.push(['', ''])
    rows.push(['Информация о заказчике', ''])
    if(order.customer?.name) rows.push(['Компания', order.customer.name])
    if(order.customer?.contact) rows.push(['Контакты', order.customer.contact])
  }
  
  // Информация о проекте
  if(order.project?.name || order.project?.location) {
    rows.push(['', ''])
    rows.push(['Информация о проекте', ''])
    if(order.project?.name) rows.push(['Название проекта', order.project.name])
    if(order.project?.location) rows.push(['Локация', order.project.location])
  }
  
  // Параметры устройства
  rows.push(['', ''])
  rows.push(['Параметры устройства', ''])
  rows.push(['Аппарат', order.device.id])
  rows.push(['Ток / Напряжение / Частота / Полюса', `${order.device.base.current}A / ${order.device.base.voltage}V / ${order.device.base.frequency}Hz / ${order.device.base.poles}`])
  rows.push(['Отключающая способность Icu', `${order.device.base.icu}kA`])
  rows.push(['Расцепитель', order.device.release.type + (order.device.release.model? ` (${order.device.release.model})` : '')])
  rows.push(['Защиты', order.device.protections.join(', ') || '—'])
  rows.push(['УКИ', order.device.uki.enabled ? (order.device.uki.model||'УКИ включено') : 'Нет'])
  rows.push(['Интерфейсы', order.device.interfaces.join(', ') || '—'])
  
  // Исполнение корпуса
  const materialMap: {[key: string]: string} = {
    'carbon': 'Корпус из листовой стали (стандартное)',
    'stainless': 'Корпус из нержавеющей стали',
    'explosive': 'Взрывозащищённый корпус (Ex-исполнение)'
  }
  const materialLabel = materialMap[order.device.enclosure.material] || 'Корпус из листовой стали'
  rows.push(['Исполнение корпуса', materialLabel])
  rows.push(['Тип корпуса', `${order.device.enclosure.id}`])
  rows.push(['Степень защиты', order.device.enclosure.ip || 'IP40'])
  
  // Кабельные вводы
  rows.push(['', ''])
  rows.push(['Кабельные вводы и отходящие линии', ''])
  rows.push(['Количество вводов питания', String(order.device.enclosure.inlets)])
  if(order.cabling?.inputLines) rows.push(['Количество отходящих линий', String(order.cabling.inputLines)])
  if(order.cabling?.cableEntries) rows.push(['Кабельные вводы (сальники)', order.cabling.cableEntries])
  
  const controlTypeLabel = 
    order.device.controls.controlType === 'combined' ? 'Комбинированное' :
    order.device.controls.controlType === 'remote' ? 'Дистанционное' :
    'Местное'
  
  const handleLabel = order.device.controls.hasHandle ? 'Да' : 'Нет'
  
  // Управление и кнопки
  rows.push(['', ''])
  rows.push(['Управление', ''])
  rows.push(['Тип управления', controlTypeLabel])
  rows.push(['Руковатка вводного автомата', handleLabel])
  rows.push(['Кнопки', order.device.controls.buttons?.join(', ') || '—'])
  rows.push(['Индикаторы', order.device.controls.indicators?.join(', ') || '—'])
  rows.push(['Доп. контакты', String(order.device.controls.auxContacts)])

  // Дополнительные требования
  if(order.additionalRequirements?.trim()) {
    rows.push(['', ''])
    rows.push(['Дополнительные требования', order.additionalRequirements])
  }

  autoTable(doc, {
    startY: 75,
    head: [['Параметр','Значение']],
    body: rows,
    styles: { fontSize: 10, font: 'Roboto' },
    headStyles: { font: 'Roboto' },
    bodyStyles: { font: 'Roboto' }
  })

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Код', 'Наименование', 'Кол-во']],
    body: order.items.map((it:any)=>[it.code, it.name, String(it.qty)]),
    styles: { fontSize: 10, font: 'Roboto' },
    headStyles: { font: 'Roboto' },
    bodyStyles: { font: 'Roboto' }
  })

  const metaY = (doc as any).lastAutoTable.finalY + 20
  doc.setFontSize(10)
  doc.text(`catalogVersion: ${order.catalogVersion}`, 40, metaY)
  doc.text(`createdAt: ${order.meta.createdAt}`, 40, metaY+14)
  if(order.meta.hash){
    const guideUrl = `${window.location.origin}/guide`
    const qrData = await QRCode.toDataURL(guideUrl, { margin: 1, width: 90 })
    const img = qrData
    doc.addImage(img, 'PNG', 450, metaY-10, 90, 90)
    doc.text('Справочник конфигуратора', 430, metaY+90)
  }

  return doc.output('blob')
}