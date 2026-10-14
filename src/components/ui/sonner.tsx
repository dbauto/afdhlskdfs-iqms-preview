import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#18202B",
          color: "#FFFFFF",
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
