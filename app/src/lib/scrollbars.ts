/**
 * Scrollbars appear only while something scrolls, then fade out 300 ms after scrolling stops.
 * Works for the page and every scrolling panel (tables, side panels, menus), up-down and left-right.
 * The look is in index.css (.is-scrolling and --scrollbar-thumb).
 */
const HIDE_AFTER_MS = 300

export function autoHideScrollbars() {
  const timers = new WeakMap<Element, number>()
  const onScroll = (e: Event) => {
    const el = e.target === document ? document.documentElement : (e.target as Element)
    if (!(el instanceof Element)) return
    el.classList.add("is-scrolling")
    window.clearTimeout(timers.get(el))
    timers.set(
      el,
      window.setTimeout(() => el.classList.remove("is-scrolling"), HIDE_AFTER_MS)
    )
  }
  // capture: scroll events don't bubble, so listen on the way down to catch every container
  document.addEventListener("scroll", onScroll, { capture: true, passive: true })
  return () => document.removeEventListener("scroll", onScroll, { capture: true })
}
