'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { useGeometry } from './geometry-context'

export function RightSidebar() {
  const {
    geometryData,
    validation,
    setHighlightedEdges,
    queries,
    selectedQueryId,
    setSelectedQueryId,
    isConsistent,
    errorMessage,
  } = useGeometry()

  const handleQueryClick = (queryId: string, edges?: string[]) => {
    setSelectedQueryId(queryId === selectedQueryId ? null : queryId)
    if (edges) {
      setHighlightedEdges(queryId === selectedQueryId ? [] : edges)
    }
  }

  const handleEntityHover = (edges?: string[]) => {
    if (edges) {
      setHighlightedEdges(edges)
    }
  }

  const handleEntityLeave = () => {
    if (!selectedQueryId) {
      setHighlightedEdges([])
    }
  }


  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-lg font-bold text-foreground">Phân tích</h2>
        <p className="text-xs text-muted-foreground">Trung tâm Kiểm định</p>
      </div>

      {/* Validation Center */}
      <Card className="bg-background border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Trạng thái hợp lệ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {geometryData ? (
            <>
              {isConsistent ? (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-700 dark:text-green-200">
                    <span className="font-semibold">Đề bài hợp lệ!</span>
                    <p className="text-xs mt-1">
                      Bài toán thỏa mãn tất cả các điều kiện hình học.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-700 dark:text-red-200">
                    <span className="font-semibold">MÂU THUẪN LOGIC PHÁT HIỆN</span>
                    {errorMessage && (
                      <p className="text-xs mt-2">{errorMessage}</p>
                    )}
                    <div className="text-xs mt-2 space-y-1">
                      {validation.issues.map((issue: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <HelpCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                Chưa có dữ liệu để kiểm định
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queries */}
      <Card className="bg-background border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Các câu hỏi (Queries)</CardTitle>
          <CardDescription className="text-xs">Cần tính/chứng minh</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {queries.length > 0 ? (
            queries.map((query) => (
              <div
                key={query.id}
                className={`p-3 rounded-lg bg-card border transition-colors cursor-pointer group ${
                  selectedQueryId === query.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/50 hover:bg-card/80'
                }`}
                onClick={() => handleQueryClick(query.id, query.edges)}
                onMouseEnter={() => !selectedQueryId && handleEntityHover(query.edges)}
                onMouseLeave={handleEntityLeave}
              >
                <div className="flex items-start gap-2">
                  <span className="text-accent font-bold text-sm min-w-6">{query.id}.</span>
                  <p
                    className={`text-sm transition-colors ${
                      selectedQueryId === query.id ? 'text-accent' : 'text-foreground group-hover:text-accent'
                    }`}
                  >
                    {query.text}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Chưa có câu hỏi</p>
          )}
        </CardContent>
      </Card>

      {/* 3D Elements Interaction */}
      {geometryData && (
        <Card className="bg-background border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Các thành phần 3D</CardTitle>
            <CardDescription className="text-xs">Hover để highlight</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Cạnh bên</p>
              <div className="flex flex-wrap gap-2">
                {['SA', 'SB', 'SC'].map((edge) => (
                  <Badge
                    key={edge}
                    variant="secondary"
                    className="bg-accent/20 text-accent hover:bg-accent/40 cursor-pointer"
                    onMouseEnter={() => handleEntityHover([`${edge[0]}-${edge[1]}`])}
                    onMouseLeave={handleEntityLeave}
                  >
                    {edge}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Cạnh đáy</p>
              <div className="flex flex-wrap gap-2">
                {['AB', 'BC', 'CA'].map((edge) => (
                  <Badge
                    key={edge}
                    variant="secondary"
                    className="bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 cursor-pointer"
                    onMouseEnter={() => handleEntityHover([`${edge[0]}-${edge[1]}`])}
                    onMouseLeave={handleEntityLeave}
                  >
                    {edge}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis */}
      {geometryData && (
        <Card className="bg-background border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Phân tích hình học</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-3 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Số điểm:</span>
                <Badge variant="outline" className="border-border">
                  {Object.keys(geometryData.points).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Loại hình:</span>
                <Badge variant="outline" className="border-border">
                  Hình chóp
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Trạng thái:</span>
                <Badge className={isConsistent ? 'bg-green-500/20 text-green-700 dark:text-green-200' : 'bg-red-500/20 text-red-700 dark:text-red-200'}>
                  {isConsistent ? 'Hợp lệ' : 'Không hợp lệ'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
