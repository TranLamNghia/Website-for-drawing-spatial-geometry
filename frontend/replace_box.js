const fs = require('fs');

const createBoxReplacement = `  const createBox = useCallback(
    (cornerPointIds: [string, string], height: number) => {
      if (height <= 0) return null
      saveManualState()

      const solidId = createEntityId('solid')

      commitManualDocument((current) => {
        const generatedPoints: ManualPoint[] = []
        const generatedSegments: ManualSegment[] = []
        const generatedPolygons: ManualPolygon[] = []
        let pointsList = [...current.points]

        const pA = cornerPointIds[0]
        const pC = cornerPointIds[1]
        
        const ptA = current.points.find(p => p.id === pA)
        const ptC = current.points.find(p => p.id === pC)
        const posA = ptA?.position ?? [0, 0, 0]
        const posC = ptC?.position ?? [0, 0, 0]
        
        const baseZ = posA[2]
        
        const posB: import('@/lib/types').Vec3 = [posC[0], posA[1], baseZ]
        const posD: import('@/lib/types').Vec3 = [posA[0], posC[1], baseZ]
        
        const topZ = baseZ + height
        const posA_top: import('@/lib/types').Vec3 = [posA[0], posA[1], topZ]
        const posB_top: import('@/lib/types').Vec3 = [posB[0], posB[1], topZ]
        const posC_top: import('@/lib/types').Vec3 = [posC[0], posC[1], topZ]
        const posD_top: import('@/lib/types').Vec3 = [posD[0], posD[1], topZ]

        const pB = createEntityId('point')
        const pD = createEntityId('point')
        const pA_top = createEntityId('point')
        const pB_top = createEntityId('point')
        const pC_top = createEntityId('point')
        const pD_top = createEntityId('point')

        const baseLabel = ptA?.label ? ptA.label.charAt(0) : 'H'
        const labelA = ptA?.label ?? 'A'
        const labelC = ptC?.label ?? 'C'
        
        // Try to derive labels B, D, A', B', C', D'
        // To be safe we just use nextPointLabel for B and D, but users usually want A, B, C, D
        const nextLabel = (base: string, offset: number) => {
          const charCode = base.charCodeAt(0) + offset
          return String.fromCharCode(charCode <= 90 ? charCode : 90)
        }
        
        const labelB = labelA.length === 1 ? nextLabel(labelA, 1) : labelA + 'B'
        const labelD = labelC.length === 1 ? nextLabel(labelC, 1) : labelC + 'D'

        const createP = (id: string, pos: import('@/lib/types').Vec3, label: string): ManualPoint => ({
          id, label, entityType: 'point', pointKind: 'free', position: pos, createdByTool: 'box', dependsOn: [], locked: false, visible: true, selectable: true
        })

        generatedPoints.push(createP(pB, posB, labelB))
        generatedPoints.push(createP(pD, posD, labelD))
        generatedPoints.push(createP(pA_top, posA_top, labelA + "'"))
        generatedPoints.push(createP(pB_top, posB_top, labelB + "'"))
        generatedPoints.push(createP(pC_top, posC_top, labelC + "'"))
        generatedPoints.push(createP(pD_top, posD_top, labelD + "'"))

        const createS = (p1: string, p2: string): ManualSegment => ({
          id: createEntityId('segment'), label: '', entityType: 'segment', pointIds: [p1, p2], createdByTool: 'box', dependsOn: [p1, p2], locked: false, visible: true, selectable: true
        })

        const edges = [
          createS(pA, pB), createS(pB, pC), createS(pC, pD), createS(pD, pA), // Base
          createS(pA_top, pB_top), createS(pB_top, pC_top), createS(pC_top, pD_top), createS(pD_top, pA_top), // Top
          createS(pA, pA_top), createS(pB, pB_top), createS(pC, pC_top), createS(pD, pD_top) // Vertical
        ]
        generatedSegments.push(...edges)

        const createF = (pts: string[]): ManualPolygon => ({
          id: createEntityId('polygon'), label: '', entityType: 'polygon', pointIds: pts, createdByTool: 'box', dependsOn: pts, locked: false, visible: true, selectable: true,
          fillColor: '#0f766e', opacity: 0.18
        })

        const faces = [
          createF([pA, pB, pC, pD]), // Bottom
          createF([pA_top, pB_top, pC_top, pD_top]), // Top
          createF([pA, pB, pB_top, pA_top]), // Front
          createF([pB, pC, pC_top, pB_top]), // Right
          createF([pC, pD, pD_top, pC_top]), // Back
          createF([pD, pA, pA_top, pD_top])  // Left
        ]
        generatedPolygons.push(...faces)

        const solid: ManualSolid = {
          id: solidId,
          label: \`Hộp \${current.solids.length + 1}\`,
          entityType: 'solid',
          solidType: 'box',
          height,
          cornerPointIds,
          childPointIds: generatedPoints.map(p => p.id),
          childSegmentIds: generatedSegments.map(s => s.id),
          childPolygonIds: generatedPolygons.map(p => p.id),
          createdByTool: 'box',
          dependsOn: [...cornerPointIds],
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

fs.writeFileSync('replace_box.js', createBoxReplacement);
console.log('Script written.');
