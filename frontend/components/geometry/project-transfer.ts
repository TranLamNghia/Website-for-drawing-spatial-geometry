'use client'

import type { SavedProject } from '@/hooks/use-project-store'

const TRANSFER_KEY = 'geometry_transferred_project_v1'

let cachedProject: SavedProject | null = null

function parseProject(raw: string | null): SavedProject | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SavedProject
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.id !== 'string' || typeof parsed.geometryJson !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function stashTransferredProject(project: SavedProject) {
  cachedProject = project
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TRANSFER_KEY, JSON.stringify(project))
  } catch {
    // Ignore storage failures; the in-memory cache still supports same-session navigation.
  }
}

export function readTransferredProject(): SavedProject | null {
  if (cachedProject) return cachedProject
  if (typeof window === 'undefined') return null

  const project = parseProject(localStorage.getItem(TRANSFER_KEY))
  if (project) cachedProject = project
  return project
}

export function clearTransferredProjectStorage() {
  if (typeof window === 'undefined') return
  try {
    localStorage.clear()
  } catch {
    // Ignore.
  }
}
