const fs = require('fs');
const path = 'c:/Users/Tln.Ganyu/Desktop/SpatialGeometry/frontend/components/geometry/manual-canvas-3d.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace setDraftOperation(null) with the auto-revert logic
// We need to be careful not to replace it if it's already inside autoRevertToSelect
content = content.replace(/setDraftOperation\(null\)/g, "autoRevertToSelect ? setActiveTool('select') : setDraftOperation(null)");

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced setDraftOperation(null) with auto-revert logic.');
