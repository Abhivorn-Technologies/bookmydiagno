// Small inline icon set (stroke icons, inherit currentColor)
type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const LogoMark = ({ size = 30 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#0B5394" />
    <path d="M12 7h8M13.5 7v11.5a2.5 2.5 0 0 0 5 0V7" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M13.5 14h5v4.5a2.5 2.5 0 0 1-5 0Z" fill="#5ED3CF" />
    <circle cx="23.5" cy="22.5" r="3" fill="#5ED3CF" />
  </svg>
);
export const SearchIcon = ({ size = 20 }: P) => (<svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const PinIcon = ({ size = 18 }: P) => (<svg {...base(size)}><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
export const ClockIcon = ({ size = 18 }: P) => (<svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const PhoneIcon = ({ size = 18 }: P) => (<svg {...base(size)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>);
export const HomeIcon = ({ size = 18 }: P) => (<svg {...base(size)}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></svg>);
export const ShieldIcon = ({ size = 18 }: P) => (<svg {...base(size)}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const ReceiptIcon = ({ size = 18 }: P) => (<svg {...base(size)}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></svg>);
export const CartIcon = ({ size = 18 }: P) => (<svg {...base(size)}><path d="M9 3v6.5L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 9.5V3" /><path d="M8 3h8M7 14h10" /></svg>);
export const LocateIcon = ({ size = 18 }: P) => (<svg {...base(size)}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></svg>);
export const HomeVanIcon = ({ size = 40 }: P) => (<svg {...base(size)} strokeWidth={1.5}><path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z" /><circle cx="6" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /><path d="M6 9.5v4M4 11.5h4" /></svg>);
