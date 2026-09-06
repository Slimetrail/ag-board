import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { INVITES_CHANGED } from "@/lib/interest-notify";
import { listInvites } from "@/lib/profiles";
import { cn } from "@/lib/utils";

export function InviteBadge({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function load() {
      void listInvites()
        .then((data) => setCount(data.pendingIn))
        .catch(() => setCount(0));
    }
    load();
    window.addEventListener(INVITES_CHANGED, load);
    return () => window.removeEventListener(INVITES_CHANGED, load);
  }, []);

  return (
    <Link
      to="/invites"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-wash hover:text-fg",
        className,
      )}
    >
      Invites
      {count > 0 ? (
        <span className="ml-1.5 tabular-nums text-subtle">{count}</span>
      ) : null}
    </Link>
  );
}
