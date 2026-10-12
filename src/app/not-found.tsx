import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container section" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "2rem" }}>Page not found</h1>
      <p className="lede">The page or booking you’re looking for doesn’t exist, or you don’t have access to it.</p>
      <div className="row"><Link href="/" className="btn">Go to home</Link><Link href="/dashboard" className="btn btn-ghost">My bookings</Link></div>
    </div>
  );
}
