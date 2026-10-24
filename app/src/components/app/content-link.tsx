import * as React from "react"
import { isCrossSectionLink } from "@/lib/navigation-target"
import {
  Link,
  useLocation,
  useResolvedPath,
  type LinkProps,
} from "react-router-dom"

/** Stay in the current tab within a section; preserve the workspace for cross-section links. */
export const ContentLink = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function ContentLink({ target, rel, title, ...props }, ref) {
    const current = useLocation()
    const destination = useResolvedPath(props.to)
    // Explicit targets are respected. Otherwise record navigation inside the
    // current section stays in place; links to another section open a new tab.
    const nextTarget = target ?? (isCrossSectionLink(current.pathname, destination.pathname) ? "_blank" : undefined)
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
