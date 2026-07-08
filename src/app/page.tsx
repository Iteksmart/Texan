import Link from 'next/link';

const SERVICE_AREAS = [
  ['Intake & Client Onboarding', 'Qualification, onboarding, and file setup that keeps every new matter moving.'],
  ['Medical Records & Bills', 'Retrieval, review, organization, and follow-up for records and billing packets.'],
  ['Treatment Coordination', 'Treatment monitoring, appointment tracking, and client follow-up support.'],
  ['Client Communications', 'Status updates, case progression support, and client touchpoints.'],
  ['Investigations', 'Photos, videos, witness statements, FOIA requests, and supporting evidence.'],
  ['Demand Preparation', 'Record compilation, demand package support, and attorney-ready handoff.'],
  ['Settlement Support', 'Lien verification, disbursement preparation, and closing coordination.'],
];

const VALUES = [
  ['Texan Values', 'We bring discipline, loyalty, and accountability to every file.'],
  ['Proven Processes', 'Structured legal-operations workflows reduce bottlenecks and rework.'],
  ['Experienced Professionals', 'PI-focused support teams understand pre-litigation pressure points.'],
  ['Nationwide Support', 'Remote operations support for law firms across the United States.'],
  ['Growth Focused', 'Designed to help firms increase capacity without adding internal staff.'],
  ['Trusted Partner', 'Built for confidential, long-term operational partnership.'],
];

export default function MarketingPage() {
  return (
    <main className="texan-site">
      <div className="texan-topbar">
        <a href="tel:+15125649925">(512) 564-9925</a>
        <a href="mailto:rbauman@texancs.com">rbauman@texancs.com</a>
        <span>Proudly serving personal injury law firms nationwide</span>
        <Link href="/login">Client Login</Link>
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
          <a href="#demo">Schedule a Demo</a>
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
            <a className="btn" href="#demo">Schedule a Consultation</a>
            <a className="btn secondary" href="#services">Our Services</a>
          </div>
        </div>
        <div className="texan-hero-art" aria-label="Nationwide Texan Core Solutions support">
          <img className="texan-hero-map-img" src="/texan-assets/hero-us-map-enhanced.png" alt="United States support map with Texan Core Solutions mark" />
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

      <section className="texan-section" id="services">
        <p className="eyebrow">What We Do</p>
        <h2>Pre-Litigation & Legal Operations Support</h2>
        <div className="texan-service-grid">
          {SERVICE_AREAS.map(([title, body]) => (
            <article key={title}>
              <div className="texan-line-icon" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="texan-image-strip texan-values-band" aria-label="Texan Core Values">
        <img src="/texan-assets/values-strip.png" alt="Texan Core Values: hard work, loyalty, respect, accountability, experienced, committed, trusted." />
      </section>

      <section className="texan-image-strip texan-founders" aria-label="Meet your co-founders">
        <img src="/texan-assets/cofounders-strip.png" alt="Meet your co-founders: Richelle Bauman and Jacqueline Maldonado." />
      </section>

      <section className="texan-demo" id="demo">
        <div>
          <p className="eyebrow">Schedule a Demo</p>
          <h2>Show your firm how NextUp supports the Texan workflow</h2>
          <p>
            Use the secure demo portal to walk law firms through case pipelines, file health, reports,
            billing, and client-facing visibility.
          </p>
        </div>
        <div className="texan-demo-actions">
          <Link className="btn" href="/login">Open Demo Portal</Link>
          <a className="btn secondary" href="mailto:rbauman@texancs.com?subject=Texan%20Core%20Solutions%20Demo%20Request">
            Email Demo Request
          </a>
        </div>
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
          <a href="#demo">Schedule a Demo</a>
          <Link href="/login">Client/Firm Portal</Link>
        </nav>
      </footer>
    </main>
  );
}
