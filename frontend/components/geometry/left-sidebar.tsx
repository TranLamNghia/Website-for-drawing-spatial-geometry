'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Play } from 'lucide-react'
import { useGeometry, GeometryData } from './geometry-context'

const SAMPLE_PROBLEM = `Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. SA vuông góc với mặt phẳng (ABCD) và SA = a.`

export function LeftSidebar() {
  const {
    setGeometryData,
    setValidation,
    setIsConsistent,
    setErrorMessage,
    setQueries,
  } = useGeometry()
  const [problem, setProblem] = useState(SAMPLE_PROBLEM)
  const [activeTab, setActiveTab] = useState('input')
  const [jsonData, setJsonData] = useState<GeometryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSolveNow = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const response = await fetch('http://localhost:5000/api/Geometry/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Lỗi server')
      }

      const result = await response.json()
      
      const points: Record<string, [number, number, number]> = {}
      Object.entries(result.points).forEach(([name, coords]: [string, any]) => {
        const x = coords.x ?? coords.X ?? 0
        const y = coords.y ?? coords.Y ?? 0
        const z = coords.z ?? coords.Z ?? 0
        points[name] = [x, y, z]
      })

      const rawSegments = result.data?.entities?.segments || []
      const mappedEdges = rawSegments.map((s: string) => {
        if (s.length === 2) return `${s[0]}-${s[1]}`
        return s
      })

      const mappedData: GeometryData = {
        points,
        is_consistent: result.validation.allPassed,
        error_message: result.validation.allPassed ? '' : 'Dữ liệu không hoàn toàn khớp',
        edges: mappedEdges,
        queries: result.data?.queries?.map((q: any) => ({
          id: q.id || Math.random().toString(),
          text: q.question_text || '',
          edges: [] 
        })) || []
      }

      setGeometryData(mappedData)
      setJsonData(mappedData)
      setIsConsistent(mappedData.is_consistent)
      setQueries(mappedData.queries || [])
      setValidation({
        isConsistent: mappedData.is_consistent,
        issues: result.validation.failures.map((f: any) => f.message)
      })
      
      if (mappedData.is_consistent) {
         setActiveTab('data')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Lỗi kết nối.')
      setValidation({ isConsistent: false, issues: [error.message || 'Lỗi'] })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 gap-4 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-[#6671d1]" />
        <h1 className="text-lg font-bold text-gray-800">Geometry Lab AI</h1>
      </div>
      <p className="text-xs text-gray-500">Trợ lý hình học không gian</p>

      {/* Input & Data Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input">Đề bài</TabsTrigger>
          <TabsTrigger value="data">Dữ liệu JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="flex-1 flex flex-col gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Nhập đề bài
            </label>
            <Textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Nhập đề bài hình học..."
              className="flex-1 min-h-40 bg-gray-50 border-gray-200 resize-none text-gray-800"
            />
          </div>

          <Button
            onClick={handleSolveNow}
            disabled={isLoading}
            className="w-full bg-[#6671d1] text-white hover:bg-[#555eb9]"
          >
            {isLoading ? "Đang xử lý..." : "Giải toán ngay"}
          </Button>
        </TabsContent>

        <TabsContent value="data" className="flex-1 overflow-auto group">
          {jsonData ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Các điểm (Points)</h3>
                <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-2 overflow-x-auto max-h-40 border border-gray-100">
                  {Object.entries(jsonData.points).map(([name, coords]) => (
                    <div key={name} className="text-gray-600">
                      <span className="text-[#6671d1] font-bold">{name}:</span> [{coords[0].toFixed(2)}, {coords[1].toFixed(2)}, {coords[2].toFixed(2)}]
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
               Hãy giải đề để xem JSON
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Entities List */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader className="pb-3 px-4">
          <CardTitle className="text-sm">Bóc tách thực thể</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
           {jsonData ? (
             <>
               <div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Điểm</p>
                 <div className="flex flex-wrap gap-2">
                   {Object.keys(jsonData.points).map(p => (
                     <Badge key={p} variant="secondary" className="bg-[#6671d1]/10 text-[#6671d1] border-none">{p}</Badge>
                   ))}
                 </div>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Hình khối</p>
                  <Badge variant="outline" className="border-gray-300 text-gray-600">Hình chóp</Badge>
               </div>
             </>
           ) : (
             <p className="text-xs text-gray-400">Chưa bóc tách dữ liệu</p>
           )}
        </CardContent>
      </Card>
    </div>
  )
}
