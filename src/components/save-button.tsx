import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBoardStore } from "@/lib/board-store";
import { cn } from "@/lib/utils";

export function SaveButton({
  listingId,
  title,
  className,
}: {
  listingId: number;
  title: string;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const savedIds = useBoardStore((s) => s.savedIds);
  const toggleSaved = useBoardStore((s) => s.toggleSaved);
  const saved = ready && savedIds.includes(listingId);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      className={cn(className)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSaved(listingId);
        toast(saved ? "Taken off your list" : "Pinned to your list", {
          description: title,
        });
      }}
      aria-pressed={saved}
    >
      <Bookmark className={cn("size-4", saved && "fill-current")} />
      {saved ? "Pinned" : "Pin this"}
    </Button>
  );
}
