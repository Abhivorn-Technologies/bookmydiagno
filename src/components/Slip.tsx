// The requisition-slip visual used in the hero and for booking receipts.

function barsFor(text: string) {
  let seed = 0;
  for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < 34; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    bars.push(1 + (seed % 3));
  }
  return bars;
}

export function Barcode({ value }: { value: string }) {
  return (
    <div className="barcode" aria-hidden="true">
      {barsFor(value).map((w, i) => (
        <i key={i} style={{ width: w, opacity: i % 5 === 4 ? 0.35 : 1 }} />
      ))}
    </div>
  );
}

export function Slip({
  title,
  status,
  rows,
  reference,
  footnote,
}: {
  title: string;
  status?: React.ReactNode;
  rows: { k: string; v: React.ReactNode }[];
  reference: string;
  footnote?: React.ReactNode;
}) {
  return (
    <div className="slip">
      <div className="slip-head">
        <strong>{title}</strong>
        {status}
      </div>
      <div className="slip-body">
        {rows.map((r) => (
          <div className="slip-row" key={r.k}>
            <span>{r.k}</span>
            <span>{r.v}</span>
          </div>
        ))}
      </div>
      <div className="slip-perf"><i /></div>
      <div className="slip-foot">
        <div>
          <div className="small muted">Booking reference</div>
          <div className="slip-ref">{reference}</div>
          {footnote && <div className="small muted" style={{ marginTop: 4 }}>{footnote}</div>}
        </div>
        <Barcode value={reference} />
      </div>
    </div>
  );
}
