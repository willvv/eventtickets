"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface OrgNavbarProps {
  orgSlug: string;
  orgName: string;
  eventTitle?: string;
  eventId?: string;
}

export function OrgNavbar({ orgSlug, orgName, eventTitle, eventId }: OrgNavbarProps) {
  const pathname = usePathname();

  const topLinks = [
    { href: `/org/${orgSlug}`, label: "Panel", exact: true },
    { href: `/org/${orgSlug}/events`, label: "Eventos" },
    { href: `/org/${orgSlug}/orders`, label: "Órdenes" },
    { href: `/org/${orgSlug}/members`, label: "Miembros" },
    { href: `/org/${orgSlug}/settings`, label: "Config" },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header style={{ backgroundColor: "#1B426E" }} className="text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top row: logo + org name + main nav */}
        <div className="flex items-center gap-4 h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo-32.png" alt="Entradas CR" width={28} height={28} className="rounded" />
            <span className="font-bold text-sm hidden sm:block" style={{ color: "#00CDB9" }}>
              Entradas CR
            </span>
          </Link>

          <div className="w-px h-6 bg-white/20 shrink-0" />

          <span className="font-semibold text-sm text-white/90 truncate max-w-[140px]">{orgName}</span>

          <nav className="flex items-center gap-1 ml-auto overflow-x-auto">
            {topLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(link.href, link.exact)
                    ? "text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                style={isActive(link.href, link.exact) ? { backgroundColor: "#00CDB9" } : {}}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Breadcrumb row for event sub-pages */}
        {eventTitle && eventId && (
          <div className="flex items-center gap-2 pb-2 text-xs text-white/60">
            <Link href={`/org/${orgSlug}/events`} className="hover:text-white/90">
              Eventos
            </Link>
            <span>/</span>
            <Link href={`/org/${orgSlug}/events/${eventId}`} className="hover:text-white/90 truncate max-w-[200px]">
              {eventTitle}
            </Link>
            {pathname.includes("/tickets") && (
              <>
                <span>/</span>
                <span className="text-white/90">Entradas</span>
              </>
            )}
            {pathname.includes("/scanner") && (
              <>
                <span>/</span>
                <span className="text-white/90">Escáner</span>
              </>
            )}
            {pathname.includes("/layout-editor") && (
              <>
                <span>/</span>
                <span className="text-white/90">Editor de Mapa</span>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
