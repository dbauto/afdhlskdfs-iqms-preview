import type { ChecklistQuestion } from "@/data/types"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input, Textarea } from "@/components/ui/input"

/** The builder preview and both response workspaces use the same typed controls. */
export function QuestionAnswer({
  question: q,
  value,
  selectedValues = [],
  onChange,
  disabled = false,
  id = "aq-answer",
  label = "Your answer",
}: {
  question: ChecklistQuestion
  value: string
  selectedValues?: string[]
  disabled?: boolean
  id?: string
  label?: string
  onChange: (value: string, selectedValues?: string[]) => void
}) {
  const choices = q.type === "Yes / No / N/A" ? ["Yes", "No", "N/A"] : (q.choices ?? []).map((v) => v.trim()).filter(Boolean)
  if (q.type === "Multiple select")
    return (
      <fieldset disabled={disabled} aria-label={label} className="flex flex-col gap-2">
        {choices.map((choice, i) => (
          <label key={choice} htmlFor={`${id}-${i}`} className="flex min-h-8 cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              id={`${id}-${i}`}
              disabled={disabled}
              checked={selectedValues.includes(choice)}
              onCheckedChange={(checked) => {
                const next = choices.filter((c) => (c === choice ? checked === true : selectedValues.includes(c)))
                onChange(next.join(", "), next)
              }}
            />
            {choice}
          </label>
        ))}
      </fieldset>
    )
  if (q.type === "Multiple choice" || q.type === "Yes / No / N/A")
    return (
      <RadioGroup id={id} aria-label={label} disabled={disabled} value={value} onValueChange={(v) => onChange(v)}>
        {choices.map((choice, i) => (
          <label key={choice} htmlFor={`${id}-${i}`} className="flex min-h-8 cursor-pointer items-center gap-3 text-sm">
            <RadioGroupItem disabled={disabled} id={`${id}-${i}`} value={choice} />
            {choice}
          </label>
        ))}
      </RadioGroup>
    )
  if (q.type === "Number" || q.type === "Date")
    return (
      <Input
        id={id}
        aria-label={label}
        disabled={disabled}
        type={q.type === "Date" ? "date" : "number"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  return (
    <Textarea
      id={id}
      aria-label={label}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-28"
    />
  )
}
