import Link from "next/link";
export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container section-tight" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: "2.2rem" }}>About BookMyDiagno</h1>
      <p className="lede">BookMyDiagno is a network of diagnostic branches that lets you book blood tests and health checkups online, so you arrive at a set time instead of waiting in a queue.</p>
      <h2>What you can do here</h2>
      <ul>
        <li>See every test and package with its price and preparation instructions.</li>
        <li>Find the branch nearest to you and check its opening hours.</li>
        <li>Pick an available time slot and get your booking reference straight away.</li>
        <li>Pay online or at the branch, and keep printable receipts in your account.</li>
      </ul>
      <h2>Our branches</h2>
      <p>Each branch lists its address, phone number, hours and services on the <Link href="/branches">branches page</Link>. Some branches also offer home sample collection.</p>
    </div>
  );
}
