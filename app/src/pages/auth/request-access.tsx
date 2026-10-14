import * as React from "react"
import { Link } from "react-router-dom"
import { ChevronLeftIcon, MailCheckIcon } from "lucide-react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { AuthLayout, HumanCheck } from "./auth-layout"

const KNOWN: Record<string, string> = { "arden.example": "Arden & Co.", "northwind.example": "Northwind Foods", "meridian.example": "Meridian Clinics" }

export default function RequestAccess() {
  const [f, setF] = React.useState({ name: "", email: "", reason: "" })
  const [human, setHuman] = React.useState<"idle" | "busy" | "ok">("idle")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [sent, setSent] = React.useState(false)
  const domain = f.email.split("@")[1]?.toLowerCase() ?? ""
  const company = KNOWN[domain]

  if (sent)
    return (
      <AuthLayout>
        <span className="flex size-10 items-center justify-center rounded-md bg-done-tint text-done">
          <MailCheckIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-2" role="status">
          <h1 className="text-2xl font-semibold tracking-[-0.015em]">Request sent</h1>
          <p className="text-sm leading-normal text-muted-foreground">
            {company ? `${company}’s administrator` : "The iQMS team"} will review it. You’ll get an email at <strong className="font-semibold text-foreground">{f.email}</strong> when it’s approved, usually within one working day.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/sign-in">Back to sign in</Link>
        </Button>
      </AuthLayout>
    )

  return (
    <AuthLayout>
      <Link to="/sign-in" className="flex items-center gap-1.5 self-start text-[0.8125rem] font-medium text-primary">
        <ChevronLeftIcon className="size-4" /> Back to sign in
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">Request access</h1>
        <p className="text-sm leading-normal text-muted-foreground">Your company’s administrator approves your request and picks what you can see.</p>
      </div>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const err: Record<string, string> = {}
          if (!f.name.trim()) err.name = "Enter your name."
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) err.email = "Enter your work email, like name@company.com."
          if (!f.reason.trim()) err.reason = "Say what you need iQMS for. It helps your administrator pick your role."
          if (human !== "ok") err.human = "Confirm you’re human to continue."
          setErrors(err)
          if (!Object.keys(err).length) setSent(true)
        }}
      >
        <Field label="Your name" htmlFor="ra-name" error={errors.name}>
          <Input id="ra-name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Work email" htmlFor="ra-email" error={errors.email} help={company ? `Your request goes to ${company}’s administrator.` : undefined}>
          <Input id="ra-email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-invalid={!!errors.email} />
        </Field>
        {domain && !company && domain.includes(".") && (
          <Alert tone="info">We don’t recognise this company yet. Your request goes to the iQMS team, who will check with your company.</Alert>
        )}
        <Field label="What do you need it for?" htmlFor="ra-reason" error={errors.reason}>
          <Textarea id="ra-reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="For example, I’m a new inspector and need the work instructions." className="min-h-20" aria-invalid={!!errors.reason} />
        </Field>
        <HumanCheck value={human} onChange={setHuman} error={errors.human} />
        <Button type="submit">Send request</Button>
        <p className="text-xs leading-normal text-muted-foreground">
          We use your details only to review this request. See the <Link to="/legal/privacy" className="text-primary underline underline-offset-2">Privacy Notice</Link>.
        </p>
      </form>
    </AuthLayout>
  )
}
