import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoMark } from "./Icons";
import { HeaderNav } from "./HeaderNav";

export async function SiteHeader() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <header className="site-header">
      <div className="container bar">
        <Link href="/" className="brand" aria-label="BookMyDiagno home">
          <LogoMark />
          <span>BookMy<b>Diagno</b></span>
        </Link>
        <HeaderNav user={user ? { name: user.name, role: user.role } : null} />
      </div>
    </header>
  );
}
