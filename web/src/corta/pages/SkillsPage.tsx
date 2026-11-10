// CORTA CUSTOMIZATION
// Compétences: the working methods an agent applies when a request calls for
// them. The firm writes its own (its procedures, its report templates…);
// built-in ones can be switched on or off per agent.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronRight, Pencil, Play, Plus, Search, Sparkles } from "lucide-react";

import { api, type SkillInfo } from "@/lib/api";

import type { ChatLocationState } from "../chat/ChatView";
import { agentParam, useAgents, type Agent } from "../lib/agents";
import { errorText } from "../lib/brand-safe";
import {
  buildSkillMarkdown,
  FIRM_CATEGORY,
  isEngineSkill,
  readSkillMarkdown,
  SKILL_DESCRIPTION_MAX,
  skillDescription,
  skillLabel,
  skillSlug,
  type SkillDraft,
} from "../lib/skills";
import { Button, Card, Dialog, EmptyState, Field, Notice, PageHeader, Spinner, Switch, TextArea, TextInput } from "../ui/primitives";

const EMPTY_DRAFT: SkillDraft = { label: "", whenToUse: "", howTo: "" };

const EXAMPLE: SkillDraft = {
  label: "Visite de terrain",
  whenToUse: "Préparer une visite de terrain ou un état des lieux.",
  howTo:
    "1. Rappelle l'adresse, la référence cadastrale et l'objet de la mission.\n" +
    "2. Liste les documents à emporter (plan cadastral, extrait du PLU, titre de propriété).\n" +
    "3. Prépare une check-list de points à observer : accès, réseaux, servitudes visibles, état des clôtures, voisinage.\n" +
    "4. Termine par les questions à poser au propriétaire.",
};

