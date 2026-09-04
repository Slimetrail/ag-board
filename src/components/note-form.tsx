import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addBoardNote } from "@/lib/listings";
import { ensureOwnProfile } from "@/lib/profiles";

export function NoteForm({ listingId }: { listingId: number }) {
  const { user, isPending } = useCurrentUserState();
  const [username, setUsername] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    void ensureOwnProfile().then((profile) => setUsername(profile.username));
  }, [user]);

  if (!mounted || isPending) {
    return <div className="mt-5 min-h-10" />;
  }

  if (!user) {
    return (
      <div className="mt-5">
        <p className="text-sm text-muted">
          Sign in to leave a note or request a connection.
        </p>
        <Button asChild className="mt-3">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="mt-5 grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!username) return;
        setPending(true);
        try {
          await addBoardNote({
            data: { listingId, farmName: `@${username}`, body },
          });
          setBody("");
          toast("Note pinned to the listing");
          await router.invalidate();
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          toast(
            message.includes("private message")
              ? message
              : "Could not post that note. Try a longer message.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="note-body">Note</Label>
        <Textarea
          id="note-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="I can pick up Saturday after chores…"
          required
          minLength={8}
          maxLength={400}
        />
        <p className="text-xs text-subtle">
          Public note, posted as @{username || "you"}. Do not put a name,
          address, phone, or email here — those belong in a private message
          after you connect.
        </p>
      </div>
      <Button type="submit" disabled={pending || !username}>
        {pending ? "Posting…" : "Leave a note"}
      </Button>
    </form>
  );
}
