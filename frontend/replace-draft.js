const fs = require('fs');
const path = 'c:/Users/Tln.Ganyu/Desktop/SpatialGeometry/frontend/components/geometry/manual-canvas-3d.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add autoRevertToSelect to stateRefs
content = content.replace(
  /const stateRefs = useRef\(\{ showAxes, showGrid, showSmartGuides \}\)/,
  'const stateRefs = useRef({ showAxes, showGrid, showSmartGuides, autoRevertToSelect })'
);
content = content.replace(
  /stateRefs\.current = \{ showAxes, showGrid, showSmartGuides \}/,
  'stateRefs.current = { showAxes, showGrid, showSmartGuides, autoRevertToSelect }'
);
content = content.replace(
  /}, \[showAxes, showGrid, showSmartGuides\]\)/,
  '}, [showAxes, showGrid, showSmartGuides, autoRevertToSelect])'
);

// We need to replace setDraftOperation({ tool: '...', pointIds: [] ... }) with the auto-revert logic.
// There are multiple variations:
// setDraftOperation({ tool: 'polygon', pointIds: [] })
// setDraftOperation({ tool: 'box', pointIds: [], height })
// setDraftOperation({ tool: 'circle', pointIds: [], height: kindCode, radius: draftOperation?.radius ?? 3 })

const pattern = /setDraftOperation\(\{ tool: ('[^']+'), pointIds: \[\]([^}]*)\}\)/g;

content = content.replace(pattern, (match, toolName, rest) => {
  return `autoRevertToSelect ? setActiveTool('select') : setDraftOperation({ tool: ${toolName}, pointIds: []${rest}})`;
});

// For point creation (activeTool === 'point'), it finishes right away.
// In handlePointerDown, around line 2173:
// const createdPointId = createPointFromTarget(snapTarget, fallback)
// if (createdPointId) { ... }
// We can just add autoRevertToSelect ? setActiveTool('select') : null inside the interaction loop. 
// Wait, point dragging happens right after creation. If we revert to select, the point is still selected and dragging continues perfectly fine because 'select' tool can drag points!
// So let's add the revert to the end of the point creation block.
// But it's easier to just do it on pointer up for points if not dragging?
// No, let's leave 'point' tool alone. Many users want to place multiple points.

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced setDraftOperation completions with auto-revert logic.');
