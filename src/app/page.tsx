import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1 className="landing__title">AU Visa Pathway Agent</h1>
      <p className="landing__lead">
        A structured wizard that walks through your situation and returns
        ranked Australian visa subclass results with rule-based reasons,
        source links, and plausible pathway sketches toward permanent
        residence. Recommendations come from hand-encoded rules and a
        pathway graph — not from an unconstrained chatbot.
      </p>

      <div className="landing__disclaimer" role="note">
        <strong>This is not migration advice.</strong>
        It is a portfolio/demo tool. Rules are simplified and may be out of
        date. Verify everything with the Department of Home Affairs or a
        MARN-registered migration agent before making any decisions about
        your visa.
      </div>

      <p>
        <Link href="/wizard" className="btn btn--primary">
          Start the wizard
        </Link>
      </p>

      <section style={{ marginTop: "2.5rem" }}>
        <h2>What you&apos;ll see</h2>
        <ul>
          <li>Ranked verdicts for all 9 in-scope visa subclasses (189, 190, 491, 482, 186, 417, 462, 485, 500).</li>
          <li>Status, score, matched criteria, blockers, and next steps for each subclass.</li>
          <li>Plausible pathway sketches with indicative timeframes and risks.</li>
          <li>Source links to Department of Home Affairs pages for each rule.</li>
        </ul>
      </section>
    </section>
  );
}
