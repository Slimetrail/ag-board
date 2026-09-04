import { cn } from "@/lib/utils";

export function FarmAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-wash font-display text-fg",
        className,
      )}
    >
      {letter}
    </span>
  );
}
