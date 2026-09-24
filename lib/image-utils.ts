// Client-side helper used by the Family & Faces photo upload: shrinks an
// image to a reasonable size and re-encodes it as JPEG before it's sent to
// the backend as a base64 data URL. Keeps requests small since photos are
// stored inline (see FamilyMember model) rather than in object storage.
export function fileToCompressedDataUrl(file: File, maxDim = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read file."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("Could not read image."))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas not supported."))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
