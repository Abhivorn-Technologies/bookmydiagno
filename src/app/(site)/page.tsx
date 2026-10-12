import Link from "next/link";
import { getActiveBranches, getPopularTests, hasHomeCollection } from "@/lib/queries";
import { FAQS } from "@/lib/content";
import { TestCard } from "@/components/TestCard";
import { BranchFinder } from "@/components/BranchFinder";
import { Slip } from "@/components/Slip";
import { ClockIcon, HomeVanIcon, ReceiptIcon, SearchIcon, ShieldIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [popular, branches, homeCollection] = await Promise.all([
    getPopularTests(6).catch(() => []),
    getActiveBranches().catch(() => []),
    hasHomeCollection().catch(() => false),
  ]);

  return (
    <>
      <section className="hero">
        <div className="container wrap">
          <div>
            <h1>Book Your Diagnostic Test Online</h1>
            <p className="lede">
              Choose your tests, pick a branch near you and a time that suits you. Prices are shown before you book, and your
              confirmation is ready the moment you finish.
            </p>
            <form action="/tests" method="get" className="search-bar" role="search">
              <label htmlFor="hero-q" className="sr-only">Search tests and packages</label>
              <input id="hero-q" name="q" className="input" placeholder="Search tests, e.g. thyroid, CBC, vitamin D" autoComplete="off" />
              <button className="btn" type="submit"><SearchIcon size={18} /> Search</button>
            </form>
            <div className="hero-facts">
              <span><ReceiptIcon /> Price shown upfront</span>
              <span><ClockIcon /> Choose your own slot</span>
              <span><ShieldIcon /> Pay online or at the branch</span>
            </div>
          </div>
          <div className="hero-slip" aria-label="Example of a booking confirmation">
            <Slip
              title="Booking confirmation"
              status={<span className="badge badge-teal" style={{ background: "#fff" }}>Confirmed</span>}
              rows={[
                { k: "Tests", v: "Complete Blood Count, Lipid Profile" },
                { k: "Branch", v: "Your chosen branch" },
                { k: "Date & time", v: "Tomorrow, 8:30 AM" },
                { k: "Preparation", v: "10–12 hrs fasting" },
                { k: "Payment", v: "Pay at branch" },
              ]}
              reference="BMD-XXXXXX-XXXXX"
              footnote="This is what you get after booking"
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Popular tests and packages</h2>
              <p className="muted" style={{ margin: 0 }}>Most booked by our patients. Add one or more, then pick a branch.</p>
            </div>
            <Link href="/tests" className="btn btn-ghost">See all tests</Link>
          </div>
          {popular.length ? (
            <div className="grid grid-3">{popular.map((t) => <TestCard key={t.id} test={t} />)}</div>
          ) : (
            <div className="empty"><h3>Tests will appear here soon</h3><p className="muted">Our test catalogue is being set up. Please check back shortly.</p></div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>How booking works</h2>
          <ol className="steps">
            <li><h3>Choose tests</h3><p>Search by name or browse categories. Each test shows its price and preparation.</p></li>
            <li><h3>Pick a branch</h3><p>Use your location to find the nearest branch, or search by PIN code or city.</p></li>
            <li><h3>Select a slot</h3><p>See which times are open on the day you want and choose one.</p></li>
            <li><h3>Confirm and pay</h3><p>Pay online or at the branch. Your booking reference appears instantly.</p></li>
          </ol>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Branches near you</h2>
              <p className="muted" style={{ margin: 0 }}>Share your location to sort branches by distance — we don’t store it.</p>
            </div>
            <Link href="/branches" className="btn btn-ghost">All branches</Link>
          </div>
          <BranchFinder initialBranches={branches} mode="browse" limit={3} />
        </div>
      </section>

      {homeCollection && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="band">
              <HomeVanIcon />
              <div>
                <h3 style={{ marginBottom: 4 }}>Home sample collection</h3>
                <p style={{ margin: 0 }} className="muted">Some branches can collect your sample at home. Choose a branch marked “Home collection” and pick this option when you book.</p>
              </div>
              <Link href="/branches" className="btn btn-teal">See branches</Link>
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container grid grid-2" style={{ alignItems: "start", gap: 32 }}>
          <div>
            <h2>About BookMyDiagno</h2>
            <p className="lede">
              BookMyDiagno runs diagnostic branches where you can get blood tests and health checkups done with a booked slot instead of a queue.
              Book online in a few minutes, walk in at your time, and keep every receipt in your account.
            </p>
            <div className="row">
              <Link href="/about" className="btn btn-ghost">More about us</Link>
              <Link href="/contact" className="btn btn-ghost">Contact a branch</Link>
            </div>
          </div>
          <div className="faq">
            <h2>Common questions</h2>
            {FAQS.slice(0, 4).map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
            <p style={{ marginTop: 14 }}><Link href="/faq">Read all questions</Link></p>
          </div>
        </div>
      </section>
    </>
  );
}
