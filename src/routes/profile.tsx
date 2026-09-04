import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CountySelect } from "@/components/county-select";
import { FarmAvatar } from "@/components/farm-avatar";
import { RequireUse } from "@/components/require-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LISTING_IMAGES } from "@/lib/catalog";
import { isCountyInState } from "@/lib/geo";
import {
  checkUsername,
  ensureOwnProfile,
  updateOwnProfile,
  type OwnProfile,
} from "@/lib/profiles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RequireUse reason="Your profile is private until you sign in. Looking at the board does not need an account.">
      <ProfileEditor />
    </RequireUse>
  );
}

function ProfileEditor() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    void ensureOwnProfile()
      .then(setProfile)
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Could not open your profile.");
      });
  }, []);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        {loadError}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        Opening your place…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Your place
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Profile</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
        Username and picture are public. Real name, address, phone, and email
        stay hidden until you press Accept request.
      </p>

      <form
        className="mt-10 grid gap-8"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          setSuggestions([]);
          void updateOwnProfile({
            data: {
              username: profile.username,
              realName: profile.realName,
              imagePath: profile.imagePath,
              county: isCountyInState(profile.county, "SC") ? profile.county : "",
              email: profile.email,
              phone: profile.phone,
              place: profile.place,
              bio: profile.bio,
            },
          })
            .then((next) => {
              setProfile(next);
              setSuggestions([]);
              toast("Profile saved");
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : "Could not save.";
              if (message.startsWith("TAKEN:")) {
                setSuggestions(message.slice(6).split(",").filter(Boolean));
                setError(
                  "That username is already on the board. Pick one of these, or type another.",
                );
                return;
              }
              setError(message);
            })
            .finally(() => setPending(false));
        }}
      >
        <div className="flex items-center gap-4">
          <FarmAvatar
            name={profile.username}
            src={profile.imagePath}
            className="size-16"
          />
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>

        <UsernameField
          value={profile.username}
          onChange={(username) => setProfile({ ...profile, username })}
          suggestions={suggestions}
          onSuggestions={setSuggestions}
        />

        <div className="grid gap-1.5">
          <Label htmlFor="bio">A public line about the place</Label>
          <Textarea
            id="bio"
            value={profile.bio}
            onChange={(event) =>
              setProfile({ ...profile, bio: event.target.value })
            }
            maxLength={160}
            placeholder="Twelve acres of creek-bottom pasture."
          />
        </div>

        <fieldset>
          <legend className="text-[13px] font-medium tracking-wide text-muted">
            Picture (public)
          </legend>
          <p className="mt-1 mb-3 text-sm text-subtle">
            Pick a farm photo, or keep the picture from Google or X.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {profile.imagePath.startsWith("https://") ? (
              <button
                type="button"
                onClick={() => setProfile({ ...profile, imagePath: profile.imagePath })}
                className="ring-2 ring-primary ring-offset-2 ring-offset-bg overflow-hidden rounded-lg"
                aria-label="Sign-in picture"
              >
                <img src={profile.imagePath} alt="" className="aspect-4/3 w-full object-cover" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setProfile({ ...profile, imagePath: "" })}
              className={cn(
                "grid aspect-4/3 place-items-center rounded-lg bg-wash text-sm",
                !profile.imagePath
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-bg"
                  : "shadow-[var(--shadow-card)]",
              )}
            >
              Initials
            </button>
            {LISTING_IMAGES.slice(0, 12).map((image) => (
              <button
                key={image.path}
                type="button"
                onClick={() => setProfile({ ...profile, imagePath: image.path })}
                className={cn(
                  "overflow-hidden rounded-lg",
                  profile.imagePath === image.path
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-bg"
                    : "shadow-[var(--shadow-card)]",
                )}
                aria-label={image.label}
              >
                <img src={image.path} alt="" className="aspect-4/3 w-full object-cover" />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="rounded-xl border border-border bg-wash/50 p-5">
          <p className="text-[13px] font-medium tracking-wide text-muted uppercase">
            Hidden until you press Accept request
          </p>
          <p className="mt-1 mb-5 text-sm text-subtle">
            Real name, address, phone, and email. Neighbors cannot see these
            until you accept.
          </p>
          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="realName">Real name</Label>
                <Input
                  id="realName"
                  value={profile.realName}
                  onChange={(event) =>
                    setProfile({ ...profile, realName: event.target.value })
                  }
                  required
                  minLength={2}
                  maxLength={40}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(event) =>
                    setProfile({ ...profile, email: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(event) =>
                    setProfile({ ...profile, phone: event.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="place">Address / road</Label>
                <Input
                  id="place"
                  value={profile.place}
                  onChange={(event) =>
                    setProfile({ ...profile, place: event.target.value })
                  }
                  placeholder="Hidden until you accept a request"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="county">County (public)</Label>
                <CountySelect
                  id="county"
                  value={profile.county}
                  onChange={(value) =>
                    setProfile({
                      ...profile,
                      county: value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-fg" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}

function UsernameField({
  value,
  onChange,
  suggestions,
  onSuggestions,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onSuggestions: (names: string[]) => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (value.length < 3) {
      setNote(null);
      onSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void checkUsername({ data: { username: value } }).then((result) => {
        if (result.invalid) {
          setNote("3–24 letters, numbers, or _.");
          onSuggestions([]);
          return;
        }
        if (result.available) {
          setNote("That name is open.");
          onSuggestions([]);
          return;
        }
        setNote("That username is already on the board. Pick one of these, or type another.");
        onSuggestions(result.suggestions);
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [value, onSuggestions]);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="username">Username (public)</Label>
      <Input
        id="username"
        value={value}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        required
        minLength={3}
        maxLength={24}
        pattern="[a-z0-9_]{3,24}"
        autoComplete="username"
      />
      {note ? <p className="text-sm text-muted">{note}</p> : null}
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              className="h-9 rounded-full bg-wash px-3 text-sm font-medium text-fg hover:bg-primary hover:text-primary-fg"
              onClick={() => onChange(name)}
            >
              @{name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
