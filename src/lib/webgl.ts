let supported: boolean | undefined

/** True when the browser can create a WebGL context. Checked once, lazily. */
export function supportsWebGL(): boolean {
  if (supported !== undefined) return supported
  try {
    const c = document.createElement('canvas')
    supported = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    supported = false
  }
  return supported
}
