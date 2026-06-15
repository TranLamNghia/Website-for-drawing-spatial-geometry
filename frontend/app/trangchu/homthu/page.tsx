'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, Send, CheckCircle2, X, UploadCloud } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function FeedbackPage() {
  const [email, setEmail] = useState('')
  const [type, setType] = useState('general')
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    
    if (images.length + files.length > 3) {
      alert('Chỉ được tải lên tối đa 3 ảnh.')
      return
    }

    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !content || rating === 0) return
    
    // Process feedback submission mockup
    setSubmitted(true)
  }

  const handleReset = () => {
    setEmail('')
    setType('general')
    setRating(0)
    setContent('')
    setImages([])
    setSubmitted(false)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Hòm thư góp ý</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Luôn trân trọng mọi phản hồi của bạn để cải tiến website tốt hơn.
        </p>

        <div className="mt-8">
          {submitted ? (
            <Card className="border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md p-8 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-bounce" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Gửi góp ý thành công!</h2>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Cảm ơn đóng góp quý giá của bạn. Phản hồi của bạn đã được ghi nhận và gửi trực tiếp tới đội ngũ quản trị viên.
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
                <CardDescription className="text-xs">Vui lòng điền đầy đủ các thông tin bên dưới.</CardDescription>
              </CardHeader>
              <CardContent className="mt-1">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email */}
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

                  {/* Star rating (1-10) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground block">
                      Đánh giá độ hài lòng ({rating > 0 ? `${rating}/10` : 'Chọn số sao'})
                    </label>
                    <div className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl border border-border/60 bg-muted/20 w-fit">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(star => {
                        const isHighlighted = (hoverRating !== null ? star <= hoverRating : star <= rating)
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
                            title={`${star} sao`}
                          >
                            <Star
                              className={`w-5 h-5 transition-colors duration-150 ${
                                isHighlighted
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/40 hover:text-muted-foreground/60'
                              }`}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Feedback Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Loại góp ý</label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="rounded-xl border-border/80 focus:ring-primary/45">
                        <SelectValue placeholder="Chọn loại góp ý" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="bug">Báo lỗi hệ thống</SelectItem>
                        <SelectItem value="feature">Đề xuất tính năng mới</SelectItem>
                        <SelectItem value="ui">Góp ý giao diện/trải nghiệm</SelectItem>
                        <SelectItem value="general">Ý kiến đóng góp chung</SelectItem>
                        <SelectItem value="other">Ý kiến khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Image Upload Box */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Ảnh đính kèm ({images.length}/3)</label>
                    <div className="grid grid-cols-3 gap-3">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border/80 group">
                          <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-destructive/80 hover:bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa ảnh"
                          >
                            <X size={12} />
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
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>

                  {/* Content */}
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

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    disabled={!email || !content || rating === 0}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    <Send className="w-4 h-4" />
                    Gửi góp ý của bạn
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
