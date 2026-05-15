// Dev-only sanity checks for the solve mapping.
// Run manually from browser console if needed:
//   import { validateSolveFixtures } from '@/components/geometry/solve/dev-validate-fixtures'
//   validateSolveFixtures()

import { mapBackendResultToGeometryData } from './solve-logic'

import caseBasic from './fixtures/case-basic.json'
import caseSections from './fixtures/case-sections.json'
import caseRoundSolids from './fixtures/case-round-solids.json'

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg)
}

export function validateSolveFixtures() {
  const cases: any[] = [caseBasic, caseSections, caseRoundSolids]
  for (const c of cases) {
    const mapped = mapBackendResultToGeometryData(c)
    assert(mapped.points && Object.keys(mapped.points).length > 0, 'points must be non-empty')
    if (mapped.edges) {
      for (const e of mapped.edges) {
        assert(typeof e === 'string' && e.includes('-'), `edge must be A-B format: ${String(e)}`)
      }
    }
    assert(mapped.is_consistent === (c.validation?.allPassed ?? true), 'is_consistent must match validation.allPassed')
  }
  return { ok: true, count: cases.length }
}

