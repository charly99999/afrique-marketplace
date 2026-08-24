import { useAuth } from "@/_core/hooks/useAuth";
import { Bell, CircleUserRound, MessageCircle, Plus, Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BrandMark } from "./BrandMark";
import { trpc } from "@/lib/trpc";

type MarketplaceShellProps = { children: ReactNode; title?: string; action?: ReactNode };

export function MarketplaceShell({ children, title, action }: MarketplaceShellProps) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const notifications = trpc.marketplace.notifications.list.useQuery(undefined, { enabled: isAuthenticated });
  const unread = notifications.data?.filter(item => !item.readAt).length ?? 0;

  return (
    <div className="marketplace-app">
      <header className="site-header">
        <div className="site-header__inner">
          <BrandMark />
          <nav className="desktop-nav" aria-label="Navigation principale">
            <Link href="/" className={location === "/" ? "active" : ""}>Découvrir</Link>
            <Link href="/annonces" className={location === "/annonces" ? "active" : ""}>Annonces</Link>
            <Link href="/messages" className={location === "/messages" ? "active" : ""}>Messages</Link>
          </nav>
          <div className="header-actions">
            {isAuthenticated ? (
              <>
                <Link href="/vendre" className="button button--gold button--small"><Plus size={16} /> Publier</Link>
                <Link href="/profil" className="icon-button" aria-label="Mon profil"><CircleUserRound size={21} /></Link>
                <Link href="/messages" className="icon-button notification-button" aria-label="Mes alertes"><Bell size={20} />{unread > 0 && <span>{unread}</span>}</Link>
              </>
            ) : (
              <Link href="/compte" className="button button--outline">Accéder à mon espace</Link>
            )}
          </div>
        </div>
      </header>

      {(title || action) && (
        <div className="page-bar">
          <div className="page-wrap page-bar__inner">
            <div>{title && <h1>{title}</h1>}</div>
            {action}
          </div>
        </div>
      )}

      <main>{children}</main>
      <nav className="mobile-dock" aria-label="Navigation mobile">
        <Link href="/" className={location === "/" ? "active" : ""}><Search size={19} /><span>Explorer</span></Link>
        <Link href="/annonces" className={location === "/annonces" ? "active" : ""}><ShieldCheck size={19} /><span>Annonces</span></Link>
        <Link href="/vendre" className="mobile-dock__create" aria-label="Publier une annonce"><Plus size={22} /></Link>
        <Link href="/messages" className={location === "/messages" ? "active" : ""}><MessageCircle size={19} /><span>Messages</span></Link>
        <Link href="/profil" className={location === "/profil" ? "active" : ""}><CircleUserRound size={19} /><span>Profil</span></Link>
      </nav>
    </div>
  );
}
