// CORTA CUSTOMIZATION
// Agents: the expert's specialised assistants. Create one by describing its
// role in plain words, talk to it, or hand it a mission straight away.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { MessageSquare, Pencil, Plus, Rocket, Trash2, Users } from "lucide-react";

import { api } from "@/lib/api";

import { chatStore } from "../chat/chat-store";
import type { ChatLocationState } from "../chat/ChatView";
import { agentParam, agentSlug, agentSoul, refreshAgents, saveAgentLabel, useAgents, type Agent } from "../lib/agents";
import { errorText } from "../lib/brand-safe";
import { Badge, Button, Card, Dialog, EmptyState, Field, Notice, PageHeader, Spinner, TextArea, TextInput } from "../ui/primitives";

function initials(label: string): string {
  const words = label.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

const EXAMPLES = [
  {
    label: "Agent Urbanisme",
    description: "Analyse les règles d'urbanisme applicables à une parcelle.",
    instructions:
      "Pour chaque parcelle ou adresse, identifie le document d'urbanisme applicable (PLU, PLUi, carte communale), la zone, les règles principales (hauteur, emprise, reculs), les servitudes et les risques. Cite toujours tes sources et signale ce qui doit être vérifié en mairie.",
  },
  {
    label: "Agent Rédaction",
    description: "Met en forme les rapports d'expertise.",
    instructions:
      "Tu rédiges des rapports d'expertise foncière clairs et structurés : contexte et mission, description du bien, situation juridique et urbanistique, méthodes d'évaluation, conclusion chiffrée. Style sobre et professionnel.",
  },
  {
    label: "Agent Veille marché",
    description: "Suit les prix et les ventes d'un secteur.",
    instructions:
      "Tu suis les transactions et les prix du marché immobilier et foncier sur les secteurs que je t'indique, et tu présentes les évolutions dans des tableaux synthétiques avec les sources.",
  },
];

interface AgentForm {
  label: string;
  description: string;
  instructions: string;
}

const EMPTY_FORM: AgentForm = { label: "", description: "", instructions: "" };

function AgentFormFields({ form, onChange, nameLocked }: { form: AgentForm; onChange: (form: AgentForm) => void; nameLocked?: boolean }) {
  return (
    <div className="space-y-4">
      <Field label="Nom de l'agent" htmlFor="agent-label" hint={nameLocked ? undefined : "Par exemple : Agent Urbanisme, Agent Rédaction…"}>
        <TextInput id="agent-label" value={form.label} maxLength={60} onChange={(event) => onChange({ ...form, label: event.target.value })} />
      </Field>
      <Field label="Son rôle, en une phrase" htmlFor="agent-description">
        <TextInput
          id="agent-description"
          value={form.description}
          maxLength={160}
          placeholder="Ce que fait cet agent"
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </Field>
      <Field
        label="Ses instructions"
        htmlFor="agent-instructions"
        hint="Décrivez comme à un collaborateur : ce qu'il doit faire, comment, sur quel ton, ce qu'il doit éviter."
      >
        <TextArea
          id="agent-instructions"
          rows={8}
          value={form.instructions}
          onChange={(event) => onChange({ ...form, instructions: event.target.value })}
        />
      </Field>
    </div>
  );
}

function CreateAgentDialog({ open, onClose, existing }: { open: boolean; onClose: () => void; existing: Agent[] }) {
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slug = agentSlug(form.label);
  const taken = existing.some((agent) => agent.name === slug);

  const close = () => {
    setForm(EMPTY_FORM);
    setError(null);
    onClose();
  };

  const create = async () => {
    if (!slug || taken) return;
    setSaving(true);
    setError(null);
    try {
      await chatStore.whenReady();
      // Same call as Corta Desktop: cloned from the main assistant so the new agent
      // has the same AI service settings, with its own instructions.
      await chatStore.client.request("profiles.create", {
        name: slug,
        clone_from: "default",
        description: form.description.trim(),
        soul: agentSoul(form.label.trim(), form.instructions),
      });
      await saveAgentLabel(slug, form.label.trim());
      await refreshAgents();
      close();
    } catch (caught) {
      setError(errorText(caught, "L'agent n'a pas pu être créé."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      wide
      title="Créer un agent"
      description="Un agent est un assistant spécialisé, avec ses propres instructions, sa mémoire et ses compétences."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button onClick={() => void create()} loading={saving} disabled={!slug || taken}>
            Créer l'agent
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Partir d'un exemple</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => setForm(example)}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
        <AgentFormFields form={form} onChange={setForm} />
        {taken ? <Notice tone="warning">Un agent porte déjà ce nom.</Notice> : null}
        {error ? <Notice>{error}</Notice> : null}
      </div>
    </Dialog>
  );
}

function EditAgentDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [form, setForm] = useState<AgentForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    chatStore
      .whenReady()
      .then(() => chatStore.client.request<{ soul?: string; description?: string }>("profiles.describe", { name: agent.name }))
      .then((described) => {
        if (!cancelled) {
          setForm({ label: agent.label, description: described?.description ?? agent.description, instructions: described?.soul ?? "" });
        }
      })
      .catch((caught) => {
        if (cancelled) return;
        setForm({ label: agent.label, description: agent.description, instructions: "" });
        setError(errorText(caught, "Les instructions actuelles n'ont pas pu être lues."));
      });
    return () => {
      cancelled = true;
    };
  }, [agent]);

  const close = onClose;

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await chatStore.client.request("profiles.configure", {
        name: agent.name,
        soul: form.instructions.endsWith("\n") ? form.instructions : `${form.instructions}\n`,
        description: form.description.trim(),
      });
      if (!agent.isDefault && form.label.trim() && form.label.trim() !== agent.label) {
        await saveAgentLabel(agent.name, form.label.trim());
      }
      await refreshAgents();
      close();
    } catch (caught) {
      setError(errorText(caught, "Les modifications n'ont pas pu être enregistrées."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      wide
      title={`Modifier « ${agent.label} »`}
      description="Les nouvelles instructions s'appliquent aux prochaines discussions avec cet agent."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button onClick={() => void save()} loading={saving} disabled={!form}>
            Enregistrer
          </Button>
        </>
      }
    >
      {form ? (
        <div className="space-y-4">
          {agent.isDefault ? (
            <div className="space-y-4">
              <Field label="Son rôle, en une phrase" htmlFor="agent-description">
                <TextInput id="agent-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </Field>
              <Field label="Ses instructions" htmlFor="agent-instructions">
                <TextArea id="agent-instructions" rows={12} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} />
              </Field>
            </div>
          ) : (
            <AgentFormFields form={form} onChange={setForm} nameLocked />
          )}
          {error ? <Notice tone="warning">{error}</Notice> : null}
        </div>
      ) : (
        <Spinner label="Chargement…" />
      )}
    </Dialog>
  );
}

