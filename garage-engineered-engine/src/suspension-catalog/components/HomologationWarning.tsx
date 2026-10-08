const DEFAULT_HOMOLOGATION =
  "Modelul de suspensie selectat nu poate fi omologat pentru utilizare pe drumuri publice.";

export interface HomologationWarningProps {
  message?: string | null;
  className?: string;
}

/** Alert vizibil când trebuie atrasă atenția asupra omologării. */
export function HomologationWarning({ message, className = "" }: HomologationWarningProps) {
  const text = message?.trim() || DEFAULT_HOMOLOGATION;
  return (
    <div
      role="alert"
      className={`rounded-lg border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100 ${className}`}
    >
      {text}
    </div>
  );
}
