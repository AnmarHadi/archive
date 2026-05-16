'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Crop, RotateCcw, Loader2, ScanLine } from 'lucide-react'

const HANDLE_R = 14

function loadOpenCV(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
      resolve()
      return
    }

    if (typeof document !== 'undefined' && document.getElementById('cv-script')) {
      const wait = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(wait)
          resolve()
        }
      }, 200)
      return
    }

    if (typeof document === 'undefined') {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = 'cv-script'
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js'
    script.onload = () => {
      const wait = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(wait)
          resolve()
        }
      }, 200)
    }
    document.head.appendChild(script)
  })
}

interface Point {
  x: number
  y: number
}

function orderPoints(pts: Point[]): Point[] {
  const sorted = [...pts].sort((a, b) => a.x - b.x)
  const [l1, l2] = sorted.slice(0, 2).sort((a, b) => a.y - b.y)
  const [r1, r2] = sorted.slice(2).sort((a, b) => a.y - b.y)
  return [l1, r1, r2, l2]
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

interface DocScannerModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (result: { blob: Blob; url: string }) => void
  title?: string
  /** Optional: Pre-loaded image URL from scanner (base64 data URL or blob URL) */
  initialImageUrl?: string | null
  /** Optional: Callback to trigger TWAIN/WIA scan from parent */
  onScanFromScanner?: () => void
  /** Optional: Whether scan is in progress */
  scanning?: boolean
}

