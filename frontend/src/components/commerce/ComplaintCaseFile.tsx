"use client";

import { useEffect, useState, type FormEvent } from "react";
import RecordShell from "@/components/ui/RecordShell";
import SickoButton from "@/components/ui/SickoButton";
import { getComplaintCase, replyComplaint } from "@/lib/customerApi";
import { humanizeStatus } from "@/lib/commerce";
import type { ComplaintCase } from "@/types/commerce";

export default function ComplaintCaseFile({ caseReference }: { caseReference: string }) {
  const [record, setRecord] = useState<ComplaintCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [signal, setSignal] = useState("");

  useEffect(() => {
    let alive = true;
    getComplaintCase(caseReference).then((result) => {
      if (alive) {
        setRecord(result);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [caseReference]);

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const message = String(form.get("message") ?? "").trim();
    if (message.length < 2) return;

    setSending(true);
    setSignal("");
    try {
      const next = await replyComplaint(record.reference, message);
      setRecord(next);
      formElement.reset();
    } catch (error) {
      setSignal(error instanceof Error ? error.message : "REPLY COULD NOT BE FILED.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <RecordShell index="07" eyebrow="SUPPORT CASE / ACCESSING" title="OPENING CASE">
        <div className="h-px w-full animate-pulse bg-blood-accent" />
      </RecordShell>
    );
  }

  if (!record) {
    return (
      <RecordShell index="00" eyebrow="SUPPORT CASE / NO MATCH" title="CASE NOT FOUND" subtitle="The case reference could not be located.">
        <SickoButton href="/#complaints" tone="blood">OPEN COMPLAINT DESK</SickoButton>
      </RecordShell>
    );
  }

  const canReply = record.status !== "CLOSED" && record.status !== "REJECTED";

  return (
    <RecordShell
      index="07"
      eyebrow={`SUPPORT CASE / ${record.reference}`}
      title="CASE FILE"
      subtitle={`${humanizeStatus(record.status)} / ${record.category.toUpperCase()}`}
    >
      <div className="grid gap-10 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="space-y-3">
            {record.messages.map((message) => {
              const customer = message.senderType === "CUSTOMER";
              return (
                <article key={message.id} className={`border p-5 md:p-6 ${customer ? "ml-auto border-blood-accent/50 bg-blood-accent/10 md:w-[85%]" : "mr-auto border-bone-white/15 bg-off-black md:w-[85%]"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <span className={`font-body text-[0.68rem] font-semibold uppercase tracking-[0.17em] ${customer ? "text-blood-accent" : "text-bone-white"}`}>{message.senderType}</span>
                    <time className="font-body text-xs text-concrete-gray">{new Date(message.createdAt).toLocaleString()}</time>
                  </div>
                  <p className="mt-4 font-body text-[1.08rem] leading-[1.55] text-bone-white/70">{message.message}</p>
                </article>
              );
            })}
          </div>

          {canReply && (
            <form onSubmit={reply} className="mt-8 border-l-2 border-blood-accent bg-off-black p-6">
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">ADD TO CASE</span>
              <textarea required name="message" rows={5} placeholder="WRITE YOUR REPLY" className="mt-5 block w-full resize-none border border-bone-white/15 bg-black p-4 font-body text-base text-bone-white outline-none focus:border-blood-accent" />
              {signal && <p className="mt-3 font-body text-sm font-semibold uppercase tracking-[0.12em] text-blood-accent">{signal}</p>}
              <div className="mt-5 max-w-sm"><SickoButton type="submit" tone="blood" full disabled={sending}>{sending ? "FILING..." : "FILE REPLY"}</SickoButton></div>
            </form>
          )}
        </div>

        <aside className="h-fit border border-bone-white/15 bg-off-black p-6 xl:sticky xl:top-28 xl:col-span-4">
          <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">CASE METADATA</span>
          <dl className="mt-5 divide-y divide-bone-white/10">
            <div className="py-4"><dt className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-concrete-gray">STATUS</dt><dd className="mt-2 font-display text-2xl tracking-crushed">{humanizeStatus(record.status)}</dd></div>
            <div className="py-4"><dt className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-concrete-gray">CATEGORY</dt><dd className="mt-2 font-body text-lg font-semibold uppercase">{record.category}</dd></div>
            {record.orderReference && <div className="py-4"><dt className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-concrete-gray">ORDER</dt><dd className="mt-2 font-body text-lg font-semibold">{record.orderReference}</dd></div>}
            <div className="py-4"><dt className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-concrete-gray">CONTACT</dt><dd className="mt-2 break-all font-body text-base">{record.contactEmail}</dd></div>
          </dl>
        </aside>
      </div>
    </RecordShell>
  );
}
