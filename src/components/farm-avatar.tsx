import { avatarInitials, isCustomPhotoPath } from "@/lib/avatar";
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
  const photo = src && isCustomPhotoPath(src) ? src : null;
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name || "Initials"}
      className={cn(
        "grid place-items-center rounded-full bg-wash font-display font-semibold tracking-wide text-fg uppercase",
        className,
      )}
    >
      <span className="text-[0.42em] leading-none">{avatarInitials(name)}</span>
    </span>
  );
}
