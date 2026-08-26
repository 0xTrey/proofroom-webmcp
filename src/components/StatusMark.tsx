/**
 * Status mark.
 *
 * Status always carries a word and a glyph. Color is the third signal, never the
 * only one.
 */
import type { RequirementStatus } from "../domain/types.ts";

export type StatusTone = "verified" | "agent" | "gap" | "neutral";

const REQUIREMENT_TONES: Record<RequirementStatus, { tone: StatusTone; glyph: string; label: string }> = {
  supported: { tone: "verified", glyph: "\u2713", label: "supported" },
  partially_supported: { tone: "agent", glyph: "\u25E7", label: "partial" },
  unsupported: { tone: "gap", glyph: "\u2715", label: "unsupported" },
  unknown: { tone: "gap", glyph: "?", label: "unknown" },
};

export function StatusMark(props: { tone: StatusTone; glyph: string; label: string }) {
  return (
    <span className={`statusmark statusmark--${props.tone}`}>
      <span className="statusmark__glyph" aria-hidden="true">
        {props.glyph}
      </span>
      <span>{props.label}</span>
    </span>
  );
}

export function RequirementStatusMark({ status }: { status: RequirementStatus }) {
  const config = REQUIREMENT_TONES[status];
  return <StatusMark tone={config.tone} glyph={config.glyph} label={config.label} />;
}
