import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function OfficeNav({
  pathname,
  className,
  onClick,
}: {
  pathname: string;
  className?: string;
  onClick?: () => void;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    void import("@/lib/admin")
      .then((mod) => mod.getAdminStatus())
      .then((status) => setShow(status.signedIn))
      .catch(() => setShow(false));
  }, []);

  if (!show) return null;

  return (
    <Link
      to="/office"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium",
        pathname === "/office"
          ? "bg-wash text-fg"
          : "text-muted hover:bg-wash hover:text-fg",
        className,
      )}
    >
      Office
    </Link>
  );
}
