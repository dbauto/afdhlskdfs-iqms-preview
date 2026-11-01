/**
 * Sign-in providers shown in the platform console (ADR-047, plan v3 D7–D9).
 *
 * Microsoft Entra ID is planned as one platform-managed multi-tenant app registration per environment,
 * with each client's allowed tenants configured separately. Nothing here holds credentials: client IDs,
 * certificates and secrets live only in the server's secret store and are never sent to the browser.
 *
 * The status comes only from the backend's own validation of that configuration. This preview has no
 * backend, so there is no validation record and Microsoft stays "Not configured". Never set "Connected"
 * from the browser, from a button press, or from sample data.
 */
export type EntraStatus = "Not configured" | "Check failed" | "Connected"

/** what the backend returns after it has checked the Entra configuration for one environment (Pending) */
export interface EntraValidation {
  environment: "sandbox" | "staging" | "production"
  /** server time of the last successful metadata, signing key and redirect URI check */
  validatedAt: string | null
  /** plain-language reason when the last check failed */
  problem?: string
}

export const ENVIRONMENTS = ["Sandbox", "Staging", "Production"] as const

/** No backend in the preview, so no validation record exists. */
export function entraValidation(_env: (typeof ENVIRONMENTS)[number]): EntraValidation | null {
  return null
}

export function entraStatus(v: EntraValidation | null): EntraStatus {
  if (!v) return "Not configured"
  if (v.problem) return "Check failed"
  return v.validatedAt ? "Connected" : "Not configured"
}

/** Microsoft sign-in is offered only when the server has validated the configuration. */
export const microsoftSignInEnabled = (v: EntraValidation | null) => entraStatus(v) === "Connected"
