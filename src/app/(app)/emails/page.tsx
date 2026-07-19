import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { buildManagerEmail } from "@/lib/email";
import { formatDate, noticeLabel } from "@/lib/display";
import {
  EmailList,
  ResultBanner,
  type EmailView,
} from "@/components/email-list";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EmailsPage(props: {
  searchParams: Promise<{ created?: string; flipped?: string }>;
}) {
  const sp = await props.searchParams;
  const ranCheck = sp.created !== undefined || sp.flipped !== undefined;

  const checkIns = await db.checkIn.findMany({
    include: { contractor: true },
    orderBy: { sentAt: "desc" },
  });

  const emails: EmailView[] = checkIns.map((ci) => {
    const email = buildManagerEmail(ci.contractor, ci);
    return {
      id: ci.id,
      fromAddress: email.fromAddress,
      toName: email.toName,
      toAddress: email.toAddress,
      subject: email.subject,
      question: email.question,
      notice: noticeLabel(email.daysBefore),
      sentAtLabel: formatDate(email.sentAt),
      response: email.response,
      respondedAtLabel: email.respondedAt ? formatDate(email.respondedAt) : null,
      extendUrl: email.extendUrl,
      endUrl: email.endUrl,
    };
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Emails"
        description={`${emails.length} generated, newest first. Nothing is sent — each is rendered exactly as the manager would receive it, with links authorized by a per-check-in token.`}
      />

      {ranCheck ? (
        <div className="mt-6">
          <ResultBanner
            created={Number(sp.created ?? 0)}
            flipped={Number(sp.flipped ?? 0)}
          />
        </div>
      ) : null}

      <div className="mt-6">
        {emails.length === 0 ? (
          <EmptyState icon={Inbox} title="No emails generated yet">
            Run the daily check from the dashboard to generate the first
            manager check-ins.
          </EmptyState>
        ) : (
          <EmailList emails={emails} />
        )}
      </div>
    </main>
  );
}
