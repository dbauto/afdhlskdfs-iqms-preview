import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Building2Icon, ChevronLeftIcon, ShieldCheckIcon, UserPlusIcon } from "lucide-react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "./auth-layout"

/**
 * Prototype of what happens after "Continue with Microsoft 365".
 * In the real app the browser goes to Microsoft's own sign-in page (Entra ID, OpenID Connect)
 * and comes back to /auth/callback. ThryveMS then looks at the person's company (the tenant ID)
 * and their email, and shows one of these outcomes.
 * With Google, ThryveMS asks only for openid, email and profile, signs in an existing account whose
 * email matches Google's verified email, and never creates an account or a membership.
 */
type Outcome = "pick" | "consent" | "unknown-company" | "no-account"

export default function MicrosoftSignIn({ provider = "Microsoft 365" }: { provider?: "Microsoft 365" | "Google" }) {
  const navigate = useNavigate()
  const [o, setO] = React.useState<Outcome>("pick")
  const google = provider === "Google"

  return (
    <AuthLayout>
      <Link to="/sign-in" className="flex items-center gap-1.5 self-start text-[0.8125rem] font-medium text-primary">
        <ChevronLeftIcon className="size-4" /> Back to sign in
      </Link>

      {o === "pick" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.015em]">Signing in with {provider}</h1>
            <p className="text-sm leading-normal text-muted-foreground">In the real app, {google ? "Google’s" : "Microsoft’s"} own sign-in page opens here. Choose what happens next to see each screen.</p>
          </div>
          <div className="flex flex-col gap-2">
            {(google
              ? [
                  { k: "ok", icon: ShieldCheckIcon, t: "Signed in, email matches an active account", d: "Goes straight to the Overview." },
                  { k: "no-account", icon: UserPlusIcon, t: "Google account has no ThryveMS account", d: "Signing in with Google never creates an account. They can ask their administrator for access." },
                  { k: "unknown-company", icon: Building2Icon, t: "Email isn’t verified by Google", d: "ThryveMS only accepts Google accounts with a verified email." },
                ]
              : [
                  { k: "ok", icon: ShieldCheckIcon, t: "Signed in, account is active", d: "Goes straight to the Overview." },
                  { k: "consent", icon: ShieldCheckIcon, t: "First person from a company", d: "Microsoft asks the person, or their IT admin, to approve ThryveMS once." },
                  { k: "no-account", icon: UserPlusIcon, t: "Company uses ThryveMS, person has no account", d: "They can ask their administrator for access." },
                  { k: "unknown-company", icon: Building2Icon, t: "Company doesn’t use ThryveMS", d: "Explains how to get started." },
                ]
            ).map((x) => (
              <button
                key={x.k}
                type="button"
                onClick={() => (x.k === "ok" ? navigate("/") : setO(x.k as Outcome))}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-card p-3.5 text-left hover:border-primary hover:bg-[#f6f7fd]"
              >
                <x.icon className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{x.t}</span>
                  <span className="text-[0.8125rem] text-muted-foreground">{x.d}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {o === "consent" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.015em]">Your IT team needs to approve ThryveMS</h1>
            <p className="text-sm leading-normal text-muted-foreground">
              Your company only lets IT approve new apps. Send them this request. ThryveMS asks only for your name, email and company, and never opens your files.
            </p>
          </div>
          <Alert tone="info" title="What ThryveMS asks Microsoft for">
            <ul className="mt-1 list-disc pl-5">
              <li>Sign you in and read your basic profile</li>
              <li>Your email address</li>
            </ul>
          </Alert>
          <Button onClick={() => setO("pick")}>Send request to IT</Button>
        </>
      )}

      {o === "no-account" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.015em]">You don’t have a ThryveMS account yet</h1>
            <p className="text-sm leading-normal text-muted-foreground">{google ? "No ThryveMS account uses this Google email. Ask your administrator to add you with this email. They’ll pick your role." : "Your company uses ThryveMS, but you haven’t been added. Ask your administrator for access. They’ll pick your role."}</p>
          </div>
          <Button asChild>
            <Link to="/request-access">Request access</Link>
          </Button>
        </>
      )}

      {o === "unknown-company" && google && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.015em]">This Google account can’t be used</h1>
            <p className="text-sm leading-normal text-muted-foreground">Google hasn’t verified this email address. Verify it in your Google account, or sign in with your work account or email and password.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/sign-in">Back to sign in</Link>
          </Button>
        </>
      )}

      {o === "unknown-company" && !google && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.015em]">Your company isn’t on ThryveMS</h1>
            <p className="text-sm leading-normal text-muted-foreground">
              Check you used your work account. If your company wants to start using ThryveMS, contact us and we’ll set up a workspace.
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="mailto:hello@iqms.example">Contact ThryveMS</a>
          </Button>
        </>
      )}
    </AuthLayout>
  )
}
