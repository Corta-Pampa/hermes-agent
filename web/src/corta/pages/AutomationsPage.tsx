// CORTA CUSTOMIZATION
// Automatisations: instructions an agent carries out on its own, on a
// schedule (a weekly market watch, a monthly summary…). Each run's result is
// a conversation in the sidebar, marked with a clock.

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Pencil, Play, Plus, Trash2 } from "lucide-react";

import { api, type CronJob } from "@/lib/api";

import { useAgents, type Agent } from "../lib/agents";
import { brandSafe, errorText } from "../lib/brand-safe";
import {
  buildSchedule,
  DEFAULT_SCHEDULE,
  describeForm,
  describeSchedule,
  formatDate,
  parseCronExpression,
  WEEKDAYS,
  type Frequency,
  type ScheduleForm,
} from "../lib/schedule-fr";
import { Badge, Button, Card, Dialog, EmptyState, Field, Notice, PageHeader, Spinner, Switch, TextArea, TextInput } from "../ui/primitives";

const FREQUENCIES: Array<{ value: Frequency; label: string }> = [
  { value: "daily", label: "Tous les jours" },
  { value: "weekdays", label: "Du lundi au vendredi" },
  { value: "weekly", label: "Chaque semaine" },
  { value: "monthly", label: "Chaque mois" },
  { value: "once", label: "Une seule fois" },
];

const SELECT_CLASS = "h-10 w-full rounded-lg border border-border bg-input px-3 text-sm";

const EXAMPLES = [
  {
    name: "Veille réglementaire",
    prompt: "Fais une synthèse des nouveautés de la semaine en droit de l'urbanisme et en droit foncier, avec les sources, en une page maximum.",
    schedule: { ...DEFAULT_SCHEDULE, frequency: "weekly" as const, weekday: 1, time: "08:30" },
  },
  {
    name: "Point mensuel du marché",
    prompt: "Prépare un point sur l'évolution des prix et des transactions immobilières et foncières dans mon secteur ce mois-ci, sous forme de tableau.",
    schedule: { ...DEFAULT_SCHEDULE, frequency: "monthly" as const, monthDay: 1, time: "09:00" },
  },
];

function jobProfile(job: CronJob): string {
  return job.profile || job.profile_name || "default";
}

interface JobForm {
  name: string;
  prompt: string;
  agent: string;
  schedule: ScheduleForm;
}

