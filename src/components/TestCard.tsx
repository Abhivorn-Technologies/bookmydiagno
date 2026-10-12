"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { formatINR } from "@/lib/format";
import type { TestDTO } from "@/types";

export function AddToBookingButton({ id, size = "sm" }: { id: string; size?: "sm" | "md" }) {
  const cart = useCart();
  const added = cart.ready && cart.has(id);
  return (
    <button
      type="button"
      className={`btn ${added ? "btn-ghost" : "btn-teal"} ${size === "sm" ? "btn-sm" : ""}`}
      aria-pressed={added}
      onClick={() => cart.toggle(id)}
    >
      {added ? "Added ✓ Remove" : "Add to booking"}
    </button>
  );
}

export function TestCard({ test }: { test: TestDTO }) {
  return (
    <article className="card test-card">
      <div className="top">
        <div>
          <div className="row" style={{ gap: 6, marginBottom: 6 }}>
            <span className="chip">{test.kind === "PACKAGE" ? "Package" : test.category}</span>
            {test.kind === "PACKAGE" && <span className="chip chip-outline">{test.category}</span>}
          </div>
          <h3><Link href={`/tests/${test.id}`}>{test.name}</Link></h3>
        </div>
        <div className="price money">{formatINR(test.price)}</div>
      </div>
      {test.description && <p className="desc">{test.description}</p>}
      {test.kind === "PACKAGE" && test.includes.length > 0 && (
        <p className="small muted" style={{ margin: 0 }}>Includes {test.includes.length} tests</p>
      )}
      <p className="prep"><strong>Preparation:</strong> {test.preparationInstructions || "No special preparation needed."}</p>
      <div className="actions">
        <span className="small muted">{test.reportTime ? `Report in ${test.reportTime}` : "Available at all branches"}</span>
        <AddToBookingButton id={test.id} />
      </div>
    </article>
  );
}
