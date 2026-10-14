import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"

const CODES = [
  ["Manual", "MAN"],
  ["Policy", "POL"],
  ["Procedure", "PRO"],
  ["Work instruction", "WI"],
  ["Form", "FRM"],
  ["Register", "REG"],
  ["Record", "REC"],
]

export default function Numbering() {
  const [sep, setSep] = React.useState("-")
  const [digits, setDigits] = React.useState("3")
  const [codes, setCodes] = React.useState(Object.fromEntries(CODES))
  const preview = ["OPS", codes["Work instruction"], "1".padStart(parseInt(digits, 10), "0")].join(sep)

  return (
    <>
      <SettingsHeader title="Document numbering" description="How new documents are numbered. Existing numbers never change." />
      <Card>
        <CardHeader>
          <CardTitle>Pattern</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">Process code, type code, number</span>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Separator" htmlFor="n-sep">
              <NativeSelect id="n-sep" value={sep} onChange={(e) => setSep(e.target.value)}>
                <option value="-">Dash, OPS-WI-001</option>
                <option value=".">Dot, OPS.WI.001</option>
                <option value="/">Slash, OPS/WI/001</option>
              </NativeSelect>
            </Field>
            <Field label="Digits" htmlFor="n-dig">
              <NativeSelect id="n-dig" value={digits} onChange={(e) => setDigits(e.target.value)}>
                <option value="3">3, up to 999</option>
                <option value="4">4, up to 9999</option>
              </NativeSelect>
            </Field>
            <Field label="Next work instruction in Operations">
              <span className="flex h-10 items-center rounded-sm bg-background px-3 text-sm font-semibold">{preview}</span>
            </Field>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Type codes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CODES.map(([t]) => (
            <Field key={t} label={t} htmlFor={`code-${t}`}>
              <Input id={`code-${t}`} value={codes[t]} maxLength={4} onChange={(e) => setCodes({ ...codes, [t]: e.target.value.toUpperCase() })} />
            </Field>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => toast("Numbering saved", { description: "Applies to documents added from now on." })}>Save changes</Button>
      </div>
    </>
  )
}
