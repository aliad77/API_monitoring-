"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import { apiRequest, type FieldErrors } from "@/lib/client-api";

type StatusPageValues = {
  title: string;
  slug: string;
  description: string;
  monitorIds: string[];
};

type StatusPageFormProps = {
  statusPageId?: string;
  initialValues?: StatusPageValues;
  monitors: { id: string; name: string }[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function StatusPageForm({ statusPageId, initialValues, monitors }: StatusPageFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<StatusPageValues>(
    initialValues ?? { title: "", slug: "", description: "", monitorIds: [] },
  );
  // Suggest a slug from the title until the user edits the slug themselves.
  const [slugEdited, setSlugEdited] = useState(Boolean(statusPageId));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleMonitor(id: string) {
    setValues((current) => ({
      ...current,
      monitorIds: current.monitorIds.includes(id)
        ? current.monitorIds.filter((monitorId) => monitorId !== id)
        : [...current.monitorIds, id],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const result = statusPageId
      ? await apiRequest(`/api/status-pages/${statusPageId}`, "PATCH", values)
      : await apiRequest("/api/status-pages", "POST", values);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors);
      setFormError(result.error);
      return;
    }
    router.push("/status-pages");
    router.refresh();
  }

  async function handleDelete() {
    if (!statusPageId || !window.confirm("Delete this status page? Its public URL will stop working.")) return;
    setSaving(true);
    const result = await apiRequest(`/api/status-pages/${statusPageId}`, "DELETE");
    if (result.ok) {
      router.push("/status-pages");
      router.refresh();
    } else {
      setSaving(false);
      setFormError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={formError} />

      <Field id="title" label="Title" error={errors.title}>
        <Input
          id="title"
          value={values.title}
          maxLength={80}
          placeholder="Acme status"
          error={errors.title}
          onChange={(event) => {
            const title = event.target.value;
            setValues((current) => ({ ...current, title, slug: slugEdited ? current.slug : slugify(title) }));
          }}
        />
      </Field>

      <Field id="slug" label="Public address" error={errors.slug} hint={`/status/${values.slug || "your-page"}`}>
        <Input
          id="slug"
          value={values.slug}
          maxLength={48}
          placeholder="acme"
          error={errors.slug}
          hint={`/status/${values.slug || "your-page"}`}
          onChange={(event) => {
            setSlugEdited(true);
            setValues((current) => ({ ...current, slug: event.target.value }));
          }}
        />
      </Field>

      <Field id="description" label="Description (optional)" error={errors.description}>
        <Textarea
          id="description"
          rows={2}
          maxLength={280}
          value={values.description}
          error={errors.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Monitors to show</legend>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Visitors see each monitor&apos;s name, status, uptime and incident times — never its URL or settings.
        </p>
        {monitors.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">You don&apos;t have any monitors yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {monitors.map((monitor) => (
              <label key={monitor.id} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-zinc-300 dark:border-zinc-700"
                  checked={values.monitorIds.includes(monitor.id)}
                  onChange={() => toggleMonitor(monitor.id)}
                />
                {monitor.name}
              </label>
            ))}
          </div>
        )}
        {errors.monitorIds && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.monitorIds}</p>}
      </fieldset>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : statusPageId ? "Save changes" : "Create status page"}
        </Button>
        <Link href="/status-pages" className={buttonStyles("secondary")}>
          Cancel
        </Link>
        {statusPageId && (
          <Button variant="danger" className="sm:ml-auto" onClick={handleDelete} disabled={saving}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
