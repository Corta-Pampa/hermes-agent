// CORTA CUSTOMIZATION
// The Corta web interface: talk to the assistant and its agents, manage the
// agents, their skills and scheduled tasks. Same server, same history and the
// same agents as Corta Desktop.

import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { CalendarClock, Clock, Menu, MessageSquarePlus, Settings, Sparkles, Users, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { ChatView } from "./chat/ChatView";
import { chatStore, useChatSelector } from "./chat/chat-store";
import { useConversations, type ConversationSummary } from "./chat/use-conversations";
import { useAgents } from "./lib/agents";
import { CortaLogo } from "./ui/logo";
import { Spinner } from "./ui/primitives";

const AgentsPage = lazy(() => import("./pages/AgentsPage"));
const SkillsPage = lazy(() => import("./pages/SkillsPage"));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/competences", label: "Compétences", icon: Sparkles },
  { to: "/automatisations", label: "Automatisations", icon: CalendarClock },
];

function conversationHref(conversation: Pick<ConversationSummary, "key" | "agent">): string {
  const agent = conversation.agent ? `?agent=${encodeURIComponent(conversation.agent)}` : "";
  return `/c/${encodeURIComponent(conversation.key)}${agent}`;
}

function sinceLabel(epochSeconds: number): string {
  const delta = Date.now() / 1000 - epochSeconds;
  if (delta < 60) return "à l'instant";
  if (delta < 3600) return `il y a ${Math.floor(delta / 60)} min`;
  if (delta < 86_400) return `il y a ${Math.floor(delta / 3600)} h`;
  if (delta < 7 * 86_400) return `il y a ${Math.floor(delta / 86_400)} j`;
  return new Date(epochSeconds * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function ConnectionDot() {
  const open = useChatSelector((store) => store.connection) === "open";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" title={open ? "Connecté au serveur" : "Connexion au serveur…"}>
      <span className={cn("h-2 w-2 rounded-full", open ? "bg-success" : "animate-pulse bg-warning")} aria-hidden />
      {open ? "Connecté" : "Connexion…"}
    </span>
  );
}

function Sidebar({ conversations, onNavigate }: { conversations: ConversationSummary[]; onNavigate: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const waiting = useChatSelector((store) => store.waitingKeys());
  const activeKey = pathname.startsWith("/c/") ? decodeURIComponent(pathname.slice(3)) : null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
      isActive ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <NavLink to="/" state={{}} onClick={onNavigate} aria-label="Accueil Corta">
          <CortaLogo className="h-7 w-auto" />
        </NavLink>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={() => {
            navigate("/", { state: {} });
            onNavigate();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <MessageSquarePlus aria-hidden className="h-4 w-4" />
          Nouvelle discussion
        </button>
      </div>

      <nav aria-label="Navigation principale" className="mt-3 space-y-0.5 px-3">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate} className={linkClass}>
            <item.icon aria-hidden className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <p className="px-6 pb-1.5 text-xs font-medium text-muted-foreground">Discussions récentes</p>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {conversations.length === 0 ? <li className="px-3 py-2 text-xs text-muted-foreground">Aucune discussion pour l'instant.</li> : null}
          {conversations.map((conversation) => {
            const active = conversation.key === activeKey;
            return (
              <li key={conversation.key}>
                <NavLink
                  to={conversationHref(conversation)}
                  onClick={onNavigate}
                  className={cn(
                    "group flex flex-col rounded-lg px-3 py-2 text-sm transition",
                    active ? "bg-accent text-foreground" : "text-foreground/85 hover:bg-accent",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {conversation.automated ? <Clock aria-label="Automatisation" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                    <span className="truncate">{conversation.title}</span>
                    {waiting.has(conversation.key) ? (
                      <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-warning" title="L'agent attend votre réponse" />
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {conversation.agentLabel ? `${conversation.agentLabel} · ` : ""}
                    {sinceLabel(conversation.lastActive)}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border px-3 py-2.5">
        <NavLink to="/reglages" onClick={onNavigate} className={linkClass}>
          <Settings aria-hidden className="h-4 w-4" />
          Réglages
        </NavLink>
        <span className="pr-2">
          <ConnectionDot />
        </span>
      </div>
    </div>
  );
}

function ChatRoute({ conversations }: { conversations: ConversationSummary[] }) {
  const { key } = useParams();
  const [params] = useSearchParams();
  const conversationKey = key ? decodeURIComponent(key) : null;
  const summary = conversationKey ? conversations.find((conversation) => conversation.key === conversationKey) : undefined;
  const agent = params.get("agent") || summary?.agent || null;
  return <ChatView conversationKey={conversationKey} agent={agent} title={summary?.title ?? null} />;
}

const TITLES: Record<string, string> = {
  "/agents": "Agents",
  "/competences": "Compétences",
  "/automatisations": "Automatisations",
  "/reglages": "Réglages",
};

export default function CortaApp() {
  const { agents } = useAgents();
  const { conversations } = useConversations(agents);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    chatStore.start();
  }, []);

  useEffect(() => {
    const section = TITLES[pathname];
    document.title = section ? `${section} · Corta` : "Corta";
  }, [pathname]);

  return (
    <div className="flex h-dvh min-h-0 bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="rounded-md p-1.5 text-foreground hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <CortaLogo className="h-6 w-auto" />
      </div>

      {mobileOpen ? (
        <button type="button" aria-label="Fermer le menu" className="fixed inset-0 z-40 bg-overlay lg:hidden" onClick={() => setMobileOpen(false)} />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-sidebar transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Menu"
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
          className="absolute top-4 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
        <Sidebar conversations={conversations} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        <Suspense fallback={<div className="p-8"><Spinner label="Chargement…" /></div>}>
          <Routes>
            <Route path="/" element={<ChatRoute conversations={conversations} />} />
            <Route path="/c/:key" element={<ChatRoute conversations={conversations} />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/competences" element={<SkillsPage />} />
            <Route path="/automatisations" element={<AutomationsPage />} />
            <Route path="/reglages" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
