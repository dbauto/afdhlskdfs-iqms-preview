/**
 * Profile photos (ADR-033): JPEG, PNG or WebP up to 5 MB, cropped to a square and re-encoded as a
 * 256 × 256 JPEG, so what is kept is a small new image, never the file someone chose (no metadata,
 * no embedded content). The live service does this on the server, like logos (D12); the preview does it
 * in the browser and keeps the result with the sample data.
 */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
const SIDE = 256

export async function reencodePhoto(file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type)) throw Error("Choose a JPG, PNG or WebP picture.")
  if (file.size > PHOTO_MAX_BYTES) throw Error("Choose a picture under 5 MB.")
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(Error("That file couldn’t be read as a picture."))
      i.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    if (side < 64) throw Error("Choose a picture at least 64 pixels across.")
    const canvas = document.createElement("canvas")
    canvas.width = SIDE
    canvas.height = SIDE
    const ctx = canvas.getContext("2d")
    if (!ctx) throw Error("Your browser couldn’t prepare the picture.")
    // centre crop to a square
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIDE, SIDE)
    return canvas.toDataURL("image/jpeg", 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
