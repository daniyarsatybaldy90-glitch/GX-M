export function downloadBlob(blob: Blob, filename: string){
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadText(text: string, filename: string){
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  downloadBlob(blob, filename)
}