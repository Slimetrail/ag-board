import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTutorialLink } from "@/lib/tutorial-links";
import { isSafeHttpUrl } from "@/lib/tutorials";
import { ensureOwnProfile } from "@/lib/profiles";

export function AddTutorialForm({
  onPosted,
}: {
  onPosted: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isSafeHttpUrl(url)) {
      setError("Use an http or https link to where the video lives.");
      return;
    }
    setPending(true);
    try {
      await ensureOwnProfile();
      await createTutorialLink({ data: { title, summary, url } });
      setTitle("");
      setSummary("");
      setUrl("");
      toast("Tutorial posted to Learn");
      await onPosted();
    } catch {
      setError(
        "Check the title, summary, and link. The URL has to start with http or https.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)}>
      <div className="grid gap-1.5">
        <Label htmlFor="tutorial-title">Title</Label>
        <Input
          id="tutorial-title"
          name="title"
          required
          minLength={4}
          maxLength={80}
          placeholder="Stretching woven wire on a hill"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tutorial-summary">One-line summary</Label>
        <Textarea
          id="tutorial-summary"
          name="summary"
          required
          minLength={8}
          maxLength={140}
          placeholder="A Saturday fence job we filmed after the rain."
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tutorial-url">Video link</Label>
        <Input
          id="tutorial-url"
          name="url"
          type="url"
          inputMode="url"
          required
          maxLength={2000}
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <p className="text-xs text-subtle">
          YouTube, TikTok, Facebook, or another public page. We store the
          link — we do not embed the video here.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-primary" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Posting…" : "Post this tutorial"}
      </Button>
    </form>
  );
}
