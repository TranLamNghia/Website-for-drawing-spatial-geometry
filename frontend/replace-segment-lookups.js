const fs = require('fs');
const path = 'c:/Users/Tln.Ganyu/Desktop/SpatialGeometry/frontend/components/geometry/manual-editor.ts';
let content = fs.readFileSync(path, 'utf8');

// Insert resolveSegmentEndpoints after positions definition
const helper = `
  const resolveSegmentEndpoints = (segId: string, visiting: Set<string>): [Vec3, Vec3] | null => {
    const seg = document.segments.find((s) => s.id === segId)
    if (seg) {
      return [resolvePoint(seg.startPointId, visiting), resolvePoint(seg.endPointId, visiting)]
    }
    if (segId.includes('_edge_')) {
      const match = segId.match(/^(.*)_edge_(\\d+)$/)
      if (match) {
        const polyId = match[1]
        const edgeIdx = parseInt(match[2], 10)
        const poly = document.polygons.find(p => p.id === polyId)
        if (poly && poly.pointIds.length > edgeIdx) {
          const p1Id = poly.pointIds[edgeIdx]
          const p2Id = poly.pointIds[(edgeIdx + 1) % poly.pointIds.length]
          return [resolvePoint(p1Id, visiting), resolvePoint(p2Id, visiting)]
        }
      }
    }
    return null
  }
`;

content = content.replace(
  /const resolvePoint = \(pointId: string, visiting = new Set<string>\(\)\): Vec3 => \{/,
  helper + '\n  const resolvePoint = (pointId: string, visiting = new Set<string>()): Vec3 => {'
);

// Replace segment lookup in 'segment' pointKind
content = content.replace(
  /const segment = document\.segments\.find\(\(candidate\) => candidate\.id === point\.segmentId\)\n\s+if \(segment\) \{\n\s+const start = resolvePoint\(segment\.startPointId, visiting\)\n\s+const end = resolvePoint\(segment\.endPointId, visiting\)/,
  `const endpoints = resolveSegmentEndpoints(point.segmentId, visiting)\n      if (endpoints) {\n        const [start, end] = endpoints`
);

// Replace segment lookup in 'intersection'
content = content.replace(
  /const segA = document\.segments\.find\(\(s\) => s\.id === point\.sourceSegmentIds!\[0\]\)\n\s+const segB = document\.segments\.find\(\(s\) => s\.id === point\.sourceSegmentIds!\[1\]\)\n\s+if \(segA && segB\) \{\n\s+const a1 = resolvePoint\(segA\.startPointId, visiting\)\n\s+const a2 = resolvePoint\(segA\.endPointId, visiting\)\n\s+const b1 = resolvePoint\(segB\.startPointId, visiting\)\n\s+const b2 = resolvePoint\(segB\.endPointId, visiting\)/,
  `const epsA = resolveSegmentEndpoints(point.sourceSegmentIds![0], visiting)\n      const epsB = resolveSegmentEndpoints(point.sourceSegmentIds![1], visiting)\n      if (epsA && epsB) {\n        const [a1, a2] = epsA\n        const [b1, b2] = epsB`
);

// Replace segment lookup in 'projection'
content = content.replace(
  /const seg = document\.segments\.find\(\(s\) => s\.id === point\.targetSegmentId\)\n\s+if \(seg\) \{\n\s+const src = resolvePoint\(point\.sourcePointId, visiting\)\n\s+const ls = resolvePoint\(seg\.startPointId, visiting\)\n\s+const le = resolvePoint\(seg\.endPointId, visiting\)/,
  `const eps = resolveSegmentEndpoints(point.targetSegmentId, visiting)\n        if (eps) {\n          const src = resolvePoint(point.sourcePointId, visiting)\n          const [ls, le] = eps`
);

// Replace segment lookup in 'perpendicularLinePoint'
content = content.replace(
  /const seg = document\.segments\.find\(\(s\) => s\.id === point\.sourceSegmentId\)\n\s+if \(seg\) \{\n\s+const posStart = resolvePoint\(seg\.startPointId, visiting\)\n\s+const posEnd = resolvePoint\(seg\.endPointId, visiting\)/,
  `const eps = resolveSegmentEndpoints(point.sourceSegmentId, visiting)\n      if (eps) {\n        const [posStart, posEnd] = eps`
);

// Replace segment lookup in 'parallelLinePoint' (which is not in the file I saw, but just in case it exists, wait, it resolves using resolvePoint, not resolveSegmentEndpoints? Ah, parallelLinePoint doesn't use the segment endpoints directly, it just creates a line parallel to the segment! Wait, parallelLinePoint is a 'pointKind'? Let's check manual-editor.ts)
// Wait! Let's check parallelLinePoint logic inside resolvePointPositions. It's actually NOT there? It might be 'segment' or similar. 
// Let's just save this script and run it, then we can check if it worked and if parallelLinePoint needs fixing.

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced segment lookups with resolveSegmentEndpoints');
