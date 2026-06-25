import { useRef, useEffect, useState, useCallback } from 'react'
import { Trash2, PenLine } from 'lucide-react'

interface SignaturePadProps {
  value: string
  onChange: (dataUrl: string) => void
  disabled?: boolean
}

export function SignaturePad({ value, onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [isEmpty, setIsEmpty] = useState(!value)

  // Restore existing signature on mount or when value changes from outside
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = value
      setIsEmpty(false)
    } else {
      setIsEmpty(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (disabled) return
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current!
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)

    ctx.beginPath()
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
    }
    ctx.stroke()
    lastPos.current = pos
    setIsEmpty(false)
  }

  function stopDraw() {
    if (!drawing.current) return
    drawing.current = false
    lastPos.current = null
    const canvas = canvasRef.current!
    onChange(canvas.toDataURL('image/png'))
  }

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onChange('')
  }, [onChange])

  return (
    <div className="space-y-2">
      <div
        className={`relative border-2 rounded-xl overflow-hidden ${
          disabled ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-white'
        }`}
        style={{ height: 140 }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={140}
          className="w-full h-full touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          style={{ cursor: disabled ? 'default' : 'crosshair' }}
        />
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <PenLine size={16} />
              <span>Assine aqui</span>
            </div>
          </div>
        )}
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          <Trash2 size={13} />
          Limpar assinatura
        </button>
      )}
    </div>
  )
}
