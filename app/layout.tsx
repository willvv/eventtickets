import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { NextIntlClientProvider } from "next-intl";
import { RootProviders } from "@/components/layout/root-providers";
import messages from "@/messages/es-CR.json";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entradas CR",
  description: "Plataforma de venta y gestión de entradas para eventos en Costa Rica",
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
        <NextIntlClientProvider messages={messages} locale="es-CR">
          <RootProviders session={session}>{children}</RootProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
