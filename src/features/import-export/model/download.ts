import { toIsoDate } from '@/shared/lib'

export function fileName(extension: string): string {
  return `raspisanie-${toIsoDate(new Date())}.${extension}`
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
