'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Play, AlertCircle, CheckCircle2, MessageSquareWarning } from 'lucide-react'
import { useGeometry, GeometryData } from './geometry-context'
import { applyBackendResultToState, SOLVE_ENDPOINT_URL } from './solve/solve-logic'

const SAMPLE_PROBLEM =
  'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. SA vuông góc với mặt phẳng (ABCD) và SA = a.'
const GENERIC_AI_ERROR = 'Chức năng AI hiện đang gặp lỗi. Vui lòng thử lại sau.'

export function LeftSidebar() {
  const {
    geometryData,
    setGeometryData,
    validation,
    setValidation,
    setIsConsistent,
    setErrorMessage,
    setQueries,
  } = useGeometry()

  const [problem, setProblem] = useState(SAMPLE_PROBLEM)
  const [isLoading, setIsLoading] = useState(false)

  const handleApplyData = (result: any) => {
    applyBackendResultToState(result, {
      setGeometryData,
      setValidation,
      setIsConsistent,
      setErrorMessage,
      setQueries,
    })
  }

  const handleSolveNow = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch(SOLVE_ENDPOINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem),
      })

      if (!response.ok) {
        await response.json().catch(() => null)
        throw new Error(GENERIC_AI_ERROR)
      }

      const result = await response.json()
      handleApplyData(result)
    } catch {
      setErrorMessage(GENERIC_AI_ERROR)
      setValidation({ isConsistent: false, issues: [GENERIC_AI_ERROR] })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-card text-card-foreground border-r border-border shadow-inner">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">Trình giải Hình học AI</h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">
          Trình giải toán không gian
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
            Đề bài toán học
          </label>
          <div className="relative group">
            <Textarea
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="Nhập đề bài hình học tại đây..."
              className="w-full h-[320px] bg-background border-border resize-none text-[13px] leading-relaxed p-4 rounded-2xl focus:ring-primary/20 transition-all shadow-inner"
            />
            <div className="absolute bottom-3 right-3 rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {problem.length} ký tự
            </div>
          </div>
        </div>

        <Button
          onClick={handleSolveNow}
          disabled={isLoading}
          className="w-full h-12 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Đang phân tích...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play size={16} fill="currentColor" />
              VẼ HÌNH NGAY
            </div>
          )}
        </Button>

        {geometryData && (
          <div
            className={`
              mt-2 p-4 rounded-2xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2
              ${
                validation.isConsistent
                  ? 'bg-green-500/5 border-green-500/20 text-green-600'
                  : 'bg-destructive/5 border-destructive/20 text-destructive'
              }
            `}
          >
            {validation.isConsistent ? (
              <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1">
              <p className="text-[13px] font-bold leading-none">
                {validation.isConsistent ? 'Hình vẽ chính xác' : 'Phát hiện mâu thuẫn'}
              </p>
              <p className="text-[11px] opacity-80 leading-relaxed">
                {validation.isConsistent
                  ? 'Hệ thống đã xác thực tính nhất quán của dữ liệu hình học.'
                  : validation.issues[0] || 'Dữ liệu đề bài có thể bị thiếu hoặc mâu thuẫn.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border/60">
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl border-dashed border-border hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all flex items-center gap-2 text-xs font-semibold"
          onClick={() => alert('Cảm ơn bạn đã báo cáo. Chúng tôi sẽ cải thiện thuật toán sớm nhất.')}
        >
          <MessageSquareWarning size={14} />
          Báo cáo hình vẽ sai
        </Button>
      </div>
    </div>
  )
}
