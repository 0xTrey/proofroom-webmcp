import type { RoomState } from "../domain/types.ts";
import {
  deriveRoomGuideState,
  GUIDE_STEPS,
  type RoomGuideState,
  type RoomGuideStepState,
} from "./roomGuideState.ts";
import type { RoomRouteId } from "./routes.ts";

const STEP_LABELS: Record<RoomGuideStepState, string> = {
  done: "Done",
  next: "Next",
  review: "Review",
  ready: "Ready",
  open: "Open",
};

const STEP_GLYPHS: Record<RoomGuideStepState, string> = {
  done: "✓",
  next: "→",
  review: "◇",
  ready: "◇",
  open: "○",
};

function GuideStepList({
  guide,
  label,
  className,
  onNavigate,
}: {
  guide: RoomGuideState;
  label: string;
  className: string;
  onNavigate: (route: RoomRouteId) => void;
}) {
  return (
    <ol className={className} aria-label={label}>
      {GUIDE_STEPS.map((step, index) => {
        const state = guide.stepStates[index] ?? "open";
        const current = index === guide.currentIndex && state !== "done";
        return (
          <li key={step.title} data-guide-state={state} aria-current={current ? "step" : undefined}>
            <button type="button" onClick={() => onNavigate(step.route)}>
              <span className="room-guide__mark" aria-hidden="true">
                {STEP_GLYPHS[state]}
              </span>
              <span>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <strong>{step.title}</strong>
              </span>
              <span className="room-guide__state">{STEP_LABELS[state]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function RoomGuide({
  room,
  onNavigate,
  onNavigateTask,
}: {
  room: RoomState;
  onNavigate: (route: RoomRouteId) => void;
  onNavigateTask: (route: RoomRouteId, targetId: string) => void;
}) {
  const guide = deriveRoomGuideState(room);

  return (
    <aside className="room-guide" aria-labelledby="room-guide-title">
      <div className="room-guide__summary">
        <h2 id="room-guide-title" className="room-guide__desktop-title">
          Room guide
        </h2>
        <p className="room-guide__desktop-next">
          Recommended next: <strong>{guide.nextTitle}</strong>
        </p>
        <p className="room-guide__mobile-next">
          Next step: <strong>{guide.nextTitle}</strong>
        </p>
        <p className="mono room-guide__orientation">Priorities -&gt; evidence -&gt; person decides</p>
        <p className="mono room-guide__progress-label">
          {guide.completedCount} of {GUIDE_STEPS.length} steps complete
        </p>
        <button
          className="room-guide__next"
          type="button"
          onClick={() => onNavigateTask(guide.nextRoute, guide.nextTargetId)}
        >
          Go to: {guide.nextTitle}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <progress
        className="room-guide__progress"
        max={GUIDE_STEPS.length}
        value={guide.completedCount}
        aria-label={`${guide.completedCount} of ${GUIDE_STEPS.length} room moves complete`}
      />
      <GuideStepList
        guide={guide}
        label="Room steps"
        className="room-guide__desktop-steps"
        onNavigate={onNavigate}
      />
      <details className="room-guide__details">
        <summary>All four steps</summary>
        <GuideStepList
          guide={guide}
          label="All room steps"
          className="room-guide__mobile-steps"
          onNavigate={onNavigate}
        />
      </details>
    </aside>
  );
}
