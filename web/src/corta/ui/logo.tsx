// CORTA CUSTOMIZATION
// Corta's mark and logotype (web/public/corta, copies of corta/brand/logo via
// apps/desktop/public/corta). The `-dark` files are Corta's own (paper badge,
// ink letters) for dark backgrounds; the others swap the two colors so the
// badge stays visible on paper.

import { HERMES_BASE_PATH } from "@/lib/api";
import { cn } from "@/lib/utils";

import { useAppearance } from "../lib/appearance";

function useVariant(inverted: boolean): "" | "-dark" {
  const { theme } = useAppearance();
  const dark = theme === "dark";
  return dark !== inverted ? "-dark" : "";
}

interface LogoProps {
  className?: string;
  /** Drawn on a primary-colored surface (ink in light mode, paper in dark mode). */
  inverted?: boolean;
}

export function CortaMark({ className, inverted = false }: LogoProps) {
  const variant = useVariant(inverted);
  return <img src={`${HERMES_BASE_PATH}/corta/mark${variant}.svg`} alt="" aria-hidden className={cn("select-none", className)} draggable={false} />;
}

export function CortaLogo({ className, inverted = false }: LogoProps) {
  const variant = useVariant(inverted);
  return <img src={`${HERMES_BASE_PATH}/corta/logo${variant}.svg`} alt="Corta" className={cn("select-none", className)} draggable={false} />;
}
