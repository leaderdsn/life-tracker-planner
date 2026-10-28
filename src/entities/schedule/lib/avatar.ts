export const AVATAR_SIZE = 128
export const AVATAR_MAX_BYTES = 30_000

export type CropRect = { sx: number; sy: number; side: number }

/** Largest centered square of the source image. */
export function centerCrop(width: number, height: number): CropRect {
  const side = Math.min(width, height)
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side }
}

/** Approximate decoded size of a data URL. */
export function dataUrlBytes(url: string): number {
  const payload = url.slice(url.indexOf(',') + 1)
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.floor((payload.length * 3) / 4) - padding
}

const QUALITIES = [0.8, 0.65, 0.5, 0.35]
const TYPES = ['image/webp', 'image/jpeg']

/** Picks the first encoding that fits the size budget: WebP first, then JPEG, lowering quality. */
export function pickEncoding(encode: (type: string, quality: number) => string): string {
  let last = ''
  for (const type of TYPES) {
    for (const quality of QUALITIES) {
      const url = encode(type, quality)
      // browsers without WebP silently return PNG
      if (!url.startsWith(`data:${type}`)) break
      last = url
      if (dataUrlBytes(url) <= AVATAR_MAX_BYTES) return url
    }
  }
  if (!last) throw new Error('Не удалось сжать изображение')
  throw new Error('Изображение слишком сложное, выберите другое')
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file)
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  await img.decode()
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
}

/** Center-crops the picked photo to 128×128 and encodes it as a small data URL. */
export async function resizeAvatar(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Выберите файл изображения')
  const img = await decode(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = AVATAR_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Не удалось обработать изображение')
    const { sx, sy, side } = centerCrop(img.width, img.height)
    ctx.drawImage(img.source, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    return pickEncoding((type, quality) => canvas.toDataURL(type, quality))
  } finally {
    img.close()
  }
}
