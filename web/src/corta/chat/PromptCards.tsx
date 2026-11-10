// CORTA CUSTOMIZATION
// Cards for what the agent is waiting on: an authorisation, answers to its
// questions, or a value to type (password, key). Each answers its gateway
// request exactly once.

import { useState } from "react";
import type { ServerRequest } from "@hermes/shared";
import { ChevronDown, ChevronRight, HelpCircle, KeyRound, ShieldAlert } from "lucide-react";

import { approvalSentence, choiceLabel } from "../lib/approval-fr";
import { brandSafe } from "../lib/brand-safe";
import { Button, TextArea, TextInput } from "../ui/primitives";

type Answer = (request: ServerRequest, result: Record<string, unknown>) => void;

const str = (value: unknown): string => (typeof value === "string" ? value : "");

const APPROVAL_LABELS: Record<string, string> = {
  once: "Autoriser",
  session: "Autoriser pour cette discussion",
  always: "Toujours autoriser",
  deny: "Refuser",
};

function CardShell({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" role="group" aria-label={title}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="text-foreground">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function ApprovalCard({ request, onAnswer }: { request: ServerRequest; onAnswer: Answer }) {
  const [showDetails, setShowDetails] = useState(false);
  const params = request.params;
  const technical = brandSafe(str(params.description).trim());
  const command = str(params.command).trim();
  const details = [technical, command].filter(Boolean).join("\n\n");
  const offered = Array.isArray(params.choices) ? (params.choices as unknown[]).map(String) : ["once", "session", "deny"];
  const choices = offered.filter((choice) => APPROVAL_LABELS[choice]);

  return (
    <CardShell icon={<ShieldAlert className="h-4 w-4" />} title="L'agent demande votre accord">
      <p className="text-sm">{approvalSentence(technical)}</p>
      {details ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={showDetails}
          >
            {showDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Détails techniques
          </button>
          {showDetails ? (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
              {details}
            </pre>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Button
            key={choice}
            size="sm"
            variant={choice === "deny" ? "outline" : choice === "once" ? "primary" : "secondary"}
            onClick={() => onAnswer(request, { choice })}
          >
            {APPROVAL_LABELS[choice]}
          </Button>
        ))}
      </div>
    </CardShell>
  );
}

interface Question {
  qid: string;
  question: string;
  choices: string[];
  multi: boolean;
}

function readQuestions(params: Record<string, unknown>): Question[] {
  const raw = Array.isArray(params.questions) ? (params.questions as unknown[]) : [];
  return raw
    .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {}))
    .filter((entry) => str(entry.qid) && str(entry.question).trim())
    .map((entry) => ({
      qid: str(entry.qid),
      question: str(entry.question).trim(),
      choices: Array.isArray(entry.choices) ? (entry.choices as unknown[]).filter((c): c is string => typeof c === "string") : [],
      multi: entry.multi_select === true,
    }));
}

function QuestionCard({ request, onAnswer }: { request: ServerRequest; onAnswer: Answer }) {
  const questions = readQuestions(request.params);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});

  const answerFor = (question: Question): string => {
    const free = (typed[question.qid] ?? "").trim();
    const chosen = picked[question.qid] ?? [];
    return [...chosen, ...(free ? [free] : [])].join(", ");
  };
  const complete = questions.every((question) => answerFor(question));

  const toggle = (question: Question, choice: string) => {
    setPicked((current) => {
      const list = current[question.qid] ?? [];
      if (!question.multi) return { ...current, [question.qid]: list[0] === choice ? [] : [choice] };
      return { ...current, [question.qid]: list.includes(choice) ? list.filter((c) => c !== choice) : [...list, choice] };
    });
  };

  return (
    <CardShell icon={<HelpCircle className="h-4 w-4" />} title={questions.length > 1 ? "L'agent a quelques questions" : "L'agent a une question"}>
      <div className="space-y-4">
        {questions.map((question) => (
          <div key={question.qid} className="space-y-2">
            <p className="text-sm font-medium">{question.question}</p>
            {question.choices.length ? (
              <div className="flex flex-wrap gap-2">
                {question.choices.map((choice) => {
                  const active = (picked[question.qid] ?? []).includes(choice);
                  // The server marks the agent's recommended option "(Recommended)".
                  const { label, recommended } = choiceLabel(choice);
                  return (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(question, choice)}
                      className={
                        "rounded-full border px-3 py-1 text-sm transition " +
                        (active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent")
                      }
                    >
                      {label}
                      {recommended ? <span className="ml-1.5 text-xs opacity-75">· recommandé</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <TextArea
              rows={question.choices.length ? 1 : 2}
              className="min-h-0"
              placeholder={question.choices.length ? "Autre réponse (facultatif)" : "Votre réponse"}
              value={typed[question.qid] ?? ""}
              onChange={(event) => setTyped((current) => ({ ...current, [question.qid]: event.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!complete}
          onClick={() => onAnswer(request, { answers: Object.fromEntries(questions.map((q) => [q.qid, answerFor(q)])) })}
        >
          Répondre
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAnswer(request, {})}>
          Passer
        </Button>
      </div>
    </CardShell>
  );
}

function ValueCard({ request, onAnswer }: { request: ServerRequest; onAnswer: Answer }) {
  const [value, setValue] = useState("");
  const isSudo = request.method === "sudo";
  const prompt = brandSafe(str(request.params.prompt).trim());
  const title = isSudo ? "Mot de passe administrateur demandé" : "Une information confidentielle est demandée";
  const lead = isSudo
    ? "L'agent a besoin du mot de passe administrateur du serveur pour continuer. Si vous ne le connaissez pas, ignorez cette demande."
    : prompt || "L'agent a besoin d'une clé ou d'un identifiant pour continuer.";

  return (
    <CardShell icon={<KeyRound className="h-4 w-4" />} title={title}>
      <p className="text-sm">{lead}</p>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onAnswer(request, { value });
        }}
      >
        <TextInput
          type="password"
          autoComplete="off"
          aria-label={title}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="max-w-xs flex-1"
        />
        <Button type="submit" size="sm" disabled={!value}>
          Valider
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAnswer(request, { value: "" })}>
          Ignorer
        </Button>
      </form>
    </CardShell>
  );
}

export function PromptCards({ requests, onAnswer }: { requests: readonly ServerRequest[]; onAnswer: Answer }) {
  if (!requests.length) return null;
  return (
    <div className="space-y-3">
      {requests.map((request) => {
        if (request.method === "approval") return <ApprovalCard key={request.id} request={request} onAnswer={onAnswer} />;
        if (request.method === "clarify") return <QuestionCard key={request.id} request={request} onAnswer={onAnswer} />;
        return <ValueCard key={request.id} request={request} onAnswer={onAnswer} />;
      })}
    </div>
  );
}
