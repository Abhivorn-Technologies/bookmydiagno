export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <div className="container section-tight" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: "2.2rem" }}>Privacy policy</h1>
      <p className="muted">This summary explains what BookMyDiagno collects through this website and why. The business owner should review it with their legal adviser before launch.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, mobile number and a password. Passwords are stored only as a secure one-way hash; nobody, including our staff, can read them.</li>
        <li><strong>Booking details:</strong> the tests you book, the branch, date and time, the patient’s name, and optionally age, gender and a home-collection address.</li>
        <li><strong>Payment records:</strong> payment method, amount and status. We do not collect or store card numbers. Online payments on this website currently run in demo mode.</li>
      </ul>
      <h2>Your location</h2>
      <p>If you choose “Use my location”, your browser shares your approximate position with us only to sort branches by distance. It is not saved to our database or linked to your account. You can always search by PIN code or city instead.</p>
      <h2>How we use it</h2>
      <p>We use your information only to manage your bookings, contact you about them, and keep records required to run the branches. We don’t sell your data.</p>
      <h2>Phone verification</h2>
      <p>This version does not send OTPs, so mobile numbers are not verified.</p>
      <h2>Cookies</h2>
      <p>We use a single essential cookie to keep you logged in. Your selected tests are kept in your browser’s local storage until you book.</p>
      <h2>Your choices</h2>
      <p>To correct or delete your account information, contact any branch or our support team.</p>
    </div>
  );
}