function JobEditor({ job, agents, onClose, onSaved }: { job: CronJob | null; agents: Agent[]; onClose: () => void; onSaved: () => void }) {
  const mainAgent = agents.find((agent) => agent.isDefault)?.name ?? "default";
  const [form, setForm] = useState<JobForm>(() => ({
    name: job?.name ?? "",
    prompt: job?.prompt ?? "",
    agent: job ? jobProfile(job) : mainAgent,
    schedule: (job?.schedule?.kind === "cron" && job.schedule.expr && parseCronExpression(job.schedule.expr)) || DEFAULT_SCHEDULE,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keepsCustomSchedule = Boolean(job && !(job.schedule?.kind === "cron" && job.schedule.expr && parseCronExpression(job.schedule.expr)));
  const [changeSchedule, setChangeSchedule] = useState(!keepsCustomSchedule);

  const setSchedule = (patch: Partial<ScheduleForm>) => setForm((current) => ({ ...current, schedule: { ...current.schedule, ...patch } }));
  const valid = form.name.trim() && form.prompt.trim() && (form.schedule.frequency !== "once" || form.schedule.date);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const mutation = {
        name: form.name.trim(),
        prompt: form.prompt.trim(),
        ...(changeSchedule ? { schedule: buildSchedule(form.schedule) } : {}),
      };
      if (job) await api.updateCronJob(job.id, mutation, jobProfile(job));
      else await api.createCronJob({ ...mutation, schedule: buildSchedule(form.schedule), deliver: "local" }, form.agent);
      onSaved();
      onClose();
    } catch (caught) {
      setError(errorText(caught, "L'automatisation n'a pas pu être enregistrée."));
    } finally {
      setSaving(false);
    }
  };

  const s = form.schedule;

  return (
    <Dialog
      open
      onClose={onClose}
      wide
      title={job ? "Modifier l'automatisation" : "Nouvelle automatisation"}
      description="L'agent exécutera cette consigne tout seul, au moment prévu. Le résultat apparaîtra dans vos discussions."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => void save()} loading={saving} disabled={!valid}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!job ? (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.name}
                type="button"
                onClick={() => setForm((current) => ({ ...current, name: example.name, prompt: example.prompt, schedule: example.schedule }))}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
              >
                {example.name}
              </button>
            ))}
          </div>
        ) : null}
        <Field label="Nom" htmlFor="job-name">
          <TextInput id="job-name" value={form.name} maxLength={80} placeholder="Ex. : Veille réglementaire" onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        {agents.length > 1 && !job ? (
          <Field label="Agent" htmlFor="job-agent">
            <select id="job-agent" className={SELECT_CLASS} value={form.agent} onChange={(event) => setForm({ ...form, agent: event.target.value })}>
              {agents.map((agent) => (
                <option key={agent.name} value={agent.name}>
                  {agent.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Que doit faire l'agent ?" htmlFor="job-prompt">
          <TextArea id="job-prompt" rows={5} value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} />
        </Field>

        {changeSchedule ? (
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-medium">Quand ?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fréquence" htmlFor="job-frequency">
                <select id="job-frequency" className={SELECT_CLASS} value={s.frequency} onChange={(event) => setSchedule({ frequency: event.target.value as Frequency })}>
                  {FREQUENCIES.map((frequency) => (
                    <option key={frequency.value} value={frequency.value}>
                      {frequency.label}
                    </option>
                  ))}
                </select>
              </Field>
              {s.frequency === "weekly" ? (
                <Field label="Jour" htmlFor="job-weekday">
                  <select id="job-weekday" className={SELECT_CLASS} value={s.weekday} onChange={(event) => setSchedule({ weekday: Number(event.target.value) })}>
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <option key={day} value={day}>
                        {WEEKDAYS[day].charAt(0).toUpperCase() + WEEKDAYS[day].slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {s.frequency === "monthly" ? (
                <Field label="Jour du mois" htmlFor="job-monthday">
                  <select id="job-monthday" className={SELECT_CLASS} value={s.monthDay} onChange={(event) => setSchedule({ monthDay: Number(event.target.value) })}>
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={day}>
                        {day === 1 ? "1er" : day}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {s.frequency === "once" ? (
                <Field label="Date" htmlFor="job-date">
                  <TextInput id="job-date" type="date" value={s.date} onChange={(event) => setSchedule({ date: event.target.value })} />
                </Field>
              ) : null}
              <Field label="Heure" htmlFor="job-time">
                <TextInput id="job-time" type="time" value={s.time} onChange={(event) => setSchedule({ time: event.target.value || "09:00" })} />
              </Field>
            </div>
            <p className="text-sm text-muted-foreground">{describeForm(s)}</p>
          </fieldset>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 text-sm">
            <span>{describeSchedule(job?.schedule, job?.schedule_display)}</span>
            <Button size="sm" variant="outline" onClick={() => setChangeSchedule(true)}>
              Changer
            </Button>
          </div>
        )}
        {error ? <Notice>{error}</Notice> : null}
      </div>
    </Dialog>
  );
}

function statusBadge(job: CronJob) {
  if (job.state === "running") return <Badge tone="brand">En cours</Badge>;
  if (!job.enabled) return <Badge>En pause</Badge>;
  if (job.last_status === "error" || job.last_error) return <Badge tone="danger">Dernière exécution en échec</Badge>;
  if (job.last_status === "ok" || job.last_status === "success") return <Badge tone="success">Dernière exécution réussie</Badge>;
  return <Badge tone="neutral">Programmée</Badge>;
}

export default function AutomationsPage() {
  const { agents, byName } = useAgents();
  const [jobs, setJobs] = useState<CronJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ job: CronJob | null } | null>(null);
  const [deleting, setDeleting] = useState<CronJob | null>(null);

  const load = useCallback(() => {
    api
      .getCronJobs("all")
      .then((list) => {
        setJobs(list.filter((job) => !job.no_agent));
        setError(null);
      })
      .catch((caught) => setError(errorText(caught, "Les automatisations n'ont pas pu être chargées.")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: () => Promise<unknown>, done?: string) => {
    try {
      await action();
      if (done) setNotice(done);
      load();
    } catch (caught) {
      setError(errorText(caught, "L'action n'a pas pu aboutir."));
    }
  };

  const agentLabel = (job: CronJob) => {
    const agent = byName(jobProfile(job) === "default" ? null : jobProfile(job));
    return agent?.label ?? brandSafe(job.profile_name ?? jobProfile(job));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8">
        <PageHeader
          title="Automatisations"
          description="Des consignes que vos agents exécutent seuls, au moment prévu : une veille chaque lundi, un point de marché chaque mois… Les résultats arrivent dans vos discussions."
          actions={
            <Button onClick={() => setEditor({ job: null })}>
              <Plus aria-hidden className="h-4 w-4" />
              Nouvelle automatisation
            </Button>
          }
        />

        {error ? <Notice onDismiss={() => setError(null)}>{error}</Notice> : null}
        {notice ? (
          <Notice tone="info" onDismiss={() => setNotice(null)}>
            {notice}
          </Notice>
        ) : null}
        {!jobs && !error ? <Spinner label="Chargement des automatisations…" /> : null}

        {jobs && !jobs.length ? (
          <EmptyState
            icon={<CalendarClock className="h-8 w-8" />}
            title="Aucune automatisation"
            action={
              <Button onClick={() => setEditor({ job: null })}>
                <Plus aria-hidden className="h-4 w-4" />
                Nouvelle automatisation
              </Button>
            }
          >
            Programmez une tâche récurrente : une veille réglementaire, un suivi des ventes de votre secteur, un récapitulatif hebdomadaire…
          </EmptyState>
        ) : null}

        <div className="space-y-3">
          {(jobs ?? []).map((job) => {
            const profile = jobProfile(job);
            return (
              <Card key={`${profile}:${job.id}`} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{brandSafe(job.name || "Automatisation")}</h2>
                      {statusBadge(job)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {describeSchedule(job.schedule, job.schedule_display)}
                      {agents.length > 1 ? ` · ${agentLabel(job)}` : ""}
                    </p>
                    {job.prompt ? <p className="mt-2 line-clamp-2 text-sm">{job.prompt}</p> : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {job.enabled && job.next_run_at ? `Prochaine exécution : ${formatDate(job.next_run_at)}` : ""}
                      {job.enabled && job.next_run_at && job.last_run_at ? " · " : ""}
                      {job.last_run_at ? `Dernière : ${formatDate(job.last_run_at)}` : ""}
                    </p>
                  </div>
                  <Switch
                    checked={job.enabled}
                    label={job.enabled ? "Mettre en pause" : "Réactiver"}
                    onChange={(enabled) =>
                      void act(() => (enabled ? api.resumeCronJob(job.id, profile) : api.pauseCronJob(job.id, profile)))
                    }
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void act(() => api.triggerCronJob(job.id, profile), "C'est parti : le résultat apparaîtra dans vos discussions dans quelques instants.")
                    }
                  >
                    <Play aria-hidden className="h-3.5 w-3.5" />
                    Exécuter maintenant
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditor({ job })}>
                    <Pencil aria-hidden className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(job)}>
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    Supprimer
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {editor ? <JobEditor key={editor.job?.id ?? "new"} job={editor.job} agents={agents} onClose={() => setEditor(null)} onSaved={load} /> : null}

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Supprimer cette automatisation ?"
        description={deleting ? brandSafe(deleting.name || "") : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const job = deleting;
                setDeleting(null);
                if (job) void act(() => api.deleteCronJob(job.id, jobProfile(job)));
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm">Les discussions déjà produites par cette automatisation sont conservées.</p>
      </Dialog>
    </div>
  );
}
