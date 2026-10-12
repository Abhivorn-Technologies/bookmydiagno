import { getActiveBranches } from "@/lib/queries";
import { formatSlot } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const branches = await getActiveBranches().catch(() => []);
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <div className="container section-tight">
      <h1 style={{ fontSize: "2.2rem" }}>Contact us</h1>
      <p className="lede">For questions about a booking, call the branch you booked at — they can see your booking reference.</p>
      {(phone || email) && (
        <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
          <h3>Customer support</h3>
          {phone && <p style={{ margin: 0 }}>Phone: <a href={`tel:${phone}`}>{phone}</a></p>}
          {email && <p style={{ margin: 0 }}>Email: <a href={`mailto:${email}`}>{email}</a></p>}
        </div>
      )}
      <h2>Branches</h2>
      {branches.length === 0 ? (
        <div className="empty">Branch contact details will appear here once branches are added.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Branch</th><th>Address</th><th>Phone</th><th>Hours</th></tr></thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td>{b.address}, {b.city} {b.pincode}</td>
                  <td><a href={`tel:${b.phone.replace(/\s/g, "")}`}>{b.phone}</a></td>
                  <td>{formatSlot(b.openingHours.open)} – {formatSlot(b.openingHours.close)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
