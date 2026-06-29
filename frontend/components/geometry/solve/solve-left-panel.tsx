'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertCircle, CheckCircle2, Play, Sparkles, Home } from 'lucide-react'
import { useGeometry } from '@/components/geometry/geometry-context'
import { applyBackendResultToState, applyRawJsonToGeometry, solveProblemTextStream } from './solve-logic'
import { SolveProcessingOverlay } from './solve-processing-overlay'

const SAMPLE_PROBLEM =
  `Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. SA vuông góc với mặt phẳng (ABCD) và SA = a.`

const reportQueue: ReportItem[] = []

type ReportItem = {
  problemText: string
  lastResultJson: string
  createdAt: string
}

function pushReport(item: ReportItem) {
  try {
    reportQueue.unshift(item)
    if (reportQueue.length > 50) reportQueue.length = 50
    return true
  } catch {
    return false
  }
}

export function SolveLeftPanel() {
  const router = useRouter()
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
  const [processingStage, setProcessingStage] = useState<null | 'waiting' | 'solving'>(null)
  const [lastResultRaw, setLastResultRaw] = useState<any>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)

  const isLoading = processingStage !== null

  const handleSolveNow = async () => {
    setProcessingStage('waiting')
    setErrorMessage('')
    setErrorDialogOpen(false)
    try {
      const result = await solveProblemTextStream(problem, (stage) => {
        if (stage === 'solving') setProcessingStage('solving')
      })
      if (result && typeof result === 'object') {
        ;(result as any).problemText = problem
      }
      setLastResultRaw(result)
      setJsonInput(JSON.stringify(result, null, 2))
      applyBackendResultToState(result, setters)
      setErrorDialogOpen(false)
    } catch (error: any) {
      const message = 'Xin lỗi bạn, chức năng vẽ bằng AI này đang bị lỗi, sẽ sớm quay trở lại nhanh nhất có thể'
      setErrorMessage(message)
      setValidation({ isConsistent: false, issues: [message] })
      setErrorDialogOpen(true)
    } finally {
      setProcessingStage(null)
    }
  }

  const handleApplyJson = () => {
    try {
      applyRawJsonToGeometry(jsonInput, setters)
      setActiveTab('input')
    } catch {
      setErrorMessage('JSON không hợp lệ.')
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
    <>
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto border-r border-border bg-card p-6 text-card-foreground shadow-inner">
      {/* Navigation Buttons */}
      <div className="flex pb-4 border-b border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl text-xs py-1.5 h-8 font-semibold bg-background hover:bg-accent/40"
        >
          <Home size={14} />
          Trang chủ
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground tracking-tight">Trình giải Hình học AI</h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">Trình vẽ từ đề bài</p>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="flex flex-col">
        <TabsList className="grid w-full grid-cols-2 hidden">
          <TabsTrigger value="input">Đề bài</TabsTrigger>
          <TabsTrigger value="json">Dữ liệu JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="mt-4 flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
              Đề bài toán học
            </label>
            <Textarea
              value={problem}
              onChange={e => setProblem(e.target.value)}
              disabled={isLoading}
              placeholder="Nhập đề bài hình học tại đây..."
              className="h-[240px] w-full resize-none rounded-2xl border-border bg-background p-4 text-[13px] leading-relaxed shadow-inner transition-all focus:ring-primary/20 lg:h-[320px]"
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
        </TabsContent>

        <TabsContent value="json" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase">Chỉnh sửa / Dán JSON phản hồi</label>
            <Textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder='Dán JSON vào đây (vd: { "points": { "A": {"x":0,"y":0,"z":0} }, ... })'
              className="mt-2 h-[280px] resize-none rounded-2xl border-border bg-background font-mono text-xs text-foreground shadow-inner lg:h-[360px]"
            />
          </div>
          <Button onClick={handleApplyJson} variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
            <Play className="w-4 h-4 mr-2" />
            Áp dụng JSON
          </Button>
        </TabsContent>
      </Tabs>
    </div>
    <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chức năng AI đang tạm lỗi</AlertDialogTitle>
          <AlertDialogDescription>Xin lỗi bạn, chức năng vẽ bằng AI này đang bị lỗi, sẽ sớm quay trở lại nhanh nhất có thể</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Đã hiểu</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <SolveProcessingOverlay open={isLoading} variant={processingStage === 'solving' ? 'solving' : 'waiting'} />
    </>
  )
}
