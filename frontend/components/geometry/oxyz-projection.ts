/** Neo gốc: Đẩy thấp xuống 1/3 dưới màn hình (68%) để hở khoảng không phía trên */
export const ORIGIN_X_RATIO = 0.5
export const ORIGIN_Y_RATIO = 0.68

/** Phối cảnh vừa phải giúp hình chóp không bị xoắn mà vẫn tạo chiều sâu */
export const PERSPECTIVE_DIVISOR = 36

export interface CameraOXyz {
  rotateX: number
  rotateY: number
  zoom: number
  panX: number
  panY: number
}

export interface ProjectedPoint {
  screenX: number
  screenY: number
  z: number
  perspective: number
}

export function projectOXyz(
  ox: number,
  oy: number,
  oz: number,
  canvas: { width: number; height: number },
  cam: CameraOXyz,
): ProjectedPoint {
  const originX = canvas.width * ORIGIN_X_RATIO
  const originY = canvas.height * ORIGIN_Y_RATIO
  const scale = (Math.min(canvas.width, canvas.height) / 15) * cam.zoom

  const x = oy
  const y = oz
  const z = ox

  const cosX = Math.cos(cam.rotateX)
  const sinX = Math.sin(cam.rotateX)
  const y2 = y * cosX - z * sinX
  const z2 = y * sinX + z * cosX

  const cosY = Math.cos(cam.rotateY)
  const sinY = Math.sin(cam.rotateY)
  const x2 = x * cosY + z2 * sinY
  const z3 = -x * sinY + z2 * cosY

  const perspective = 1 + z3 / PERSPECTIVE_DIVISOR
  const screenX = originX + cam.panX + (x2 * scale) / perspective
  const screenY = originY + cam.panY - (y2 * scale) / perspective

  return { screenX, screenY, z: z3, perspective }
}

export function getProjectionOrigin(canvas: { width: number; height: number }) {
  return {
    originX: canvas.width * ORIGIN_X_RATIO,
    originY: canvas.height * ORIGIN_Y_RATIO,
  }
}

/** Căn bbox hình lên tâm canvas (pan), giữ góc nhìn & zoom hiện tại */
export function computeFitPan(
  canvas: { width: number; height: number },
  points: Record<string, [number, number, number]>,
  cam: CameraOXyz,
): { panX: number; panY: number } {
  const coords = Object.values(points)
  if (coords.length === 0) return { panX: 0, panY: 0 }

  const camNoPan: CameraOXyz = { ...cam, panX: 0, panY: 0 }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const [ox, oy, oz] of coords) {
    const p = projectOXyz(ox, oy, oz, canvas, camNoPan)
    minX = Math.min(minX, p.screenX)
    maxX = Math.max(maxX, p.screenX)
    minY = Math.min(minY, p.screenY)
    maxY = Math.max(maxY, p.screenY)
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const { originX, originY } = getProjectionOrigin(canvas)

  return {
    panX: originX - cx,
    panY: originY - cy,
  }
}
