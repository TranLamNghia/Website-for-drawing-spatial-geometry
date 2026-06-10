const fs = require('fs');

let code = fs.readFileSync('frontend/components/geometry/manual-canvas-3d.tsx', 'utf8');

// Fix 1: Memoize target
code = code.split(
  "target={{ kind: 'sphereRingPoint', id: point.id, solidId: point.solidId, sphereRingId: point.sphereRingId }}"
).join(
  "target={React.useMemo(() => ({ kind: 'sphereRingPoint', id: point.id, solidId: point.solidId, sphereRingId: point.sphereRingId } as ManualSnapTarget), [point.id, point.solidId, point.sphereRingId])}"
);

// Fix 2: Initialize prevAngleRef.current on onPointerDown
code = code.split(
  "if ((point.pointKind === 'sphereRingPoint' || point.pointKind === 'sphereAngleDependent') && point.solidId && point.sphereRingId) {"
).join(
  "if ((point.pointKind === 'sphereRingPoint' || point.pointKind === 'sphereAngleDependent') && point.solidId && point.sphereRingId) {\n          if (point.angle !== undefined) prevAngleRef.current = point.angle;"
);

fs.writeFileSync('frontend/components/geometry/manual-canvas-3d.tsx', code);
console.log("Successfully patched manual-canvas-3d.tsx");
