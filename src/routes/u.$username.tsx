import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ConnectPanel } from "@/components/connect-panel";
import { FarmAvatar } from "@/components/farm-avatar";
import { getProfileView, getPublicProfile, type ConnectionRelation, type PersonalProfile, type PublicProfile } from "@/lib/profiles";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/u/$username")({
  component: NeighborPage,
});

function NeighborPage() {
  const { username } = Route.useParams();
  const { user } = useCurrentUserState();
  const [missing, setMissing] = useState(false);
  const [pub, setPub] = useState<PublicProfile | null>(null);
  const [personal, setPersonal] = useState<PersonalProfile | null>(null);
  const [relation, setRelation] = useState<ConnectionRelation>("none");

  useEffect(() => {
    void (async () => {
      if (user) {
        const view = await getProfileView({ data: { username } });
        if (!view) {
          setMissing(true);
          return;
        }
        setMissing(false);
        setPub(view.public);
        setPersonal(view.personal);
        setRelation(view.relation);
        return;
      }
      const publicProfile = await getPublicProfile({ data: { username } });
      if (!publicProfile) {
        setMissing(true);
        return;
      }
      setMissing(false);
      setPub(publicProfile);
      setPersonal(null);
      setRelation("none");
    })();
  }, [username, user]);

  if (missing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-4xl">No one by that name</h1>
        <p className="mt-3 text-sm text-muted">That username isn't on the board.</p>
        <Link to="/market" className="mt-6 inline-block text-sm underline-offset-2 hover:underline">
          Back to the board
        </Link>
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        Opening their place…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-center gap-4">
        <FarmAvatar name={pub.username} src={pub.imagePath} className="size-20" />
        <div>
          <p className="text-[13px] tracking-[0.16em] text-muted uppercase">
            {pub.county ? `${pub.county} County` : "South Carolina"}
          </p>
          <h1 className="mt-1 font-display text-4xl">@{pub.username}</h1>
          {personal?.realName ? (
            <p className="mt-1 text-sm text-muted">{personal.realName}</p>
          ) : (
            <p className="mt-1 text-sm text-subtle">Real name hidden</p>
          )}
        </div>
      </div>
      {pub.bio ? (
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">{pub.bio}</p>
      ) : null}

      <div className="mt-8">
        <ConnectPanel
          userId={pub.userId}
          kicker="Neighbor"
          fallbackNote={
            relation === "connected" || relation === "self"
              ? undefined
              : "Real name, address, phone, and email stay hidden until they press Accept request."
          }
        />
      </div>

      {personal && (relation === "self" || relation === "connected") ? (
        <p className="mt-4 text-sm text-subtle">
          You can see their private details because the invite was accepted.
        </p>
      ) : null}
    </div>
  );
}
