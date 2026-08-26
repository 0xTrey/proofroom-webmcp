/**
 * Revision tag. Mono metadata, readable by a person and quotable in a demo.
 */
export function RevisionTag({ revision, label = "revision" }: { revision: number; label?: string }) {
  return (
    <span className="mono">
      {label} {String(revision).padStart(3, "0")}
    </span>
  );
}
