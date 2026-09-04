/**
 * Single-instance lock for the Electron main process.
 *
 * A second launch must focus the running window, not spawn a twin that
 * fights over camera/mic/PeerJS ids (two live instances each hold "live"
 * device tracks while starving each other => zero outbound RTP with
 * everything looking healthy). Extracted with injected deps so the deploy
 * suite can prove the wiring without booting Electron.
 */
export interface SingleInstanceDeps {
  requestLock: () => boolean
  quit: () => void
  onSecondInstance: (cb: () => void) => void
  getWindows: () => Array<{
    isMinimized: () => boolean
    restore: () => void
    focus: () => void
  }>
}

/** Returns true when this process owns the lock and may boot. */
export function setupSingleInstanceLock(deps: SingleInstanceDeps): boolean {
  if (!deps.requestLock()) {
    deps.quit()
    return false
  }
  deps.onSecondInstance(() => {
    const win = deps.getWindows()[0]
    if (!win) return
    try {
      if (win.isMinimized()) win.restore()
    } catch {}
    try {
      win.focus()
    } catch {}
  })
  return true
}
