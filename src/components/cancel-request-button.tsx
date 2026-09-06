import { Button } from "@/components/ui/button";
import { cancelRequestLabel } from "@/lib/connect-helpers";
import { cn } from "@/lib/utils";

export function CancelRequestButton({
  disabled,
  busy,
  onCancel,
  size = "default",
  className,
}: {
  disabled?: boolean;
  busy?: boolean;
  onCancel: () => void;
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
      onClick={onCancel}
    >
      {cancelRequestLabel(Boolean(busy))}
    </Button>
  );
}
