const fs = require('fs');

// Fix geometry-context.tsx
let ctx = fs.readFileSync('frontend/components/geometry/geometry-context.tsx', 'utf8');
const oldBlock1 = `let u: Vec3 = [1, 0, 0]
                if (Math.abs(dotVec3(normalVec, u)) > 0.9) u = [0, 1, 0]
                
                const w_cross = crossVec3(normalVec, u)
                const w_len = Math.hypot(...w_cross)
                const w = w_len > 1e-9 ? scaleVec3(w_cross, 1 / w_len) : [0, 1, 0] as Vec3
                
                const u_cross = crossVec3(w, normalVec)
                const u_len = Math.hypot(...u_cross)
                u = u_len > 1e-9 ? scaleVec3(u_cross, 1 / u_len) : [1, 0, 0] as Vec3`;

const oldBlock2 = `let u: Vec3 = [1, 0, 0]
              if (Math.abs(dotVec3(normalVec, u)) > 0.9) u = [0, 1, 0]
              
              const w_cross = crossVec3(normalVec, u)
              const w_len = Math.hypot(...w_cross)
              const w = w_len > 1e-9 ? scaleVec3(w_cross, 1 / w_len) : [0, 1, 0] as Vec3
              
              const u_cross = crossVec3(w, normalVec)
              const u_len = Math.hypot(...u_cross)
              u = u_len > 1e-9 ? scaleVec3(u_cross, 1 / u_len) : [1, 0, 0] as Vec3`;

const newBlock = `const u: Vec3 = [Math.cos(ring.theta) * Math.cos(ring.phi), Math.cos(ring.theta) * Math.sin(ring.phi), -Math.sin(ring.theta)];
                const w: Vec3 = [-Math.sin(ring.phi), Math.cos(ring.phi), 0];`;

const newBlock2 = `const u: Vec3 = [Math.cos(ring.theta) * Math.cos(ring.phi), Math.cos(ring.theta) * Math.sin(ring.phi), -Math.sin(ring.theta)];
              const w: Vec3 = [-Math.sin(ring.phi), Math.cos(ring.phi), 0];`;

ctx = ctx.split(oldBlock1).join(newBlock);
ctx = ctx.split(oldBlock2).join(newBlock2);
fs.writeFileSync('frontend/components/geometry/geometry-context.tsx', ctx);

// Fix manual-canvas-3d.tsx
let can = fs.readFileSync('frontend/components/geometry/manual-canvas-3d.tsx', 'utf8');
const oldCan = `let u = new THREE.Vector3(1, 0, 0)
                      if (Math.abs(normalVec.dot(u)) > 0.9) u.set(0, 1, 0)
                      const w = normalVec.clone().cross(u).normalize()
                      u = w.clone().cross(normalVec).normalize()`;
const newCan = `const u = new THREE.Vector3(Math.cos(ring.theta) * Math.cos(ring.phi), Math.cos(ring.theta) * Math.sin(ring.phi), -Math.sin(ring.theta));
                      const w = new THREE.Vector3(-Math.sin(ring.phi), Math.cos(ring.phi), 0);`;
can = can.split(oldCan).join(newCan);
fs.writeFileSync('frontend/components/geometry/manual-canvas-3d.tsx', can);

console.log('Fixed geometry and canvas!');
