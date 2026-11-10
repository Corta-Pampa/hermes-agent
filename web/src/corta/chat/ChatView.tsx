// CORTA CUSTOMIZATION
// A conversation with the main assistant or one of the expert's agents:
// the welcome screen for a new one, the transcript and composer otherwise.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Building2, ClipboardList, FileSearch, Landmark, Newspaper, Scale } from "lucide-react";

import { agentParam, useAgents, type Agent } from "../lib/agents";
import { errorText } from "../lib/brand-safe";
import { Notice, Spinner } from "../ui/primitives";
import { CortaMark } from "../ui/logo";
import { chatStore, useChatSelector } from "./chat-store";
import { Composer } from "./Composer";
import { Messages } from "./Messages";
import { PromptCards } from "./PromptCards";

export interface ChatLocationState {
  /** Text to put in the composer (a suggestion, a skill or agent shortcut). */
  draft?: string;
  /** Profile to start the new conversation with. */
  agent?: string | null;
}

const SUGGESTIONS = [
  {
    icon: Landmark,
    title: "Analyser une parcelle",
    text: "Analyse la parcelle cadastrale [référence] située à [commune] : zonage du PLU, servitudes, risques naturels et potentiel constructible.",
  },
  {
    icon: Scale,
    title: "Estimer un bien",
    text: "Aide-moi à estimer la valeur vénale de [type de bien] situé à [adresse], à partir des ventes comparables récentes.",
  },
  {
    icon: ClipboardList,
    title: "Préparer un rapport",
    text: "Rédige la trame d'un rapport d'expertise foncière pour [nature de la mission], avec les sections habituelles.",
  },
  {
    icon: Newspaper,
    title: "Faire une veille",
    text: "Fais une veille des dernières évolutions réglementaires en urbanisme et en droit foncier, avec les sources.",
  },
  {
    icon: FileSearch,
    title: "Résumer un document",
    text: "Résume ce document et liste les points d'attention pour un expert foncier : [collez le texte]",
  },
  {
    icon: Building2,
    title: "Comparer des biens",
    text: "Compare ces biens dans un tableau (surface, prix, prix au m², atouts, points faibles) : [liste des biens]",
  },
];

function useStickToBottom(dependency: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onScroll = () => {
      pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 140;
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element && pinned.current) element.scrollTop = element.scrollHeight;
  }, [dependency]);

  return ref;
}

function AgentPicker({ agents, value, onChange }: { agents: Agent[]; value: string; onChange: (name: string) => void }) {
  if (agents.length < 2) return null;
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
      <span className="text-muted-foreground">Avec</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent font-medium text-foreground focus:outline-none"
        aria-label="Agent à qui parler"
      >
        {agents.map((agent) => (
          <option key={agent.name} value={agent.name}>
            {agent.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NewConversation() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as ChatLocationState;
  const { agents, byName } = useAgents();
  const [agentName, setAgentName] = useState<string | null>(state.agent ?? null);
  const [draft, setDraft] = useState(state.draft ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agent = byName(agentName);
  const offline = useChatSelector((store) => store.connection) !== "open";

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      const profile = agentParam(agent);
      const key = await chatStore.startNew(profile, text);
      navigate(`/c/${encodeURIComponent(key)}${profile ? `?agent=${encodeURIComponent(profile)}` : ""}`);
    } catch (caught) {
      setError(errorText(caught, "La discussion n'a pas pu démarrer."));
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <CortaMark className="h-7 w-auto" inverted />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bonjour, que puis-je faire pour vous ?</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Posez une question, confiez une mission ou demandez un document.
            {agent && !agent.isDefault ? ` Vous parlez à l'agent « ${agent.label} ».` : ""}
          </p>
          <div className="mt-4">
            <AgentPicker agents={agents} value={agent?.name ?? ""} onChange={setAgentName} />
          </div>
        </div>

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => void send()}
          busy={sending}
          disabled={offline}
          autoFocus
          hint={offline ? "Connexion au serveur en cours…" : "Entrée pour envoyer · Maj + Entrée pour aller à la ligne"}
        />
        {error ? (
          <div className="mt-3">
            <Notice onDismiss={() => setError(null)}>{error}</Notice>
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.title}
              type="button"
              onClick={() => setDraft(suggestion.text)}
              className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition hover:border-foreground/30 hover:bg-accent"
            >
              <suggestion.icon aria-hidden className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
              <span className="text-sm font-medium">{suggestion.title}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{suggestion.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpenConversation({ conversationKey, agent, title }: { conversationKey: string; agent: string | null; title: string | null }) {
  const { byName } = useAgents();
  const [draft, setDraft] = useState("");
  const entry = useChatSelector((store) => store.get(conversationKey));
  const prompts = useChatSelector((store) => store.promptsFor(conversationKey));
  const online = useChatSelector((store) => store.connection) === "open";

  useEffect(() => {
    void chatStore.open(conversationKey, agent);
  }, [conversationKey, agent]);

  const state = entry?.state;
  const scrollRef = useStickToBottom(state);
  const agentInfo = byName(agent);
  const heading = state?.title || title || "Discussion";

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void chatStore.send(conversationKey, text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{heading}</h1>
          {agentInfo && !agentInfo.isDefault ? <p className="truncate text-xs text-muted-foreground">Agent : {agentInfo.label}</p> : null}
        </div>
        {state?.busy ? <Spinner label="L'agent travaille" /> : null}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {entry?.loading && !state?.items.length ? <Spinner label="Ouverture de la discussion…" /> : null}
          {entry?.loadError ? <Notice>{entry.loadError}</Notice> : null}
          {state ? <Messages items={state.items} busy={state.busy} status={state.status} /> : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-3 sm:px-6">
          <PromptCards requests={prompts} onAnswer={(request, result) => chatStore.answer(request, result)} />
          <Composer
            value={draft}
            onChange={setDraft}
            onSend={send}
            onStop={() => void chatStore.stop(conversationKey)}
            busy={Boolean(state?.busy)}
            disabled={!online || Boolean(entry?.loading)}
            placeholder={prompts.length ? "Répondez d'abord à l'agent ci-dessus…" : "Donnez une consigne ou posez une question…"}
            hint={online ? null : "Reconnexion au serveur…"}
          />
        </div>
      </div>
    </div>
  );
}

export function ChatView({ conversationKey, agent, title }: { conversationKey: string | null; agent: string | null; title: string | null }) {
  const location = useLocation();
  // Keyed by navigation: a new shortcut (sidebar "Nouvelle discussion", an
  // agent's "Discuter", a skill's "Utiliser") starts from a fresh screen.
  if (!conversationKey) return <NewConversation key={location.key} />;
  return <OpenConversation key={conversationKey} conversationKey={conversationKey} agent={agent} title={title} />;
}
