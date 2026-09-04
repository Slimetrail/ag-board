import { useEffect } from "react";
import { BOARD_GROUNDS, isBoardGround, type BoardGroundId } from "@/lib/board-ground";
import { useBoardStore } from "@/lib/board-store";
import { cn } from "@/lib/utils";

export function BoardGround() {
  const ground = useBoardStore((s) => s.boardGround);

  useEffect(() => {
    const next = isBoardGround(ground) ? ground : "linen";
    document.documentElement.dataset.ground = next;
  }, [ground]);

  return null;
}

export function GroundPicker({ className }: { className?: string }) {
  const ground = useBoardStore((s) => s.boardGround);
  const setBoardGround = useBoardStore((s) => s.setBoardGround);

  return (
    <div className={cn("grid gap-2", className)}>
      <p className="text-sm font-medium text-fg">Board color</p>
      <p className="text-xs leading-relaxed text-subtle">
        Mid tones only — no white, no black — so listing photos read more
        vividly.
      </p>
      <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Board color">
        {BOARD_GROUNDS.map((item) => {
          const on = ground === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              aria-label={item.label}
              title={item.label}
              onClick={() => setBoardGround(item.id as BoardGroundId)}
              className={cn(
                "size-11 rounded-full border-2 transition-transform",
                on
                  ? "scale-110 border-fg"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: item.swatch }}
            />
          );
        })}
      </div>
    </div>
  );
}
