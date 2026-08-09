import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_EDGE = 1600

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const type = blob.type || 'image/jpeg'
  return new File([blob], fileName, { type })
}

async function compressImageFile(file: File): Promise<File> {
  if (file.size <= MAX_BYTES && !file.type.includes('png')) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality = 0.85
  let blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )

  while (blob && blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.1
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  }

  if (!blob) {
    return file
  }

  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
}

async function pickWithSource(source: CameraSource): Promise<File | null> {
  const photo = await Camera.getPhoto({
    quality: 80,
    width: MAX_EDGE,
    height: MAX_EDGE,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source,
    correctOrientation: true,
  })

  if (!photo.dataUrl) {
    return null
  }

  const baseName = source === CameraSource.Camera ? 'camera' : 'gallery'
  const file = await dataUrlToFile(photo.dataUrl, `${baseName}-${Date.now()}.jpg`)
  return compressImageFile(file)
}

export async function pickImageFromCamera(): Promise<File | null> {
  return pickWithSource(CameraSource.Camera)
}

export async function pickImageFromGallery(): Promise<File | null> {
  return pickWithSource(CameraSource.Photos)
}