function SkillEditor({
  agent,
  skill,
  existing,
  onClose,
  onSaved,
}: {
  agent: Agent | undefined;
  skill: SkillInfo | null;
  existing: SkillInfo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(skill);
  const [draft, setDraft] = useState<SkillDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = agent?.name;

  useEffect(() => {
    if (!skill) return;
    let cancelled = false;
    api
      .getSkillContent(skill.name, profile)
      .then(({ content }) => {
        if (cancelled) return;
        const parsed = readSkillMarkdown(content);
        setDraft({ label: parsed.title ?? skillLabel(skill.name), whenToUse: parsed.whenToUse, howTo: parsed.howTo });
      })
      .catch((caught) => !cancelled && setError(errorText(caught, "La compétence n'a pas pu être lue.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [skill, profile]);

  const slug = skill?.name ?? skillSlug(draft.label);
  const taken = !editing && existing.some((entry) => entry.name === slug);
  const valid = Boolean(slug && draft.whenToUse.trim() && draft.howTo.trim()) && !taken;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const content = buildSkillMarkdown({ ...draft, label: draft.label.trim() || skillLabel(slug) });
      if (skill) await api.updateSkillContent(skill.name, content.replace(/^name: .*$/m, `name: ${skill.name}`), profile);
      else await api.createSkill({ name: slug, content, category: FIRM_CATEGORY }, profile);
      onSaved();
      onClose();
    } catch (caught) {
      setError(errorText(caught, "La compétence n'a pas pu être enregistrée."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      wide
      title={editing ? `Modifier « ${draft.label || skillLabel(skill?.name ?? "")} »` : "Créer une compétence"}
      description="Une compétence est une méthode de travail : l'agent l'applique quand votre demande correspond à la situation décrite."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => void save()} loading={saving} disabled={!valid || loading}>
            Enregistrer
          </Button>
        </>
      }
    >
      {loading ? (
        <Spinner label="Chargement…" />
      ) : (
        <div className="space-y-4">
          {!editing ? (
            <button type="button" onClick={() => setDraft(EXAMPLE)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">
              Voir un exemple
            </button>
          ) : null}
          <Field label="Nom de la compétence" htmlFor="skill-label">
            <TextInput
              id="skill-label"
              value={draft.label}
              maxLength={60}
              disabled={editing}
              placeholder="Ex. : Visite de terrain"
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            />
          </Field>
          <Field
            label="Quand l'utiliser ?"
            htmlFor="skill-when"
            hint={`Une phrase courte que l'agent lit pour savoir quand appliquer la compétence (${draft.whenToUse.length}/${SKILL_DESCRIPTION_MAX}).`}
          >
            <TextInput
              id="skill-when"
              value={draft.whenToUse}
              maxLength={SKILL_DESCRIPTION_MAX}
              placeholder="Ex. : Préparer une visite de terrain."
              onChange={(event) => setDraft({ ...draft, whenToUse: event.target.value })}
            />
          </Field>
          <Field label="Comment faire ?" htmlFor="skill-how" hint="Les étapes, les points de vigilance, le format attendu…">
            <TextArea id="skill-how" rows={10} value={draft.howTo} onChange={(event) => setDraft({ ...draft, howTo: event.target.value })} />
          </Field>
          {taken ? <Notice tone="warning">Une compétence porte déjà ce nom.</Notice> : null}
          {error ? <Notice>{error}</Notice> : null}
        </div>
      )}
    </Dialog>
  );
}

function SkillRow({
  skill,
  onToggle,
  onUse,
  onEdit,
}: {
  skill: SkillInfo;
  onToggle: (enabled: boolean) => void;
  onUse: () => void;
  onEdit?: () => void;
}) {
  const label = skillLabel(skill.name);
  return (
    <li className="flex items-start gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {skill.description ? <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{skillDescription(skill.description)}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onUse} disabled={!skill.enabled} title="Utiliser dans une nouvelle discussion">
          <Play aria-hidden className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Utiliser</span>
        </Button>
        {onEdit ? (
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label={`Modifier ${label}`} title="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
        <Switch checked={skill.enabled} onChange={onToggle} label={`${skill.enabled ? "Désactiver" : "Activer"} ${label}`} />
      </div>
    </li>
  );
}

type RowActions = Omit<Parameters<typeof SkillRow>[0], "skill">;

function FirmSkills({
  skills,
  searching,
  rowProps,
  onCreate,
}: {
  skills: SkillInfo[];
  searching: boolean;
  rowProps: (skill: SkillInfo) => RowActions;
  onCreate: () => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Compétences du cabinet</h2>
      {skills.length ? (
        <Card>
          <ul className="divide-y divide-border">
            {skills.map((skill) => (
              <SkillRow key={skill.name} skill={skill} {...rowProps(skill)} />
            ))}
          </ul>
        </Card>
      ) : searching ? (
        <EmptyState icon={<Sparkles className="h-8 w-8" />} title="Aucune compétence du cabinet ne correspond" />
      ) : (
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="Aucune compétence du cabinet pour l'instant"
          action={
            <Button onClick={onCreate}>
              <Plus aria-hidden className="h-4 w-4" />
              Créer une compétence
            </Button>
          }
        >
          Décrivez une de vos méthodes (visite de terrain, trame de rapport, contrôle d'un acte…) pour que vos agents l'appliquent.
        </EmptyState>
      )}
    </section>
  );
}

function BuiltInSkills({
  skills,
  open,
  onToggleOpen,
  rowProps,
}: {
  skills: SkillInfo[];
  open: boolean;
  onToggleOpen: () => void;
  rowProps: (skill: SkillInfo) => RowActions;
}) {
  return (
    <section className="space-y-3">
      <button type="button" onClick={onToggleOpen} aria-expanded={open} className="inline-flex items-center gap-1.5 text-sm font-semibold">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Compétences intégrées ({skills.length})
      </button>
      {open ? (
        <>
          <p className="text-sm text-muted-foreground">
            Fournies avec Corta, souvent techniques. Désactivez celles dont vos agents n'ont pas besoin : ils ne les utiliseront plus.
          </p>
          <Card>
            <ul className="divide-y divide-border">
              {skills.map((skill) => (
                <SkillRow key={skill.name} skill={skill} {...rowProps(skill)} />
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function AgentSelect({ agents, value, onChange }: { agents: Agent[]; value: string; onChange: (name: string) => void }) {
  if (agents.length < 2) return null;
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Agent</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-border bg-input px-3 text-sm">
        {agents.map((entry) => (
          <option key={entry.name} value={entry.name}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function SkillsPage() {
  const navigate = useNavigate();
  const { agents, byName } = useAgents();
  const [agentName, setAgentName] = useState<string | null>(null);
  const agent = byName(agentName);
  const [skills, setSkills] = useState<SkillInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showBuiltIn, setShowBuiltIn] = useState(false);
  const [editor, setEditor] = useState<{ skill: SkillInfo | null } | null>(null);

  const load = useCallback(() => {
    if (!agent) return;
    api
      .getSkills(agent.name)
      .then((list) => {
        setSkills(list.filter((skill) => !isEngineSkill(skill.name)));
        setError(null);
      })
      .catch((caught) => setError(errorText(caught, "Les compétences n'ont pas pu être chargées.")));
  }, [agent]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (skill: SkillInfo, enabled: boolean) => {
    setSkills((current) => current?.map((entry) => (entry.name === skill.name ? { ...entry, enabled } : entry)) ?? null);
    try {
      await api.toggleSkill(skill.name, enabled, agent?.name);
    } catch (caught) {
      setError(errorText(caught, "Le changement n'a pas pu être enregistré."));
      load();
    }
  };

  const startWithSkill = (skill: SkillInfo) =>
    navigate("/", {
      state: { agent: agentParam(agent), draft: `Utilise la compétence « ${skillLabel(skill.name)} » pour : ` } satisfies ChatLocationState,
    });

  const { firm, builtIn } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (skill: SkillInfo) =>
      !needle || skill.name.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle);
    const all = (skills ?? []).filter(matches);
    return {
      firm: all.filter((skill) => skill.category === FIRM_CATEGORY),
      builtIn: all.filter((skill) => skill.category !== FIRM_CATEGORY),
    };
  }, [skills, query]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8">
        <PageHeader
          title="Compétences"
          description="Les méthodes de travail de vos agents. Transmettez vos procédures, vos trames et vos réflexes : l'agent les applique quand la situation s'y prête."
          actions={
            <Button onClick={() => setEditor({ skill: null })} disabled={!agent}>
              <Plus aria-hidden className="h-4 w-4" />
              Créer une compétence
            </Button>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AgentSelect
            agents={agents}
            value={agent?.name ?? ""}
            onChange={(name) => {
              setAgentName(name);
              setSkills(null);
            }}
          />
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une compétence" className="pl-9" aria-label="Rechercher une compétence" />
          </div>
        </div>

        {error ? <Notice onDismiss={() => setError(null)}>{error}</Notice> : null}
        {!skills && !error ? <Spinner label="Chargement des compétences…" /> : null}

        {skills ? (
          <FirmSkills
            skills={firm}
            searching={Boolean(query)}
            rowProps={(skill) => ({ onToggle: (enabled) => void toggle(skill, enabled), onUse: () => startWithSkill(skill), onEdit: () => setEditor({ skill }) })}
            onCreate={() => setEditor({ skill: null })}
          />
        ) : null}

        {skills && builtIn.length ? (
          <BuiltInSkills
            skills={builtIn}
            open={showBuiltIn || Boolean(query)}
            onToggleOpen={() => setShowBuiltIn((open) => !open)}
            rowProps={(skill) => ({ onToggle: (enabled) => void toggle(skill, enabled), onUse: () => startWithSkill(skill) })}
          />
        ) : null}
      </div>

      {editor ? (
        <SkillEditor
          key={editor.skill?.name ?? "new"}
          agent={agent}
          skill={editor.skill}
          existing={skills ?? []}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
