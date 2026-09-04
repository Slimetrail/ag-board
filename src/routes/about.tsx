import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

const BEATS = [
  {
    kicker: "Small needs",
    title: "A bale, a tool, an afternoon of hands",
    body: "Someone is short on hay. Someone else has extra panels. A neighbor can stretch wire for a day. Those little fills keep a place running when the week gets tight.",
    image: "/images/hay.jpg",
  },
  {
    kicker: "Larger operations",
    title: "Cattle, acreage, a season of ground",
    body: "The same board holds a heifer, a farm lease, a hunting woods, a crew that will show up. Small farms and bigger outfits share one corkboard — county by county.",
    image: "/images/heifer.jpg",
  },
  {
    kicker: "Weather, all of it",
    title: "A community that helps is harder to knock down",
    body: "Drought, flood, freeze, a storm that takes the fence. A county that shares tools, feed, skills, and ground is stronger and more resilient against all forms of weather — the kind that hits the field, and the kind that hits the books.",
    image: "/images/hunting-woods.jpg",
  },
] as const;

function AboutPage() {
  return (
    <div>
      <section className="relative isolate min-h-[52svh] overflow-hidden">
        <img
          src="/images/garden-bed.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover object-[center_60%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-fg/80 via-fg/40 to-fg/20" />
        <div className="relative mx-auto flex min-h-[52svh] max-w-6xl flex-col justify-end px-4 pb-12 pt-24 sm:px-6 sm:pb-16">
          <p className="text-[13px] font-medium tracking-[0.18em] text-primary-fg/80 uppercase">
            About us
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[2.4rem] leading-[1.05] text-primary-fg sm:text-6xl">
            From a small need to a whole operation.
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-lg leading-relaxed text-muted sm:text-xl">
          Ag See a Need Fill a Need is a South Carolina board for neighbors
          who farm, homestead, hunt, and keep animals. We are not a store
          and not a broker. We are a place to see what the county is short
          on — and to fill it.
        </p>
        <p className="mt-6 text-base leading-relaxed text-muted">
          A community that helps each other is stronger. It holds through
          dry summers, wet winters, and the weeks when one place has extra
          and the next place does not. That is the whole idea.
        </p>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20">
          {BEATS.map((beat) => (
            <article
              key={beat.kicker}
              className="grid gap-6 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)] md:grid-cols-2 md:items-center"
            >
              <img
                src={beat.image}
                alt=""
                className="aspect-4/3 h-full w-full object-cover md:aspect-auto md:min-h-64"
              />
              <div className="p-6 sm:p-8">
                <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
                  {beat.kicker}
                </p>
                <h2 className="mt-2 font-display text-3xl">{beat.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted">
                  {beat.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="font-display text-3xl sm:text-4xl">How we keep it neighborly</h2>
        <ul className="mt-6 grid gap-4 text-base leading-relaxed text-muted">
          <li>
            Look without an account. Sign up to post, or to request a
            connection.
          </li>
          <li>
            County first. Listings are found in South Carolina, narrowed to
            the county they come from.
          </li>
          <li>
            Username and picture are public. Real name, address, phone, and
            email stay private. After Accept, you talk in a private message
            thread — that is the contact channel.
          </li>
          <li>
            The app is not a party to any trade. If you connect, you take
            the risk.
          </li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/market">See the board</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/needs">See what people need</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="font-display text-3xl sm:text-4xl">
            Website, Android, and iPhone
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            This is one board. Use it in the browser, or put it on the phone
            home screen so it opens like an app.
          </p>
          <p className="mt-6 text-base leading-relaxed text-muted">
            Built with Grok. See a need, fill a need.
          </p>
          <ul className="mt-6 grid gap-4 text-base leading-relaxed text-muted">
            <li>
              <span className="font-medium text-fg">Website.</span> Open this
              address on any computer or phone. That is the live board.
            </li>
            <li>
              <span className="font-medium text-fg">Android.</span> In Chrome,
              tap the menu, then Install app or Add to Home screen.
            </li>
            <li>
              <span className="font-medium text-fg">iPhone / iPad.</span> In
              Safari, tap Share, then Add to Home Screen.
            </li>
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-subtle">
            Apple App Store and Google Play store listings are a later wrap of
            this same board. The home-screen app is the same site you have now.
          </p>
        </div>
      </section>
    </div>
  );
}
