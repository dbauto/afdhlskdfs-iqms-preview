import {
  FilesIcon,
  LandmarkIcon,
  LayoutGridIcon,
  ListTodoIcon,
  ListChecksIcon,
  PaperclipIcon,
  PresentationIcon,
  SearchCheckIcon,
  ShieldAlertIcon,
  type LucideIcon,
} from "lucide-react"

import type { Area } from "@/data/types"

export interface NavChild {
  label: string
  to: string
  area: Area
  count?: number
}

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  area: Area
  count?: number
  children?: NavChild[]
  /** QMS starts open, Documents starts closed, as in the client's menu */
  defaultOpen?: boolean
}

/** The client's menu, in the client's order and wording. */
export const NAV: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutGridIcon, area: "Overview" },
  /** count comes from the person's tasks, not a fixed number */
  { label: "My tasks", to: "/my-tasks", icon: ListTodoIcon, area: "Overview" },
  {
    label: "QMS",
    to: "/qms/processes",
    icon: LandmarkIcon,
    area: "QMS",
    defaultOpen: true,
    children: [
      { label: "Organization & Scope", to: "/qms/organization", area: "Organization & Scope" },
      { label: "Policies", to: "/qms/policies", area: "Policies" },
      { label: "Processes", to: "/qms/processes", area: "Processes" },
      { label: "Objectives & KPIs", to: "/qms/objectives", area: "Objectives & KPIs" },
    ],
  },
  {
    label: "Documents",
    to: "/documents",
    icon: FilesIcon,
    area: "Documents",
    count: 5,
    children: [
      { label: "Register", to: "/documents", area: "Documents" },
      { label: "Reviews", to: "/documents/reviews", area: "Documents", count: 5 },
    ],
  },
  { label: "Risks & Opportunities", to: "/risks", icon: ShieldAlertIcon, area: "Risks & Opportunities" },
  { label: "Evidence", to: "/evidence", icon: PaperclipIcon, area: "Evidence" },
  { label: "Audits", to: "/audits", icon: SearchCheckIcon, area: "Audits", count: 1 },
  { label: "Management Review", to: "/management-review", icon: PresentationIcon, area: "Management Review" },
  { label: "Corrective Action", to: "/corrective-action", icon: ListChecksIcon, area: "Corrective Action" },
]
