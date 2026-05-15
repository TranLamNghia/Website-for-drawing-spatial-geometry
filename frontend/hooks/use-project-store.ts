'use client'

import { useState, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type SavedProject = {
    id: string
    name: string
    problemText: string
    geometryJson: string
    createdAt: string
    updatedAt: string
    thumbnail?: string
}

export const MAX_PROJECTS = 10
const STORAGE_KEY = 'geometry_projects'

// ─────────────────────────────────────────────────────────────
// Utility helpers (pure, can be used outside of hook)
// ─────────────────────────────────────────────────────────────
function readStorage(): SavedProject[] {
    if (typeof window === 'undefined') return []
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

function writeStorage(projects: SavedProject[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function buildProject(
    name: string,
    problemText: string,
    geometryJson: string,
    thumbnail?: string,
): SavedProject {
    return {
        id: crypto.randomUUID(),
        name,
        problemText,
        geometryJson,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnail,
    }
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
export function useProjectStore() {
    const [projects, setProjects] = useState<SavedProject[]>([])

    // Hydrate from localStorage on mount
    useEffect(() => {
        setProjects(readStorage())
    }, [])

    const isLimitReached = projects.length >= MAX_PROJECTS

    /** Add a new project. Returns false if limit is reached. */
    const addProject = useCallback((project: SavedProject): boolean => {
        const current = readStorage()
        if (current.length >= MAX_PROJECTS) return false
        const updated = [project, ...current]
        writeStorage(updated)
        setProjects(updated)
        return true
    }, [])

    /** Delete a project by ID. */
    const deleteProject = useCallback((id: string) => {
        setProjects(prev => {
            const updated = prev.filter(p => p.id !== id)
            writeStorage(updated)
            return updated
        })
    }, [])

    /** Rename an existing project. */
    const renameProject = useCallback((id: string, newName: string) => {
        setProjects(prev => {
            const updated = prev.map(p =>
                p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p,
            )
            writeStorage(updated)
            return updated
        })
    }, [])

    /** Update thumbnail of an existing project. */
    const updateThumbnail = useCallback((id: string, thumbnail: string) => {
        setProjects(prev => {
            const updated = prev.map(p =>
                p.id === id ? { ...p, thumbnail, updatedAt: new Date().toISOString() } : p,
            )
            writeStorage(updated)
            return updated
        })
    }, [])

    /** Force-reload from localStorage (useful after external writes). */
    const refresh = useCallback(() => {
        setProjects(readStorage())
    }, [])

    return {
        projects,
        isLimitReached,
        addProject,
        deleteProject,
        renameProject,
        updateThumbnail,
        refresh,
    }
}

// Re-export raw helpers so legacy callers in solver-view/dashboard-view can still use them
export { readStorage as loadProjects, writeStorage as saveProjects }
