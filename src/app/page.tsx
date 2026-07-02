import Link from "next/link";
import { allRules } from "@/rules";

export default function HomePage() {
  return (
    <section className="landing">
      <p className="landing__eyebrow">Skilled &middot; study &middot; working holiday &middot; employer sponsored</p>
      <h1 className="landing__title">
        Which Australian visa
        <br />
        fits <em>your</em> situation?
      </h1>
      <p className="landing__lead">
        Answer a short set of questions about your age, occupation, English,
        and goals. Get a ranked shortlist of visa options — what works in your
        favour, what&apos;s standing in the way, and realistic step-by-step
        routes toward permanent residence, each linked to the official
        requirements.
      </p>

      <div className="landing__actions">
        <Link href="/wizard" className="btn btn--primary btn--lg">
          Check my options
        </Link>
        <span className="landing__actions-note">
          Free &middot; about 5 minutes &middot; no sign-up
        </span>
      </div>

      <div className="landing__disclaimer" role="note">
        <strong>This is not migration advice.</strong>
        It is a portfolio/demo tool. Rules are simplified and may be out of
        date. Verify everything with the Department of Home Affairs or a
        MARN-registered migration agent before making any decisions about
        your visa.
      </div>

      <section className="landing__section">
        <h2 className="landing__section-title">Visas covered</h2>
        <ul className="subclass-grid">
          {allRules.map((rule) => (
            <li key={rule.subclassId} className="subclass-chip">
              <span className="subclass-chip__code">{rule.subclassId}</span>
              <span className="subclass-chip__name">
                {rule.displayName.split(" (")[0]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing__section">
        <h2 className="landing__section-title">What you get</h2>
        <ol className="landing__features">
          <li>
            <strong>Your options, ranked</strong> — every visa scored against
            your situation, with the reasons spelled out.
          </li>
          <li>
            <strong>Blockers and next steps</strong> — what rules you don&apos;t
            meet yet, and what would change the outcome.
          </li>
          <li>
            <strong>Routes to permanent residence</strong> — multi-step
            pathways with indicative timeframes and the risks along the way.
          </li>
          <li>
            <strong>Official sources</strong> — every result links to the
            Department of Home Affairs page it&apos;s based on.
          </li>
        </ol>
      </section>
    </section>
  );
}
