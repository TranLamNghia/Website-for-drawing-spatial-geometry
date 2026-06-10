const fs = require('fs');

// Patch manual-editor.ts
const replaceU = `const u = [Math.cos(ring.theta) * Math.cos(ring.phi), Math.cos(ring.theta) * Math.sin(ring.phi), -Math.sin(ring.theta)];
            const v = [-Math.sin(ring.phi), Math.cos(ring.phi), 0];`;

let c1 = fs.readFileSync('frontend/components/geometry/manual-editor.ts', 'utf8');
c1 = c1.replace(/let u: Vec3[\s\S]*?const v = crossVec3\(n, u\)/, replaceU);
fs.writeFileSync('frontend/components/geometry/manual-editor.ts', c1);

// Patch geometry-context.tsx
let c2 = fs.readFileSync('frontend/components/geometry/geometry-context.tsx', 'utf8');
c2 = c2.replace(/let u: Vec3 = \[1, 0, 0\][\s\S]*?const u_len = Math\.hypot\(\.\.\.u_cross\)/g, 
  'const u: Vec3 = [Math.cos(ring.theta) * Math.cos(ring.phi), Math.cos(ring.theta) * Math.sin(ring.phi), -Math.sin(ring.theta)];\n                const w: Vec3 = [-Math.sin(ring.phi), Math.cos(ring.phi), 0];');
fs.writeFileSync('frontend/components/geometry/geometry-context.tsx', c2);

// Patch manual-canvas-3d.tsx
let c3 = fs.readFileSync('frontend/components/geometry/manual-canvas-3d.tsx', 'utf8');
c3 = c3.replace(/let u = new THREE\.Vector3\(1, 0, 0\)[\s\S]*?u = w\.clone\(\)\.cross\(normalVec\)\.normalize\(\)/g, 
  'const u = new THREE.Vector3(Math.cos(ring.theta) * Math.cos(ring.phi), Math.cos(ring.theta) * Math.sin(ring.phi), -Math.sin(ring.theta));\n                      const w = new THREE.Vector3(-Math.sin(ring.phi), Math.cos(ring.phi), 0);');
fs.writeFileSync('frontend/components/geometry/manual-canvas-3d.tsx', c3);

console.log('Fixed frames in all 3 files!');
