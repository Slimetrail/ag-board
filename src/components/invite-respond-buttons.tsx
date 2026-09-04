import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InviteRespondButtons({
  disabled,
  onAccept,
  onDeny,
  size = "default",
  className,
}: {
  disabled?: boolean;
  onAccept: () => void;
  onDeny: () => void;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-2", className)}
      role="group"
      aria-label="Accept or deny this request"
    >
      <Button type="button" size={size} disabled={disabled} onClick={onAccept}>
        {disabled ? "Saving…" : "Accept"}
      </Button>
      <Button
        type="button"
        size={size}
        variant="destructive"
        disabled={disabled}
        onClick={onDeny}
      >
        Deny
      </Button>
    </div>
  );
}
