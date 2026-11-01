import { Link, isRouteErrorResponse, useRouteError } from "react-router"
import { FileQuestion, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { errorMessage } from "@/lib/api"

export function NotFoundPage() {
  return (
    <Empty className="m-6 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion />
        </EmptyMedia>
        <EmptyTitle>Không tìm thấy trang</EmptyTitle>
        <EmptyDescription>Đường dẫn này không tồn tại.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to="/">Về trang tổng quan</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** Shown when a page crashes or its code fails to load. */
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : errorMessage(error)

  return (
    <Empty className="m-6 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>Đã xảy ra lỗi</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tải lại trang
        </Button>
      </EmptyContent>
    </Empty>
  )
}
