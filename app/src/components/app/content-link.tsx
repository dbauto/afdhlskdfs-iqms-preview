import * as React from "react"
import {
  Link,
  useLocation,
  useResolvedPath,
  type LinkProps,
} from "react-router-dom"

/** Open linked records in a new tab only when they belong to a different menu area. */
export function menuArea(pathname: string): string {
  if (pathname.startsWith("/qms/procedures")) return "documents"
  if (pathname.startsWith("/qms/processes")) return "processes"
  if (pathname.startsWith("/qms/objectives")) return "objectives"
  if (pathname.startsWith("/qms/organization")) return "organization"
  if (pathname.startsWith("/qms/policies")) return "policies"
  const area = pathname.split("/").filter(Boolean)[0] ?? "overview"
  return area === "corrective-action" ? "corrective-action" : area
}

/** Keep drill-downs within their own menu area; linked cross-module records open separately. */
export const ContentLink = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function ContentLink({ target, rel, title, ...props }, ref) {
    const current = useLocation()
    const destination = useResolvedPath(props.to)
    // Query filters and in-page anchors stay within the current workspace.
    const nextTarget =
      target ??
      (menuArea(destination.pathname) !== menuArea(current.pathname) ? "_blank" : undefined)
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
