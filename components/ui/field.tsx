import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const controlStyles =
  "block w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:opacity-60 dark:bg-zinc-900 dark:text-zinc-100";

function borderFor(error?: string) {
  return error
    ? "border-red-500 dark:border-red-500"
    : "border-zinc-300 dark:border-zinc-700";
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Label, control, hint and error message wired together for screen readers. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p
          id={`${id}-hint`}
          className="text-xs text-zinc-500 dark:text-zinc-400"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type ControlProps = { id: string; error?: string; hint?: string };

export function Input({
  id,
  error,
  hint,
  className = "",
  ...props
}: ControlProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      name={props.name ?? id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${controlStyles} ${borderFor(error)} ${className}`}
      {...props}
    />
  );
}

export function Select({
  id,
  error,
  hint,
  className = "",
  ...props
}: ControlProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      id={id}
      name={props.name ?? id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${controlStyles} ${borderFor(error)} ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  id,
  error,
  hint,
  className = "",
  ...props
}: ControlProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      id={id}
      name={props.name ?? id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={`${controlStyles} ${borderFor(error)} ${className}`}
      {...props}
    />
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    >
      {message}
    </p>
  );
}
