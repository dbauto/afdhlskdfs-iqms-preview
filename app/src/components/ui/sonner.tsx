import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--foreground)",
          color: "var(--background)",
          border: "0",
          borderRadius: "8px",
          fontFamily: "Public Sans, sans-serif",
          fontSize: "14px",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
