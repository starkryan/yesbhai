import { EclipseIcon, StarIcon } from "lucide-react"
import { Link } from '@inertiajs/react'
export default function Comp303() {
  return (
    <div className="dark bg-muted text-foreground px-4 py-3">
      <p className="text-center text-sm">
        <StarIcon 
          className="me-3 -mt-0.5 inline-flex opacity-60 text-yellow-200"
          size={16}
          aria-hidden="true"
        />
        Read the Privacy Policy{" "}
        <span className="text-muted-foreground">·</span>{" "}
        <Link href="/privacy" className="font-medium underline hover:no-underline">
          Read More
        </Link>
      </p>
    </div>
  )
}
