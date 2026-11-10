// CORTA CUSTOMIZATION
// The transcript: the expert's messages, the assistant's replies with the
// steps it took and the agents it put to work, and notices.

import { useState } from "react";
import { AlertTriangle, Bot, Check, ChevronDown, ChevronRight, CircleSlash, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge } from "../ui/primitives";
import { CortaMark } from "../ui/logo";
import type { AssistantItem, ChatItem, Delegation, Step } from "./conversation-model";
import { Markdown } from "./markdown";

function Steps({ steps, streaming }: { steps: Step[]; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const running = [...steps].reverse().find((step) => step.status === "running");
  const summary = running && streaming ? running.label : `${steps.length} étape${steps.length > 1 ? "s" : ""} réalisée${steps.length > 1 ? "s" : ""}`;

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex max-w-full items-center gap-1.5 rounded-md py-0.5 text-muted-foreground hover:text-foreground"
      >
        {running && streaming ? <Loader2 aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin" /> : open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">
          {summary}
          {running && streaming && running.detail ? ` · ${running.detail}` : ""}
          {running && streaming ? "…" : ""}
        </span>
      </button>
      {open ? (
        <ul className="mt-1 space-y-1 border-l border-border pl-4">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-muted-foreground">
              {step.status === "running" ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <Check aria-hidden className="h-3.5 w-3.5 text-success" />}
              <span>{step.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const DELEGATION_BADGE: Record<Delegation["status"], { label: string; tone: "neutral" | "success" | "danger" | "brand" }> = {
  pending: { label: "En attente", tone: "neutral" },
  running: { label: "Au travail", tone: "brand" },
  done: { label: "Terminé", tone: "success" },
  failed: { label: "Interrompu", tone: "danger" },
};

function Delegations({ delegations }: { delegations: Delegation[] }) {
  if (!delegations.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {delegations.map((delegation) => {
        const badge = DELEGATION_BADGE[delegation.status];
        return (
          <div key={delegation.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 font-medium">
                <Bot aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{delegation.goal}</span>
              </div>
              <Badge tone={badge.tone}>
                {delegation.status === "running" ? <Loader2 aria-hidden className="h-3 w-3 animate-spin" /> : null}
                {badge.label}
              </Badge>
            </div>
            {delegation.status === "running" && delegation.activity ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{delegation.activity}…</p>
            ) : null}
            {delegation.summary ? <p className="mt-1.5 line-clamp-4 text-xs text-muted-foreground">{delegation.summary}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function Typing() {
  return (
    <span className="corta-dots inline-flex items-center gap-1 text-muted-foreground" role="status" aria-label="L'agent réfléchit">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

function AssistantMessage({ item }: { item: AssistantItem }) {
  const empty = !item.text.trim() && !item.steps.length && !item.delegations.length;
  // While a step runs, its spinner shows the activity; the typing caret would sit idle.
  const working = item.steps.some((step) => step.status === "running");
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary sm:flex">
        <CortaMark className="h-4 w-auto" inverted />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <Steps steps={item.steps} streaming={item.streaming} />
        <Delegations delegations={item.delegations} />
        {item.text.trim() ? <Markdown text={item.text} streaming={item.streaming && !working} /> : null}
        {empty && item.streaming ? <Typing /> : null}
        {item.outcome === "interrupted" ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleSlash aria-hidden className="h-3.5 w-3.5" /> Arrêté à votre demande
          </p>
        ) : null}
        {item.outcome === "error" ? (
          <p className="inline-flex items-start gap-1.5 text-sm text-destructive">
            <XCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> {item.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function Messages({ items, busy, status }: { items: ChatItem[]; busy: boolean; status: string | null }) {
  const last = items[items.length - 1];
  const waitingForFirstWord = busy && (!last || last.kind === "user");

  return (
    <div className="space-y-6">
      {items.map((item) => {
        if (item.kind === "user") {
          return (
            <div key={item.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md border border-user-bubble-border bg-user-bubble px-4 py-2.5 text-sm whitespace-pre-wrap break-words">
                {item.text}
              </div>
            </div>
          );
        }
        if (item.kind === "notice") {
          return (
            <div key={item.id} className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{item.text}</span>
            </div>
          );
        }
        return <AssistantMessage key={item.id} item={item} />;
      })}
      {waitingForFirstWord ? (
        <div className={cn("flex gap-3")}>
          <div className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary sm:flex">
            <CortaMark className="h-4 w-auto" inverted />
          </div>
          <Typing />
        </div>
      ) : null}
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
    </div>
  );
}
