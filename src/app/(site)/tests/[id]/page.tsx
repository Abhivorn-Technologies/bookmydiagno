import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveTest } from "@/lib/queries";
import { formatINR } from "@/lib/format";
import { AddToBookingButton } from "@/components/TestCard";
import { BookingBar } from "@/components/BookingBar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const test = await getActiveTest((await params).id).catch(() => null);
  return { title: test?.name ?? "Test not found" };
}

export default async function TestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const test = await getActiveTest((await params).id);
  if (!test) notFound();
  return (
    <div className="container section-tight">
      <p className="small"><Link href="/tests">All tests</Link> / {test.category}</p>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 28, alignItems: "start" }}>
        <article className="stack" style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="chip">{test.kind === "PACKAGE" ? "Health package" : "Test"}</span>
            <span className="chip chip-outline">{test.category}</span>
            <span className="chip chip-outline">Code {test.testCode}</span>
          </div>
          <h1 style={{ fontSize: "2.1rem", maxWidth: "24ch" }}>{test.name}</h1>
          {test.description && <p className="lede">{test.description}</p>}
          <div className="card">
            <h3>Before your test</h3>
            <p style={{ margin: 0 }}>{test.preparationInstructions || "No special preparation is needed for this test."}</p>
          </div>
          {test.kind === "PACKAGE" && test.includes.length > 0 && (
            <div className="card">
              <h3>What’s included ({test.includes.length})</h3>
              <ul style={{ margin: 0, paddingLeft: 20, columns: 2, columnGap: 32 }}>
                {test.includes.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          )}
        </article>
        <aside className="card card-pad-lg" style={{ position: "sticky", top: 88 }}>
          <div className="muted small">Price</div>
          <div style={{ fontFamily: "var(--font-head)", fontSize: "2rem", fontWeight: 700 }} className="money">{formatINR(test.price)}</div>
          {test.reportTime && <p className="small muted">Report usually ready in {test.reportTime}</p>}
          <div className="stack" style={{ marginTop: 16 }}>
            <AddToBookingButton id={test.id} size="md" />
            <Link href="/booking" className="btn btn-ghost btn-block">Go to booking</Link>
          </div>
        </aside>
      </div>
      <BookingBar />
      <style>{`@media (max-width: 820px){ .container > .grid { grid-template-columns: 1fr !important; } aside.card { position: static !important; } }`}</style>
    </div>
  );
}
