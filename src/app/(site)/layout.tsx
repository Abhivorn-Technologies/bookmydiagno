import { CartProvider } from "@/components/CartProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
