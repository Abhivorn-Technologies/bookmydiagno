import Link from "next/link";
import { LogoMark } from "./Icons";

export function SiteFooter() {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <div className="row" style={{ marginBottom: 12 }}>
              <LogoMark />
              <strong style={{ color: "#fff", fontFamily: "var(--font-head)", fontSize: "1.15rem" }}>BookMyDiagno</strong>
            </div>
            <p style={{ maxWidth: "38ch" }}>Book diagnostic tests at a branch near you, see prices before you book, and keep every booking in one place.</p>
            {(phone || email) && (
              <p>
                {phone && <><a href={`tel:${phone}`}>{phone}</a><br /></>}
                {email && <a href={`mailto:${email}`}>{email}</a>}
              </p>
            )}
          </div>
          <div>
            <h4>Book</h4>
            <ul>
              <li><Link href="/tests">All tests</Link></li>
              <li><Link href="/tests?kind=PACKAGE">Health packages</Link></li>
              <li><Link href="/branches">Find a branch</Link></li>
              <li><Link href="/booking">Your booking</Link></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><Link href="/dashboard">My bookings</Link></li>
              <li><Link href="/login">Log in</Link></li>
              <li><Link href="/register">Create account</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} BookMyDiagno. All rights reserved.</span>
          <span>Online payments on this site are in demo mode — no real money is charged.</span>
        </div>
      </div>
    </footer>
  );
}
