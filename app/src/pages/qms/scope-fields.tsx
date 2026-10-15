import type { QmsScopeContent } from "@/data/types"
import { Field } from "@/components/app/form"
import { Textarea } from "@/components/ui/input"

const FIELDS: { key: keyof QmsScopeContent; label: string }[] = [
  { key: "statement", label: "Scope statement" },
  { key: "products", label: "Products and services" },
  { key: "sites", label: "Sites" },
  { key: "exclusions", label: "Not applicable" },
  { key: "standard", label: "Standard" },
]

export function ScopeFields({
  value,
  onChange,
}: {
  value: QmsScopeContent
  onChange: (scope: QmsScopeContent) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {FIELDS.map(({ key, label }) => (
        <Field key={key} label={label} htmlFor={`scope-${key}`}>
          <Textarea
            id={`scope-${key}`}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </Field>
      ))}
    </div>
  )
}
