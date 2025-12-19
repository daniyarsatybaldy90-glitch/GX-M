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
  rows.push(['Аппарат', order.device.id])
  rows.push(['Ток / Напряжение / Частота / Полюса', `${order.device.base.current}A / ${order.device.base.voltage}V / ${order.device.base.frequency}Hz / ${order.device.base.poles}`])
  rows.push(['Расцепитель', order.device.release.type + (order.device.release.model? ` (${order.device.release.model})` : '')])
  rows.push(['Защиты', order.device.protections.join(', ') || '—'])
  rows.push(['УКИ', order.device.uki.enabled ? (order.device.uki.model||'') : 'Нет'])
  rows.push(['Интерфейсы', order.device.interfaces.join(', ') || '—'])
  rows.push(['Корпус/вводы', `${order.device.enclosure.id} / ${order.device.enclosure.inlets}`])
  
  const controlTypeLabel = 
    order.device.controls.controlType === 'combined' ? 'Комбинированное' :
    order.device.controls.controlType === 'remote' ? 'Дистанционное' :
    'Местное'
  
  const handleLabel = order.device.controls.hasHandle ? 'Да' : 'Нет'
  rows.push(['Тип управления', controlTypeLabel])
  rows.push(['Руковатка вводного автомата', handleLabel])
  rows.push(['Доп. контакты', String(order.device.controls.auxContacts)])

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