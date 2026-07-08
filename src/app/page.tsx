import Link from 'next/link';

const DEMO_EMAIL = 'mailto:rbauman@texancs.com?cc=jmaldonado@texancs.com&subject=Texan%20Core%20Solutions%20Demo%20Request';

const VALUES = [
  ['Texan Values', 'We bring discipline, loyalty, and accountability to every file.'],
  ['Proven Processes', 'Structured legal-operations workflows reduce bottlenecks and rework.'],
  ['Experienced Professionals', 'PI-focused support teams understand pre-litigation pressure points.'],
  ['Nationwide Support', 'Remote operations support for law firms across the United States.'],
  ['Growth Focused', 'Designed to help firms increase capacity without adding internal staff.'],
  ['Trusted Partner', 'Built for confidential, long-term operational partnership.'],
];

const CORE_VALUES = [
  ['Hard Work', 'We believe in earning trust through effort, dedication, and discipline.'],
  ['Loyalty', 'We stand by our clients, our team, and our word.'],
  ['Respect', 'We value people, relationships, and the impact we make.'],
  ['Accountability', 'We own our responsibilities and deliver on our commitments.'],
  ['Experienced. Committed. Trusted.', 'Backed by proven professionals who treat your cases with care and attention.'],
];

export default function MarketingPage() {
  return (
    <main className="texan-site">
      <div className="texan-topbar">
        <span>Proudly serving personal injury law firms nationwide</span>
      </div>

      <nav className="texan-nav" aria-label="Primary navigation">
        <a className="texan-logo" href="#home" aria-label="Texan Core Solutions home">
          <span className="texan-mark">TCS</span>
          <span>
            <b>Texan</b>
            <small>Core Solutions</small>
          </span>
        </a>
        <div className="texan-links">
          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#services">Services</a>
          <a href={DEMO_EMAIL}>Schedule a Demo</a>
          <Link href="/login">Client/Firm Portal</Link>
        </div>
      </nav>

      <section className="texan-hero" id="home">
        <div className="texan-hero-copy">
          <h1>
            <span>Texan Values.</span>
            Nationwide Support.
          </h1>
          <h2>Helping personal injury law firms scale without hiring more staff</h2>
          <p>
            Texan Core Solutions provides pre-litigation and legal operations support that integrates into
            your systems and workflows to keep cases moving, improve client communication, and reduce
            operational bottlenecks.
          </p>
          <div className="texan-cta-row">
            <a className="btn" href={DEMO_EMAIL}>Schedule a Consultation</a>
            <Link className="btn secondary" href="/login">Open Demo Portal</Link>
          </div>
        </div>
        <div className="texan-hero-art" aria-label="Nationwide Texan Core Solutions support">
          <img className="texan-hero-map-img" src="/texan-assets/hero-us-map-houston-client.png" alt="United States support map with Texan Core Solutions mark over Houston skyline" />
        </div>
      </section>

      <section className="texan-icon-strip" aria-label="Texan Core Solutions differentiators">
        {VALUES.map(([title, body]) => (
          <article key={title}>
            <div className="texan-line-icon" />
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="texan-image-strip texan-stats-image" id="about" aria-label="Texan Core Solutions nationwide support metrics">
        <img src="/texan-assets/stats-strip.png" alt="We support PI law firms across the nation. 10 plus years experience, 500 plus firms supported, 100 percent PI focused support, nationwide." />
      </section>

      <section className="texan-image-strip texan-services-image" id="services" aria-label="Pre-litigation and legal operations support services">
        <img src="/texan-assets/services-strip.png" alt="What we do: pre-litigation and legal operations support services." />
      </section>

      <section className="texan-values-live" aria-label="Texan Core Values">
        <h2>Texan Core Values</h2>
        <div className="texan-core-grid">
          {CORE_VALUES.map(([title, body]) => (
            <article key={title}>
              <div className="texan-core-icon" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="texan-image-strip texan-founders" aria-label="Meet your co-founders">
        <img src="/texan-assets/cofounders-strip.png" alt="Meet your co-founders: Richelle Bauman and Jacqueline Maldonado." />
      </section>

      <footer className="texan-footer">
        <div>
          <b>Texan Core Solutions</b>
          <span>Strategy. Growth. Guidance. Support.</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#services">Services</a>
          <a href={DEMO_EMAIL}>Schedule a Demo</a>
          <Link href="/login">Client/Firm Portal</Link>
        </nav>
      </footer>
    </main>
  );
}
