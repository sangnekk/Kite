import { XIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import Link from "next/link";
import env from "@/lib/env/client";
import { useBetaPopupStore } from "@/lib/state/betaPopup";
import { useShallow } from "zustand/react/shallow";

export default function OpenBetaPopup() {
  const [popupClosed, setPopupClosed] = useBetaPopupStore(
    useShallow((state) => [state.popupClosed, state.setPopupClosed])
  );

  if (popupClosed) return null;

  return (
    <Card className="shadow-md max-w-96 fixed bottom-5 right-5 ml-5 z-50">
      <CardHeader className="px-5 py-4">
        <CardTitle className="text-lg">Vibe Bot Beta 🪁</CardTitle>
        <CardDescription>
          Vibe Bot đang trong giai đoạn beta mở. Bạn có thể gặp lỗi bất cứ
          lúc nào!
        </CardDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-1"
          onClick={() => setPopupClosed(true)}
        >
          <XIcon className="w-5 h-5 cursor-pointer" />
        </Button>
      </CardHeader>
      <CardFooter className="px-5 pb-4">
        <Button variant="outline" asChild>
          <Link href={env.NEXT_PUBLIC_DISCORD_LINK} target="_blank">
            Tham gia Discord
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
