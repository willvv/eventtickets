import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { RootProviders } from "@/components/layout/root-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entradas CR",
  description: "Plataforma de venta y gestión de entradas para eventos en Costa Rica",
  icons: {
    icon: [
      { url: "/logo-16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: { url: "/logo-180.png", sizes: "180x180", type: "image/png" },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions).catch(() => null);

  return (
    <html lang="es-CR" suppressHydrationWarning>
      <body>
        <RootProviders session={session}>{children}</RootProviders>
      </body>
    </html>
  );
}
