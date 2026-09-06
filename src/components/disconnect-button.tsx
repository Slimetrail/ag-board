import { Button } from "@/components/ui/button";
import { disconnectLabel } from "@/lib/connect-helpers";
import { cn } from "@/lib/utils";

export function DisconnectButton({
  disabled,
  busy,
  onDisconnect,
  size = "default",
  className,
}: {
  disabled?: boolean;
  busy?: boolean;
  onDisconnect: () => void;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={disabled || busy}
      className={cn(className)}
      onClick={onDisconnect}
    >
      {disconnectLabel(Boolean(busy))}
    </Button>
  );
}
