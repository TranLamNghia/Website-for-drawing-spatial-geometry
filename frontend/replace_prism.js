const fs = require('fs');

const createPrismReplacement = `  const createPrism = useCallback(
    (basePolygonId: string, height: number, topPointId?: string) => {
      if (height <= 0 && !topPointId) return null
      saveManualState()

      const solidId = createEntityId('solid')

      commitManualDocument((current) => {
        let finalTopPointId = topPointId
        const generatedPoints: ManualPoint[] = []
        const generatedSegments: ManualSegment[] = []
        const generatedPolygons: ManualPolygon[] = []
        let pointsList = [...current.points]

        const poly = current.polygons.find((p) => p.id === basePolygonId)
        if (!poly || poly.pointIds.length < 3) return current // Invalid base

        const resolved = resolvePointPositions(current)
        const pts = poly.pointIds.map((pid) => resolved[pid] || [0, 0, 0])
        const firstPt = pts[0]

        if (topPointId === 'auto_generate') {
          const topId = createEntityId('point')
          finalTopPointId = topId

          const targetPos: import('@/lib/types').Vec3 = [firstPt[0], firstPt[1], firstPt[2] + (height > 0 ? height : 4)]

          const baseFirstPtLabel = poly && poly.pointIds.length > 0
            ? current.points.find(p => p.id === poly.pointIds[0])?.label ?? 'A'
            : 'A'

          const ptS: ManualPoint = {
            id: topId,
            label: \`\${baseFirstPtLabel}'\`,
            entityType: 'point',
            pointKind: 'free',
            position: targetPos,
            createdByTool: 'prism',
            dependsOn: [],
            locked: false,
            visible: true,
            selectable: true,
          }
          generatedPoints.push(ptS)
        }

        if (!finalTopPointId) return current

        // Calculate translation vector
        const finalTopPos = finalTopPointId === 'auto_generate' 
           ? [firstPt[0], firstPt[1], firstPt[2] + (height > 0 ? height : 4)]
           : resolved[finalTopPointId] || generatedPoints[0]?.position || [0, 0, 0]
        
        const tx = finalTopPos[0] - firstPt[0]
        const ty = finalTopPos[1] - firstPt[1]
        const tz = finalTopPos[2] - firstPt[2]

        const topPointIds: string[] = []
        const N = poly.pointIds.length

        // Generate the rest of top points
        for (let i = 0; i < N; i++) {
          const basePid = poly.pointIds[i]
          if (i === 0 && finalTopPointId === generatedPoints[0]?.id) {
            topPointIds.push(finalTopPointId)
          } else {
            // we need to generate it
            const topId = createEntityId('point')
            topPointIds.push(topId)
            const basePos = pts[i]
            const baseLabel = current.points.find(p => p.id === basePid)?.label ?? String.fromCharCode(65 + i)
            generatedPoints.push({
              id: topId,
              label: \`\${baseLabel}'\`,
              entityType: 'point',
              pointKind: 'free',
              position: [basePos[0] + tx, basePos[1] + ty, basePos[2] + tz],
              createdByTool: 'prism',
              dependsOn: [],
              locked: false,
              visible: true,
              selectable: true
            })
          }
        }

        // Generate edges and side faces
        for (let i = 0; i < N; i++) {
          const p1 = poly.pointIds[i]
          const p2 = poly.pointIds[(i + 1) % N]
          const t1 = topPointIds[i]
          const t2 = topPointIds[(i + 1) % N]

          // vertical edge
          generatedSegments.push({
            id: createEntityId('segment'), label: '', entityType: 'segment', pointIds: [p1, t1], createdByTool: 'prism', dependsOn: [p1, t1], locked: false, visible: true, selectable: true
          })
          
          // top edge
          generatedSegments.push({
            id: createEntityId('segment'), label: '', entityType: 'segment', pointIds: [t1, t2], createdByTool: 'prism', dependsOn: [t1, t2], locked: false, visible: true, selectable: true
          })

          // side face
          generatedPolygons.push({
            id: createEntityId('polygon'), label: '', entityType: 'polygon', pointIds: [p1, p2, t2, t1], createdByTool: 'prism', dependsOn: [p1, p2, t2, t1], locked: false, visible: true, selectable: true, fillColor: '#0f766e', opacity: 0.18
          })
        }

        // top face
        generatedPolygons.push({
          id: createEntityId('polygon'), label: '', entityType: 'polygon', pointIds: topPointIds, createdByTool: 'prism', dependsOn: topPointIds, locked: false, visible: true, selectable: true, fillColor: '#0f766e', opacity: 0.18
        })

        const solid: ManualSolid = {
          id: solidId,
          label: \`Lăng trụ \${current.solids.length + 1}\`,
          entityType: 'solid',
          solidType: 'prism',
          basePolygonId,
          height: height > 0 ? height : undefined,
          topPointId: finalTopPointId,
          childPointIds: generatedPoints.map(p => p.id),
          childSegmentIds: generatedSegments.map(s => s.id),
          childPolygonIds: generatedPolygons.map(p => p.id),
          createdByTool: 'prism',
          dependsOn: [basePolygonId, ...(finalTopPointId ? [finalTopPointId] : [])],
          locked: false,
          visible: true,
          selectable: true,
        }

        return {
          ...current,
          points: [...pointsList, ...generatedPoints],
          segments: [...current.segments, ...generatedSegments],
          polygons: [...current.polygons, ...generatedPolygons],
          solids: [...current.solids, solid],
        }
      })
      setManualSelection({ kind: 'solid', id: solidId })
      return solidId
    },
    [commitManualDocument, saveManualState],
  )`;

fs.writeFileSync('replace_prism.js', createPrismReplacement);
console.log('Prism Script written.');
