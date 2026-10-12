const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,150 for whole rupees, ₹650.50 when there are paise. */
export const formatINR = (amount: number) => {
  const n = Math.round((amount || 0) * 100) / 100;
  return Number.isInteger(n) ? inrWhole.format(n) : inrPaise.format(n);
};

export const formatDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export const roundMoney = (n: number) => Math.round(n * 100) / 100;

export const maskPhone = (p: string) => (p && p.length >= 10 ? `${p.slice(0, 2)}******${p.slice(-2)}` : p);
