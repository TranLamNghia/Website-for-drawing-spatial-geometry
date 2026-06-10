const fs = require('fs');
let c = fs.readFileSync('frontend/components/geometry/manual-canvas-3d.tsx', 'utf8');

// Fix memoization
c = c.replace(
  /target=\{\{ kind: 'sphereRingPoint', id: point\.id, solidId: point\.solidId, sphereRingId: point\.sphereRingId \}\} as ManualSnapTarget/g,
  'target={React.useMemo(() => ({ kind: \'sphereRingPoint\', id: point.id, solidId: point.solidId, sphereRingId: point.sphereRingId } as ManualSnapTarget), [point.id, point.solidId, point.sphereRingId])}'
);

// Fix initialization of prevAngleRef on pointer down
c = c.replace(
  /if \(point\.pointKind === 'sphereRingPoint' \|\| point\.pointKind === 'sphereAngleDependent'\) \{/g,
  'if (point.pointKind === \'sphereRingPoint\' || point.pointKind === \'sphereAngleDependent\') {\n          if (point.angle !== undefined) prevAngleRef.current = point.angle;'
);

fs.writeFileSync('frontend/components/geometry/manual-canvas-3d.tsx', c);
console.log('Fixed manual-canvas-3d.tsx');
