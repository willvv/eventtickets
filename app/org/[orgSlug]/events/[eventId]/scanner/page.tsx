import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Event } from "@/models/Event";
import { QrScanner } from "@/components/scanner/qr-scanner";
import { OrgNavbar } from "@/components/layout/org-navbar";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orgSlug: string; eventId: string }>;
}

export default async function ScannerPage({ params }: PageProps) {
  const { orgSlug, eventId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  await connectDB();
  const org = await Organization.findOne({ slug: orgSlug });
  if (!org) redirect("/");

  const event = await Event.findOne({ _id: eventId, orgId: org._id });

  return (
    <div className="min-h-screen bg-gray-50">
      <OrgNavbar orgSlug={orgSlug} orgName={org.name} eventTitle={event?.title} eventId={eventId} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <QrScanner orgId={org._id.toString()} eventId={eventId} />
      </main>
    </div>
  );
}