export default function DocScannerModal({
  open,
  onClose,
  onConfirm,
  title = 'ماسح المستندات',
  initialImageUrl,
  onScanFromScanner,
  scanning = false,
}: DocScannerModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const pendingRef = useRef<{ w: number; h: number } | null>(null)
  const initialImageApplied = useRef(false)

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [corners, setCorners] = useState<Point[] | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [cvLoaded, setCvLoaded] = useState(false)
  const [cropping, setCropping] = useState(false)

  useEffect(() => {
    loadOpenCV().then(() => setCvLoaded(true))
  }, [])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStatus('idle')
      setCorners(null)
      setDragging(null)
      setCropping(false)
      imgRef.current = null
      pendingRef.current = null
      initialImageApplied.current = false
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [open])

  // Load initial image from scanner when provided
  useEffect(() => {
    if (!open || !initialImageUrl || initialImageApplied.current) return
    initialImageApplied.current = true
    loadImageFromUrl(initialImageUrl)
  }, [open, initialImageUrl])

  const loadImageFromUrl = useCallback((url: string) => {
    setStatus('loading')
    setCorners(null)

    const img = new window.Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const maxW = Math.min(window.innerWidth * 0.82, 700)
      const maxH = Math.min(window.innerHeight * 0.55, 480)
      const s = Math.min(maxW / img.width, maxH / img.height, 1)
      const w = Math.round(img.width * s)
      const h = Math.round(img.height * s)

      imgRef.current = img
      pendingRef.current = { w, h }
      setStatus('ready')
    }

    img.onerror = () => {
      setStatus('idle')
    }

    img.src = url
  }, [])

  const draw = useCallback((img: HTMLImageElement, crns: Point[] | null) => {
    const canvas = canvasRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    if (!crns) return

    const [tl, tr, br, bl] = crns

    // Draw filled polygon
    ctx.beginPath()
    ctx.moveTo(tl.x, tl.y)
    ctx.lineTo(tr.x, tr.y)
    ctx.lineTo(br.x, br.y)
    ctx.lineTo(bl.x, bl.y)
    ctx.closePath()
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.fillStyle = 'rgba(99,102,241,0.08)'
    ctx.fill()

    // Draw corner handles
    crns.forEach((p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, HANDLE_R, 0, Math.PI * 2)
      ctx.fillStyle = '#6366f1'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2.5
      ctx.stroke()
    })
  }, [])

  const detectCorners = useCallback(
    (canvasEl: HTMLCanvasElement, w: number, h: number): Point[] | null => {
      if (!window.cv?.Mat) return null
      const cv = window.cv

      try {
        const src = cv.imread(canvasEl)
        const gray = new cv.Mat()
        const blur = new cv.Mat()
        const edge = new cv.Mat()
        const dilate = new cv.Mat()
        const kernel = cv.Mat.ones(5, 5, cv.CV_8U)

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
        cv.equalizeHist(gray, gray)
        cv.GaussianBlur(gray, blur, new cv.Size(9, 9), 0)
        cv.Canny(blur, edge, 30, 100)
        cv.dilate(edge, dilate, kernel)

        const contours = new cv.MatVector()
        const hier = new cv.Mat()
        cv.findContours(dilate, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        const candidates: { area: number; approx: typeof cv.Mat.prototype }[] = []

        for (let i = 0; i < contours.size(); i++) {
          const c = contours.get(i)
          const area = cv.contourArea(c)
          const peri = cv.arcLength(c, true)
          const approx = new cv.Mat()

          for (let eps = 0.01; eps <= 0.06; eps += 0.01) {
            cv.approxPolyDP(c, approx, eps * peri, true)
            if (approx.rows === 4 && area > w * h * 0.05) {
              candidates.push({ area, approx: approx.clone() })
              break
            }
          }

          approx.delete()
          c.delete()
        }

        candidates.sort((a, b) => b.area - a.area)

        let result: Point[] | null = null
        if (candidates.length > 0) {
          const best = candidates[0].approx
          const pts: Point[] = []
          for (let i = 0; i < 4; i++) {
            pts.push({ x: best.data32S[i * 2], y: best.data32S[i * 2 + 1] })
          }
          result = orderPoints(pts)
        }

        candidates.forEach((c) => c.approx.delete())
        src.delete()
        gray.delete()
        blur.delete()
        edge.delete()
        dilate.delete()
        kernel.delete()
        contours.delete()
        hier.delete()

        if (result) {
          const valid = result.every(
            (p) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h
          )
          if (!valid) return null
        }

        return result
      } catch (e) {
        console.warn('detectCorners error:', e)
        return null
      }
    },
    []
  )

  // Draw when image is ready
  useEffect(() => {
    if (status !== 'ready') return
    if (!canvasRef.current || !imgRef.current || !pendingRef.current) return

    const { w, h } = pendingRef.current
    const canvas = canvasRef.current
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(imgRef.current, 0, 0, w, h)

    let crns = cvLoaded ? detectCorners(canvas, w, h) : null

    const fallback: Point[] = crns || [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ]

    pendingRef.current = null
    setCorners(fallback)
    draw(imgRef.current, fallback)
  }, [status, cvLoaded, detectCorners, draw])

  // Redraw when corners change
  useEffect(() => {
    if (status === 'ready' && corners && imgRef.current) {
      draw(imgRef.current, corners)
    }
  }, [corners, status, draw])

  const loadImage = useCallback((file: File) => {
    setStatus('loading')
    setCorners(null)

    const url = URL.createObjectURL(file)
    const img = new window.Image()

    img.onload = () => {
      const maxW = Math.min(window.innerWidth * 0.82, 700)
      const maxH = Math.min(window.innerHeight * 0.55, 480)
      const s = Math.min(maxW / img.width, maxH / img.height, 1)
      const w = Math.round(img.width * s)
      const h = Math.round(img.height * s)

      imgRef.current = img
      pendingRef.current = { w, h }

      URL.revokeObjectURL(url)
      setStatus('ready')
    }

    img.onerror = () => {
      setStatus('idle')
      URL.revokeObjectURL(url)
    }

    img.src = url
  }, [])

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const src = 'touches' in e ? e.touches[0] : e
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!corners) return
    const pos = getCanvasPos(e)

    for (let i = 0; i < 4; i++) {
      if (dist(pos, corners[i]) < HANDLE_R * 2) {
        setDragging(i)
        e.preventDefault()
        return
      }
    }
  }

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragging === null || !corners) return
    e.preventDefault()

    const pos = getCanvasPos(e)
    const canvas = canvasRef.current
    if (!canvas) return

    const clamped: Point = {
      x: Math.max(0, Math.min(canvas.width, pos.x)),
      y: Math.max(0, Math.min(canvas.height, pos.y)),
    }

    setCorners(corners.map((c, i) => (i === dragging ? clamped : c)))
  }

  const onPointerUp = () => setDragging(null)

  const applyCrop = () => {
    if (!corners || !imgRef.current || !window.cv?.Mat) return

    setCropping(true)

    requestAnimationFrame(() => {
      try {
        const cv = window.cv
        const img = imgRef.current!

        const rx = img.width / (canvasRef.current?.width || 1)
        const ry = img.height / (canvasRef.current?.height || 1)
        const realPts = corners.map((p) => ({ x: p.x * rx, y: p.y * ry }))
        const [tl, tr, br, bl] = realPts

        const W = Math.round(Math.max(dist(tl, tr), dist(bl, br)))
        const H = Math.round(Math.max(dist(tl, bl), dist(tr, br)))

        const tmp = document.createElement('canvas')
        tmp.width = img.width
        tmp.height = img.height
        tmp.getContext('2d')!.drawImage(img, 0, 0)

        const src = cv.imread(tmp)
        const dst = new cv.Mat()
        const srcM = cv.matFromArray(4, 1, cv.CV_32FC2, [
          tl.x, tl.y,
          tr.x, tr.y,
          br.x, br.y,
          bl.x, bl.y,
        ])
        const dstM = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0, 0,
          W, 0,
          W, H,
          0, H,
        ])
        const M = cv.getPerspectiveTransform(srcM, dstM)
        cv.warpPerspective(src, dst, M, new cv.Size(W, H))

        const out = document.createElement('canvas')
        out.width = W
        out.height = H
        cv.imshow(out, dst)

        src.delete()
        dst.delete()
        srcM.delete()
        dstM.delete()
        M.delete()

        out.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              onConfirm({ blob, url })
            }
            setCropping(false)
          },
          'image/jpeg',
          0.92
        )
      } catch (e) {
        console.error('Crop error:', e)
        setCropping(false)
      }
    })
  }

  const reset = () => {
    setStatus('idle')
    setCorners(null)
    imgRef.current = null
    pendingRef.current = null
    initialImageApplied.current = false
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[750px] w-[95%] dir-rtl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Scanning in progress */}
        {scanning && status === 'idle' && (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-base font-medium">جاري المسح الضوئي من السكنر...</p>
            <p className="text-sm text-muted-foreground">يرجى الانتظار حتى يتم المسح</p>
          </div>
        )}

        {/* Idle state - drop zone + scanner button */}
        {status === 'idle' && !scanning && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold mb-1">اضغط لاختيار صورة المستند</p>
              <p className="text-xs text-muted-foreground">JPG, PNG — الحد الأقصى 10MB</p>
              {!cvLoaded && (
                <p className="text-xs text-amber-500 mt-2 flex items-center justify-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  جاري تحميل محرك التشذيب...
                </p>
              )}
            </div>

            {/* TWAIN/WIA Scanner Button */}
            {onScanFromScanner && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">أو</span>
                </div>
              </div>
            )}
            {onScanFromScanner && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 h-12 text-base"
                onClick={onScanFromScanner}
              >
                <ScanLine className="h-5 w-5" />
                سحب من السكنر (TWAIN/WIA)
              </Button>
            )}
          </div>
        )}

        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[160px] gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري تحليل الصورة...</p>
          </div>
        )}

        {/* Ready state - canvas with draggable corners */}
        {status === 'ready' && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 text-center">
              🔵 اسحب النقاط الزرقاء لضبط حواف الوثيقة
            </p>

            <div className="overflow-auto text-center">
              <canvas
                ref={canvasRef}
                className="max-w-full border rounded-lg touch-none"
                style={{
                  cursor: dragging !== null ? 'grabbing' : 'crosshair',
                }}
                onMouseDown={onPointerDown}
                onMouseMove={onPointerMove}
                onMouseUp={onPointerUp}
                onMouseLeave={onPointerUp}
                onTouchStart={onPointerDown}
                onTouchMove={onPointerMove}
                onTouchEnd={onPointerUp}
              />
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) loadImage(f)
          }}
        />

        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={status === 'ready' ? reset : onClose}
            className="gap-2"
          >
            {status === 'ready' ? (
              <>
                <RotateCcw className="h-4 w-4" />
                إعادة الاختيار
              </>
            ) : (
              'إلغاء'
            )}
          </Button>

          <div className="flex gap-2">
            {status === 'idle' && !scanning && (
              <Button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                اختر صورة
              </Button>
            )}

            {status === 'ready' && (
              <Button
                type="button"
                onClick={applyCrop}
                disabled={!cvLoaded || cropping}
                className="gap-2"
              >
                {cropping ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري التشذيب...
                  </>
                ) : (
                  <>
                    <Crop className="h-4 w-4" />
                    {cvLoaded ? 'تشذيب وحفظ' : 'انتظر...'}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
