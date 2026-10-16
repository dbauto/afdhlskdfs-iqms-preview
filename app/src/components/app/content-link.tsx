import * as React from "react"
import {
  Link,
  useLocation,
  useResolvedPath,
  type LinkProps,
} from "react-router-dom"

/** Keep the current workspace open when inspecting another page. */
export const ContentLink = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function ContentLink({ target, rel, title, ...props }, ref) {
    const current = useLocation()
    const destination = useResolvedPath(props.to)
    // Query filters and in-page anchors stay within the current workspace.
    const nextTarget =
      target ??
      (destination.pathname !== current.pathname ? "_blank" : undefined)
    const newTab = nextTarget === "_blank"
    return (
      <Link
        {...props}
        ref={ref}
        target={nextTarget}
        rel={
          newTab
            ? [
                ...new Set(
                  `${rel ?? ""} noopener noreferrer`.trim().split(/\s+/),
                ),
              ].join(" ")
            : rel
        }
        title={
          newTab
            ? title
              ? `${title} (opens in a new tab)`
              : "Opens in a new tab"
            : title
        }
        aria-description={
          newTab
            ? [props["aria-description"], "Opens in a new tab."]
                .filter(Boolean)
                .join(" ")
            : props["aria-description"]
        }
      />
    )
  },
)
