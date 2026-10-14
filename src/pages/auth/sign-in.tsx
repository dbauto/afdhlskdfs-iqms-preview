import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronLeftIcon, CircleCheckIcon, MailIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout, HumanCheck, MicrosoftMark } from "./auth-layout"

type Step = "start" | "forgot" | "sent" | "new" | "done"
const okEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const emailMsg = (v: string) => (!v.trim() ? "Enter your work email." : okEmail(v) ? "" : "Enter an email like name@company.com.")

function Title({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-[-0.015em]">{children}</h1>
      {sub && <p className="text-sm leading-normal text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function SignIn() {
  const navigate = useNavigate()
  const [step, setStep] = React.useState<Step>("start")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [show, setShow] = React.useState(false)
  const [human, setHuman] = React.useState<"idle" | "busy" | "ok">("idle")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [resent, setResent] = React.useState(false)
  const [p1, setP1] = React.useState("")
  const [p2, setP2] = React.useState("")

  const go = (s: Step) => {
    setErrors({})
    setResent(false)
    setHuman("idle")
    setStep(s)
  }

  const rules = [
    { ok: p1.length >= 12, text: "At least 12 characters" },
    { ok: /[A-Za-z]/.test(p1) && /[0-9]/.test(p1), text: "Letters and numbers" },
    { ok: !!p1 && !/password|1234|qwerty/i.test(p1), text: "Not a common password" },
  ]

  return (
    <AuthLayout>
      {step === "start" && (
        <>
          <Title sub="Use your work account. Documents open in SharePoint with the same account.">Sign in to your quality system</Title>
          <Button size="default" asChild>
            <Link to="/sign-in/microsoft">
              <MicrosoftMark /> Continue with Microsoft 365
            </Link>
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            Or with email and password
            <span className="h-px flex-1 bg-border" />
          </div>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const err = { email: emailMsg(email), password: password ? "" : "Enter your password.", human: human === "ok" ? "" : "Confirm you’re human to continue." }
              setErrors(err)
              if (!err.email && !err.password && !err.human) navigate("/")
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="si-email">Work email</Label>
              <Input id="si-email" type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: "" })) }} aria-invalid={!!errors.email} aria-describedby="si-email-msg" />
              {errors.email && <span id="si-email-msg" className="text-[13px] text-destructive">{errors.email}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="si-pass">Password</Label>
              <span className="relative">
                <Input id="si-pass" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: "" })) }} aria-invalid={!!errors.password} aria-describedby="si-pass-msg" className="pr-16" />
                <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="absolute right-1 top-1 h-8 cursor-pointer rounded-[4px] px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary">
                  {show ? "Hide" : "Show"}
                </button>
              </span>
              {errors.password && <span id="si-pass-msg" className="text-[13px] text-destructive">{errors.password}</span>}
              <button type="button" onClick={() => go("forgot")} className="cursor-pointer self-end text-[13px] font-medium text-primary hover:text-primary-hover">
                Forgot password?
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[13px]">
              <Checkbox /> Keep me signed in on this device
            </label>
            <HumanCheck value={human} onChange={(v) => { setHuman(v); setErrors((x) => ({ ...x, human: "" })) }} error={errors.human} />
            <Button type="submit" variant="outline">
              Sign in
            </Button>
            <p className="text-xs leading-normal text-muted-foreground">
              By signing in, you agree to the <a href="#" className="text-primary underline underline-offset-2">Terms of Service</a> and <a href="#" className="text-primary underline underline-offset-2">Privacy Policy</a>.
            </p>
          </form>
          <p className="border-t border-rule-soft pt-4 text-[13px] leading-normal text-muted-foreground">
            New here?{" "}
            <Link to="/request-access" className="font-medium text-primary">
              Request access
            </Link>
            . Your administrator approves it and picks your role.
          </p>
        </>
      )}

      {step === "forgot" && (
        <>
          <button type="button" onClick={() => go("start")} className="flex cursor-pointer items-center gap-1.5 self-start text-[13px] font-medium text-primary">
            <ChevronLeftIcon className="size-4" /> Back to sign in
          </button>
          <Title sub="Enter your work email and we’ll send a link to set a new password. If you sign in with Microsoft 365, reset it in Microsoft instead.">Reset your password</Title>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const err = { email: emailMsg(email), human: human === "ok" ? "" : "Confirm you’re human to continue." }
              setErrors(err)
              if (!err.email && !err.human) setStep("sent")
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="fp-email">Work email</Label>
              <Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
              {errors.email && <span className="text-[13px] text-destructive">{errors.email}</span>}
            </div>
            <HumanCheck value={human} onChange={setHuman} error={errors.human} />
            <Button type="submit" variant="outline">
              Send reset link
            </Button>
          </form>
        </>
      )}

      {step === "sent" && (
        <>
          <span className="flex size-10 items-center justify-center rounded-md bg-done-tint text-done">
            <MailIcon className="size-5" />
          </span>
          <div role="status">
            <Title sub={<>If <strong className="font-semibold text-foreground">{email}</strong> has an iQMS account, a reset link is on its way. It works once and expires in 30 minutes.</>}>Check your email</Title>
          </div>
          <Button variant="outline" onClick={() => go("new")}>
            Open the reset link (prototype)
          </Button>
          <div className="flex justify-between text-[13px]">
            <button type="button" className="cursor-pointer font-medium text-primary underline underline-offset-2" onClick={() => go("start")}>
              Back to sign in
            </button>
            <button type="button" className="cursor-pointer font-medium text-primary underline underline-offset-2" onClick={() => setResent(true)}>
              {resent ? "Link sent again" : "Resend link"}
            </button>
          </div>
        </>
      )}

      {step === "new" && (
        <>
          <Title sub={`For ${email || "your account"}. You’ll be signed out on other devices.`}>Set a new password</Title>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!rules.every((r) => r.ok)) return setErrors({ p2: "The new password doesn’t meet the rules above." })
              if (p1 !== p2) return setErrors({ p2: "The two passwords don’t match." })
              setP1("")
              setP2("")
              go("done")
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="np1">New password</Label>
              <Input id="np1" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} aria-describedby="np-rules" />
              <ul id="np-rules" className="flex flex-col gap-1 pt-1">
                {rules.map((r) => (
                  <li key={r.text} className={cn("flex items-center gap-2 text-[13px]", r.ok ? "text-done" : "text-muted-foreground")}>
                    {r.ok ? <CircleCheckIcon className="size-3.5" /> : <MinusIcon className="size-3.5" />}
                    {r.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="np2">Confirm new password</Label>
              <Input id="np2" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} aria-invalid={!!errors.p2} />
              {errors.p2 && <span className="text-[13px] text-destructive">{errors.p2}</span>}
            </div>
            <Button type="submit">Save new password</Button>
          </form>
        </>
      )}

      {step === "done" && (
        <>
          <span className="flex size-10 items-center justify-center rounded-md bg-done-tint text-done">
            <CircleCheckIcon className="size-5" />
          </span>
          <div role="status">
            <Title sub="Sign in with your new password. Other devices have been signed out.">Password saved</Title>
          </div>
          <Button variant="outline" onClick={() => go("start")}>
            Back to sign in
          </Button>
        </>
      )}
    </AuthLayout>
  )
}
