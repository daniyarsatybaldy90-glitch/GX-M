export async function loadJson<T=any>(path:string): Promise<T>{
  const res = await fetch(path)
  if(!res.ok) throw new Error(`Не удалось загрузить ${path}`)
  return await res.json()
}