function MissionDialog({ agent, onClose }: { agent: Agent | null; onClose: () => void }) {
  const navigate = useNavigate();
  const [mission, setMission] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setMission("");
    setError(null);
    onClose();
  };

  const launch = async () => {
    if (!agent || !mission.trim()) return;
    setSending(true);
    setError(null);
    try {
      const profile = agentParam(agent);
      const key = await chatStore.startNew(profile, mission.trim());
      close();
      navigate(`/c/${encodeURIComponent(key)}${profile ? `?agent=${encodeURIComponent(profile)}` : ""}`);
    } catch (caught) {
      setError(errorText(caught, "La mission n'a pas pu être lancée."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={Boolean(agent)}
      onClose={close}
      title={agent ? `Confier une mission à « ${agent.label} »` : ""}
      description="L'agent se met au travail tout de suite ; vous suivez son avancement dans la discussion."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button onClick={() => void launch()} loading={sending} disabled={!mission.trim()}>
            <Rocket aria-hidden className="h-4 w-4" />
            Lancer
          </Button>
        </>
      }
    >
      <Field label="Quelle est la mission ?" htmlFor="mission">
        <TextArea
          id="mission"
          rows={6}
          value={mission}
          placeholder="Ex. : Prépare une note sur les règles d'urbanisme de la parcelle AB 123 à Lyon 3e."
          onChange={(event) => setMission(event.target.value)}
        />
      </Field>
      {error ? (
        <div className="mt-3">
          <Notice>{error}</Notice>
        </div>
      ) : null}
    </Dialog>
  );
}

function DeleteAgentDialog({ agent, onClose }: { agent: Agent | null; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!agent) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteProfile(agent.name);
      await refreshAgents();
      onClose();
    } catch (caught) {
      setError(errorText(caught, "L'agent n'a pas pu être supprimé."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={Boolean(agent)}
      onClose={onClose}
      title={agent ? `Supprimer « ${agent.label} » ?` : ""}
      description="Ses instructions, sa mémoire et ses discussions seront définitivement supprimées."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" onClick={() => void remove()} loading={deleting}>
            Supprimer
          </Button>
        </>
      }
    >
      {error ? <Notice>{error}</Notice> : <p className="text-sm">Cette action est irréversible.</p>}
    </Dialog>
  );
}

function AgentCard({
  agent,
  onTalk,
  onMission,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  onTalk: () => void;
  onMission: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-sm font-semibold">{initials(agent.label)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-semibold">{agent.label}</h2>
            {agent.isDefault ? <Badge tone="brand">Principal</Badge> : null}
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {agent.description || (agent.isDefault ? "Votre assistant de tous les jours." : "Aucune description.")}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {agent.skillCount} compétence{agent.skillCount > 1 ? "s" : ""}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onMission}>
          <Rocket aria-hidden className="h-4 w-4" />
          Lancer une mission
        </Button>
        <Button size="sm" variant="outline" onClick={onTalk}>
          <MessageSquare aria-hidden className="h-4 w-4" />
          Discuter
        </Button>
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label={`Modifier ${agent.label}`} title="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
          {!agent.isDefault ? (
            <Button size="icon" variant="ghost" onClick={onDelete} aria-label={`Supprimer ${agent.label}`} title="Supprimer">
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default function AgentsPage() {
  const navigate = useNavigate();
  const { agents, loading, error } = useAgents();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [mission, setMission] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);

  const talk = (agent: Agent) => navigate("/", { state: { agent: agent.name } satisfies ChatLocationState });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        <PageHeader
          title="Agents"
          description="Vos assistants spécialisés. Chacun a ses propres instructions, sa mémoire et ses compétences. Confiez-leur une mission ou discutez avec eux."
          actions={
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden className="h-4 w-4" />
              Créer un agent
            </Button>
          }
        />

        {error ? <Notice>{error}</Notice> : null}
        {loading && !agents.length ? <Spinner label="Chargement des agents…" /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              onTalk={() => talk(agent)}
              onMission={() => setMission(agent)}
              onEdit={() => setEditing(agent)}
              onDelete={() => setDeleting(agent)}
            />
          ))}
        </div>

        {!loading && agents.length <= 1 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="Créez votre premier agent spécialisé"
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden className="h-4 w-4" />
                Créer un agent
              </Button>
            }
          >
            Par exemple un agent dédié à l'urbanisme, à la rédaction de vos rapports ou à la veille du marché.
          </EmptyState>
        ) : null}
      </div>

      <CreateAgentDialog open={creating} onClose={() => setCreating(false)} existing={agents} />
      {editing ? <EditAgentDialog key={editing.name} agent={editing} onClose={() => setEditing(null)} /> : null}
      <MissionDialog agent={mission} onClose={() => setMission(null)} />
      <DeleteAgentDialog agent={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
