import * as React from "react"

/** Keep unsaved form text until the person explicitly discards it. No nested modal. */
export function useDraftClose(dirty: boolean, close: () => void) {
  const [discarding, setDiscarding] = React.useState(false)
  React.useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
  return {
    discarding,
    keep: () => setDiscarding(false),
    discard: () => {
      setDiscarding(false)
      close()
    },
    requestClose: () => {
      if (dirty) setDiscarding(true)
      else close()
    },
  }
}
