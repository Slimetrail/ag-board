import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { loginSearch } from "@/lib/auth/login-search";
import { cn } from "@/lib/utils";

type AuthEntryLinksProps = {
  size?: "default" | "sm" | "lg";
  compact?: boolean;
  signupClassName?: string;
  loginClassName?: string;
  onNavigate?: () => void;
};

const compactLinkClass =
  "rounded-md px-2 py-2 text-sm font-medium text-fg hover:bg-wash";

/** Sign up + Log in — same /login page, signup mode via search. */
export function AuthEntryLinks({
  size = "default",
  compact = false,
  signupClassName,
  loginClassName,
  onNavigate,
}: AuthEntryLinksProps) {
  if (compact) {
    return (
      <>
        <Link
          to="/login"
          search={loginSearch({ mode: "up" })}
          onClick={onNavigate}
          className={cn(compactLinkClass, signupClassName)}
        >
          Sign up
        </Link>
        <Link
          to="/login"
          search={loginSearch({ mode: "in" })}
          onClick={onNavigate}
          className={cn(compactLinkClass, loginClassName)}
        >
          Log in
        </Link>
      </>
    );
  }

  return (
    <>
      <Button asChild size={size} className={cn(signupClassName)}>
        <Link to="/login" search={loginSearch({ mode: "up" })} onClick={onNavigate}>
          Sign up
        </Link>
      </Button>
      <Button
        asChild
        size={size}
        variant="outline"
        className={cn(loginClassName)}
      >
        <Link to="/login" search={loginSearch({ mode: "in" })} onClick={onNavigate}>
          Log in
        </Link>
      </Button>
    </>
  );
}
