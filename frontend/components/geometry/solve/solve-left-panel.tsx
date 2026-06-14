'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle2, MessageSquareWarning, Play, Sparkles, ArrowLeft } from 'lucide-react'
import { useGeometry } from '@/components/geometry/geometry-context'
import { applyBackendResultToState, applyRawJsonToGeometry, solveProblemText } from './solve-logic'

const SAMPLE_PROBLEM =
  `Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. SA vuông góc với mặt phẳng (ABCD) và SA = a.`

const REPORT_QUEUE_KEY = 'geometry_report_queue_v1'

type ReportItem = {
  problemText: string
  lastResultJson: string
  createdAt: string
}

function pushReport(item: ReportItem) {
  try {
    const raw = localStorage.getItem(REPORT_QUEUE_KEY)
    const list: ReportItem[] = raw ? JSON.parse(raw) : []
    list.unshift(item)
    localStorage.setItem(REPORT_QUEUE_KEY, JSON.stringify(list.slice(0, 50)))
    return true
  } catch {
    return false
  }
}

export function SolveLeftPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id')
  const {
    geometryData,
    setGeometryData,
    validation,
    setValidation,
    setIsConsistent,
    setErrorMessage,
    setQueries,
    setSolveArtifact,
    errorMessage,
  } = useGeometry()

  const setters = useMemo(
    () => ({ setGeometryData, setValidation, setIsConsistent, setErrorMessage, setQueries, setSolveArtifact }),
    [setGeometryData, setValidation, setIsConsistent, setErrorMessage, setQueries, setSolveArtifact],
  )

  const [problem, setProblem] = useState(SAMPLE_PROBLEM)
  const [activeTab, setActiveTab] = useState<'input' | 'json'>('input')
  const [jsonInput, setJsonInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastResultRaw, setLastResultRaw] = useState<any>(null)

  const handleSolveNow = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const result = await solveProblemText(problem)
      if (result && typeof result === 'object') {
        ;(result as any).problemText = problem
      }
      setLastResultRaw(result)
      setJsonInput(JSON.stringify(result, null, 2))
      applyBackendResultToState(result, setters)
    } catch (error: any) {
      setErrorMessage(error.message || 'Lỗi kết nối.')
      setValidation({ isConsistent: false, issues: [error.message || 'Lỗi'] })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyJson = () => {
    try {
      applyRawJsonToGeometry(jsonInput, setters)
      setActiveTab('input')
    } catch (e: any) {
      setErrorMessage('JSON không hợp lệ: ' + (e?.message || String(e)))
    }
  }

  const handleReportWrong = () => {
    const payload: ReportItem = {
      problemText: problem,
      lastResultJson: lastResultRaw ? JSON.stringify(lastResultRaw) : jsonInput || '',
      createdAt: new Date().toISOString(),
    }
    const ok = pushReport(payload)
    if (ok) alert('Đã gửi báo cáo. Cảm ơn bạn!')
    else alert('Không thể lưu báo cáo trên trình duyệt này.')
  }

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-card text-card-foreground border-r border-border shadow-inner">
      {/* Navigation Buttons */}
      <div className="flex pb-4 border-b border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const targetUrl = projectId ? `/chedotuve?id=${projectId}` : '/chedotuve'
            router.push(targetUrl)
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl text-xs py-1.5 h-8 font-semibold bg-background hover:bg-accent/40"
        >
          <ArrowLeft size={14} />
          Bản vẽ cá nhân
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">Trình giải Hình học AI</h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">Trình vẽ từ đề bài</p>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input">Đề bài</TabsTrigger>
          <TabsTrigger value="json">Dữ liệu JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="flex-1 flex flex-col gap-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
              Đề bài toán học
            </label>
            <Textarea
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="Nhập đề bài hình học tại đây..."
              className="w-full h-[320px] bg-background border-border resize-none text-[13px] leading-relaxed p-4 rounded-2xl focus:ring-primary/20 transition-all shadow-inner"
            />
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
                Vẽ hình
              </div>
            )}
          </Button>

          {errorMessage ? (
            <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-[12px]">
              {errorMessage}
            </div>
          ) : null}

          {geometryData && (
            <div
              className={`
                mt-1 p-4 rounded-2xl border flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2
                ${validation.isConsistent
                  ? 'bg-green-500/5 border-green-500/20 text-green-600'
                  : 'bg-destructive/5 border-destructive/20 text-destructive'}
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
                    : validation.issues[0] ||
                      'Dữ liệu đề bài có thể bị thiếu hoặc mâu thuẫn.'}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border/60">
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-dashed border-border hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all flex items-center gap-2 text-xs font-semibold"
              onClick={handleReportWrong}
            >
              <MessageSquareWarning size={14} />
              Báo cáo hình vẽ sai
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="json" className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-xs font-bold text-muted-foreground uppercase">Chỉnh sửa / Dán JSON phản hồi</label>
            <Textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder='Dán JSON vào đây (vd: { "points": { "A": {"x":0,"y":0,"z":0} }, ... })'
              className="flex-1 mt-2 font-mono text-[10px] bg-background border-border resize-none text-foreground rounded-2xl shadow-inner"
            />
          </div>
          <Button onClick={handleApplyJson} variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
            <Play className="w-4 h-4 mr-2" />
            Áp dụng JSON
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
