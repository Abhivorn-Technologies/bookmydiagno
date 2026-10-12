import { FAQS } from "@/lib/content";
export const metadata = { title: "Frequently asked questions" };

export default function FaqPage() {
  return (
    <div className="container section-tight faq" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: "2.2rem" }}>Frequently asked questions</h1>
      {FAQS.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
