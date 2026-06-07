const fs = require('fs');

const createPyramidReplacement = `  const createPyramid = useCallback(
    (basePolygonId: string, height: number, apexPointId?: string) => {
      if (height <= 0 && !apexPointId) return null
      saveManualState()

      const solidId = createEntityId('solid')
      
      commitManualDocument((current) => {
        let finalApexPointId = apexPointId
        const generatedPoints: ManualPoint[] = []
        const generatedSegments: ManualSegment[] = []
        const generatedPolygons: ManualPolygon[] = []
        let pointsList = [...current.points]

        const poly = current.polygons.find((p) => p.id === basePolygonId)
        if (!poly || poly.pointIds.length < 3) return current // Invalid base

        if (apexPointId === 'auto_generate') {
          const apexId = createEntityId('point')
          finalApexPointId = apexId

          let targetPos: import('@/lib/types').Vec3 = [0, 0, height > 0 ? height : 4]
          const resolved = resolvePointPositions(current)
          const pts = poly.pointIds.map((pid) => resolved[pid] || [0, 0, 0])
          let cx = 0, cy = 0, cz = 0
          pts.forEach((pt) => {
            cx += pt[0]
            cy += pt[1]
            cz += pt[2]
          })
          const N = pts.length
          targetPos = [cx / N, cy / N, cz / N + (height > 0 ? height : 4)]

          const ptS: ManualPoint = {
            id: apexId,
            label: 'S',
            entityType: 'point',
            pointKind: 'free',
            position: targetPos,
            createdByTool: 'pyramid',
            dependsOn: [],
            locked: false,
            visible: true,
            selectable: true,
          }
          generatedPoints.push(ptS)
        }

        if (!finalApexPointId) return current // Should not happen

        // Create edges and faces
        const N = poly.pointIds.length
        for (let i = 0; i < N; i++) {
          const p1 = poly.pointIds[i]
          const p2 = poly.pointIds[(i + 1) % N]
          
          // edge from base to apex
          generatedSegments.push({
            id: createEntityId('segment'),
            label: '',
            entityType: 'segment',
            pointIds: [p1, finalApexPointId],
            createdByTool: 'pyramid',
            dependsOn: [p1, finalApexPointId],
            locked: false,
            visible: true,
            selectable: true
          })

          // triangular face
          generatedPolygons.push({
            id: createEntityId('polygon'),
            label: '',
            entityType: 'polygon',
            pointIds: [p1, p2, finalApexPointId],
            createdByTool: 'pyramid',
            dependsOn: [p1, p2, finalApexPointId],
            locked: false,
            visible: true,
            selectable: true,
            fillColor: '#0f766e',
            opacity: 0.18
          })
        }

        const solid: ManualSolid = {
          id: solidId,
          label: \`Chóp \${current.solids.length + 1}\`,
          entityType: 'solid',
          solidType: 'pyramid',
          basePolygonId,
          height: height > 0 ? height : undefined,
          apexPointId: finalApexPointId,
          childPointIds: generatedPoints.map(p => p.id),
          childSegmentIds: generatedSegments.map(s => s.id),
          childPolygonIds: generatedPolygons.map(p => p.id),
          createdByTool: 'pyramid',
          dependsOn: [basePolygonId, ...(finalApexPointId ? [finalApexPointId] : [])],
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

fs.writeFileSync('replace_pyramid.js', createPyramidReplacement);
console.log('Pyramid Script written.');
