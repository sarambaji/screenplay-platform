// components/AvatarCropper.tsx
'use client'

import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'

type AvatarCropperProps = {
  imageSrc: string
  onCancel: () => void
  onComplete: (blob: Blob) => void
}

type Area = {
  width: number
  height: number
  x: number
  y: number
}

// Helper: turn cropped area into a Blob
async function getCroppedImg(imageSrc: string, croppedAreaPixels: Area) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D context')

  const { width, height, x, y } = croppedAreaPixels

  canvas.width = width
  canvas.height = height

  ctx.drawImage(
    image,
    x,
    y,
    width,
    height,
    0,
    0,
    width,
    height
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas is empty'))
      resolve(blob)
    }, 'image/jpeg')
  })
}

export default function AvatarCropper({
  imageSrc,
  onCancel,
  onComplete,
}: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback(
    (_: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels)
    },
    []
  )

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onComplete(blob)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full max-w-md flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Adjust your avatar</h2>

        <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1} // square avatar
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 w-10">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer text-xs px-3 py-1 rounded-full border border-zinc-700 hover:bg-zinc-800"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="cursor-pointer text-xs px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Use this'}
          </button>
        </div>
      </div>
    </div>
  )
}
