import { useSyncExternalStore } from 'react'

export type Mode = 'room' | 'brain'

interface Location {
  path: string
  mode: Mode
}

const listeners = new Set<() => void>()
let snapshot = read()

function read(): Location {
  const params = new URLSearchParams(window.location.search)
  return {
    path: window.location.pathname.replace(/\/+$/, '') || '/',
    mode: params.get('mode') === 'brain' ? 'brain' : 'room',
  }
}

function emit() {
  const next = read()
  if (next.path !== snapshot.path || next.mode !== snapshot.mode) {
    snapshot = next
    listeners.forEach((l) => l())
  }
}

window.addEventListener('popstate', emit)

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function href(path: string, mode: Mode) {
  return mode === 'brain' ? `${path}?mode=brain` : path
}

/**
 * Open a route from inside the app. Marks the entry so closing can step back.
 * Links between panels replace instead, so closing always lands on the scene.
 */
export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (path === snapshot.path) return
  if (opts.replace) {
    const state = window.history.state as { fromApp?: boolean } | null
    window.history.replaceState({ fromApp: !!state?.fromApp }, '', href(path, snapshot.mode))
  } else {
    window.history.pushState({ fromApp: true }, '', href(path, snapshot.mode))
  }
  emit()
}

/** Return to the scene. Steps back if the panel was opened in-app, so Back never reopens it. */
export function closeToScene() {
  if (snapshot.path === '/') return
  if ((window.history.state as { fromApp?: boolean } | null)?.fromApp) {
    window.history.back()
  } else {
    window.history.replaceState(null, '', href('/', snapshot.mode))
    emit()
  }
}

export function setMode(mode: Mode) {
  if (mode === snapshot.mode) return
  window.history.replaceState(window.history.state, '', href(snapshot.path, mode))
  emit()
}

export function useLocation(): Location {
  return useSyncExternalStore(subscribe, () => snapshot)
}
