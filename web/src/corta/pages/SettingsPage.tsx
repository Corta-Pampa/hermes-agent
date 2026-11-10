// CORTA CUSTOMIZATION
// Réglages: what the expert may want to adjust in this browser. Everything
// about the AI service and the server is the integrator's (see corta/docs/WEB.md).

import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

import { useChatSelector } from "../chat/chat-store";
import { setAppearance, useAppearance, type Appearance } from "../lib/appearance";
import { CortaLogo } from "../ui/logo";
import { Card, PageHeader } from "../ui/primitives";

const APPEARANCES: Array<{ value: Appearance; label: string; icon: typeof Sun }> = [
  { value: "system", label: "Automatique", icon: Monitor },
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
];

export default function SettingsPage() {
  const { appearance } = useAppearance();
  const connected = useChatSelector((store) => store.connection) === "open";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8">
        <PageHeader title="Réglages" />

        <Card className="p-5">
          <h2 className="font-semibold">Apparence</h2>
          <p className="mt-1 text-sm text-muted-foreground">« Automatique » suit le réglage clair ou sombre de votre ordinateur.</p>
          <div role="radiogroup" aria-label="Apparence" className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
            {APPEARANCES.map((option) => {
              const active = appearance === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAppearance(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-sm transition",
                    active ? "border-primary bg-accent font-medium" : "border-border hover:bg-accent",
                  )}
                >
                  <option.icon aria-hidden className="h-5 w-5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">À propos</h2>
          <div className="mt-4 flex items-center gap-4">
            <CortaLogo className="h-8 w-auto" />
            <div className="text-sm">
              <p>Votre assistant IA et vos agents, sur le serveur de votre cabinet.</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", connected ? "bg-success" : "bg-warning")} aria-hidden />
                {connected ? "Connecté au serveur" : "Connexion au serveur en cours"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Vos discussions, agents, compétences et automatisations sont les mêmes que dans l'application Corta pour ordinateur.
          </p>
        </Card>
      </div>
    </div>
  );
}
