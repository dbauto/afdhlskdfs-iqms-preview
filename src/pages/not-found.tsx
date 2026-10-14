import { Link } from "react-router-dom"
import { CompassIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/app/page"

export default function NotFound() {
  return (
    <Card className="mt-6">
      <EmptyState
        icon={CompassIcon}
        title="This page or record doesn’t exist"
        body="It may have been deleted, or the link is wrong. Search by its number, or go back to the Overview."
        action={
          <Button variant="outline" asChild>
            <Link to="/">Go to Overview</Link>
          </Button>
        }
      />
    </Card>
  )
}
