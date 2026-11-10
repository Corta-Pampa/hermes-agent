// CORTA CUSTOMIZATION
// Message box: Entrée envoie, Maj+Entrée va à la ligne; pendant que l'agent
// travaille, le bouton devient « Arrêter ».

import { useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_HEIGHT = 220;

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  disabled,
  placeholder = "Écrivez votre demande…",
  autoFocus = false,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  busy: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  hint?: string | null;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const canSend = !busy && !disabled && value.trim().length > 0;

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-border bg-card p-2 pl-4 shadow-sm transition",
          "focus-within:border-mint focus-within:ring-2 focus-within:ring-mint/30",
        )}
      >
        <textarea
          ref={ref}
          rows={1}
          value={value}
          placeholder={placeholder}
          aria-label="Votre message"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (canSend) onSend();
            }
          }}
          className="max-h-[220px] min-h-[2.25rem] flex-1 resize-none bg-transparent py-1.5 text-[0.95rem] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none"
        />
        {busy && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Arrêter l'agent"
            title="Arrêter"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90"
          >
            <Square aria-hidden className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Envoyer"
            title="Envoyer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-35"
          >
            <ArrowUp aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
      {hint ? <p className="px-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
