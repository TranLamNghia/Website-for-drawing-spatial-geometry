'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, Send, CheckCircle2, X, UploadCloud, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FeedbackImage = {
  name: string
  dataUrl: string
  type: string
}

const FEEDBACK_TYPES = [
  { value: 'Báo lỗi hệ thống', label: 'Báo lỗi hệ thống' },
  { value: 'Đề xuất tính năng mới', label: 'Đề xuất tính năng mới' },
  { value: 'Góp ý giao diện/trải nghiệm', label: 'Góp ý giao diện/trải nghiệm' },
  { value: 'Ý kiến khác', label: 'Ý kiến khác' },
]

export default function FeedbackPage() {
  const [email, setEmail] = useState('')
  const [type, setType] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<FeedbackImage[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    const allowedTypes = new Set(['image/png', 'image/jpeg'])
    const acceptedFiles = files.filter(file => allowedTypes.has(file.type))

    if (acceptedFiles.length !== files.length) {
      setErrorMessage('Chỉ chấp nhận file PNG hoặc JPG/JPEG.')
    }

    if (images.length + acceptedFiles.length > 3) {
      setErrorMessage('Chỉ được tải lên tối đa 3 ảnh.')
      return
    }

    acceptedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImages(prev => [...prev, { name: file.name, dataUrl: String(reader.result || ''), type: file.type }])
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email || !type || !content || rating === 0) {
      setErrorMessage('Vui lòng điền đầy đủ email, loại góp ý, số sao và nội dung.')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('email', email)
      formData.set('rating', String(rating))
      formData.set('type', type)
      formData.set('content', content)

      images.forEach(image => {
        const blob = dataUrlToBlob(image.dataUrl, image.type)
        formData.append('attachments', blob, image.name)
      })

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || 'Không thể gửi góp ý.')
      }

      setSubmitted(true)
    } catch (error: any) {
      setErrorMessage(error?.message || 'Không thể gửi góp ý.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const dataUrlToBlob = (dataUrl: string, mimeType: string) => {
    const base64 = dataUrl.split(',')[1] || ''
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mimeType })
  }

  const handleReset = () => {
    setEmail('')
    setType('')
    setRating(0)
    setHoverRating(null)
    setContent('')
    setImages([])
    setSubmitted(false)
    setErrorMessage('')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Hòm thư góp ý</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Luôn trân trọng mọi phản hồi của bạn để cải tiến website tốt hơn.
        </p>

        <div className="mt-6 sm:mt-8">
          {submitted ? (
            <Card className="border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md p-5 text-center flex flex-col items-center justify-center gap-4 sm:p-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Gửi góp ý thành công!</h2>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Phản hồi của bạn đã được ghi nhận. Cảm ơn bạn đã dành thời gian đóng góp.
              </p>
              <Button onClick={handleReset} variant="outline" className="mt-4 rounded-xl border border-border/80 bg-background hover:bg-muted">
                Gửi thêm góp ý khác
              </Button>
            </Card>
          ) : (
            <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-md overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-indigo-500" />
              <CardHeader className="pt-8">
                <CardTitle className="text-lg">Gửi ý kiến đóng góp</CardTitle>
                <CardDescription className="text-xs">Vui lòng điền đầy đủ thông tin bên dưới.</CardDescription>
              </CardHeader>
              <CardContent className="mt-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Địa chỉ email của bạn</label>
                    <Input
                      type="email"
                      required
                      placeholder="example@gmail.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="rounded-xl border-border/80 focus-visible:ring-primary/45"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground block">
                      Đánh giá độ hài lòng ({rating > 0 ? `${rating}/10` : 'Chọn số sao'})
                    </label>
                    <div className="flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-muted/20 p-2 sm:gap-1.5 sm:p-2.5">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(star => {
                        const isHighlighted = hoverRating !== null ? star <= hoverRating : star <= rating
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            aria-label={`${star} sao`}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                          >
                            <Star
                              className={`h-5 w-5 transition-colors duration-150 sm:h-[22px] sm:w-[22px] ${
                                isHighlighted ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40 hover:text-muted-foreground/60'
                              }`}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Loại góp ý</label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="rounded-xl border-border/80 focus:ring-primary/45">
                        <SelectValue placeholder="Chọn loại góp ý" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {FEEDBACK_TYPES.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Ảnh đính kèm ({images.length}/3)</label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((img, idx) => (
                        <div key={`${img.name}-${idx}`} className="group relative aspect-square overflow-hidden rounded-xl border border-border/80">
                          <img src={img.dataUrl} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            aria-label="Xóa ảnh"
                            className="absolute top-1.5 right-1.5 flex min-h-8 min-w-8 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-100 transition-opacity hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {images.length < 3 && (
                        <label
                          htmlFor="feedback-images"
                          className="flex flex-col items-center justify-center aspect-square rounded-xl border border-dashed border-border/100 hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-all gap-1.5"
                        >
                          <UploadCloud className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground font-medium">Tải ảnh lên</span>
                        </label>
                      )}
                    </div>
                    <input
                      type="file"
                      id="feedback-images"
                      multiple
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Nội dung chi tiết</label>
                    <Textarea
                      required
                      rows={16}
                      placeholder="Hãy nhập ý kiến đóng góp hoặc mô tả chi tiết của bạn tại đây..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      className="rounded-xl border-border/80 focus-visible:ring-primary/45 resize-y leading-relaxed overflow-y-auto"
                    />
                  </div>

                  {errorMessage ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                      <AlertCircle size={16} />
                      <span>{errorMessage}</span>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={!email || !type || !content || rating === 0 || isSubmitting}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Đang gửi...' : 'Gửi góp ý của bạn'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
