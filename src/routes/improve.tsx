import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { RequireUse } from "@/components/require-use";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitImprove } from "@/lib/office";

export const Route = createFileRoute("/improve")({
  component: ImprovePage,
});

function ImprovePage() {
  return (
    <RequireUse reason="A short note to the board takes an account. Looking around does not.">
      <ImproveForm />
    </RequireUse>
  );
}

function ImproveForm() {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await submitImprove({ data: { body } });
      setBody("");
      toast("Note sent. It is not posted on the board.");
    } catch {
      toast("Could not send that. Try a longer note.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        How can we improve
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">
        Tell the board what would help.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        A county that talks gets stronger. This note is not a public forum —
        neighbors will not see it. It goes to the person who keeps the board.
      </p>
      <form className="mt-10 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid gap-1.5">
          <Label htmlFor="improve">Your note</Label>
          <Textarea
            id="improve"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            minLength={12}
            maxLength={1200}
            placeholder="What would make this board more useful on your place?"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send the note"}
        </Button>
      </form>
    </div>
  );
}
