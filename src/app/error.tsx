"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container section" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "2rem" }}>This page couldn’t load</h1>
      <p className="lede">There was a problem reaching our servers. Check your connection and try again.</p>
      <button className="btn" onClick={reset}>Try again</button>
    </div>
  );
}
