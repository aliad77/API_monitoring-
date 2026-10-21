"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { apiRequest, type FieldErrors } from "@/lib/client-api";
import { CHECK_INTERVALS, HTTP_METHODS, REQUEST_TIMEOUTS } from "@/lib/monitoring/options";

export type MonitorFormValues = {
  name: string;
  url: string;
  method: "GET" | "HEAD";
  expectedStatus: number;
  intervalSeconds: number;
  timeoutMs: number;
};

const defaults: MonitorFormValues = {
  name: "",
  url: "https://",
  method: "GET",
  expectedStatus: 200,
  intervalSeconds: 300,
  timeoutMs: 10000,
};

/**
 * Quick checks for immediate feedback. The server re-validates everything,
 * including the private-network rules, and its errors are shown inline too.
 */
export function validateMonitorForm(values: MonitorFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = "Enter a name";

  try {
    const url = new URL(values.url.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      errors.url = "Only http and https URLs can be monitored";
    }
  } catch {
    errors.url = "Enter a valid URL, including http:// or https://";
  }

  if (!Number.isInteger(values.expectedStatus) || values.expectedStatus < 100 || values.expectedStatus > 599) {
    errors.expectedStatus = "Use a status code between 100 and 599";
  }
  return errors;
}

type MonitorFormProps = {
  monitorId?: string;
  initialValues?: MonitorFormValues;
};

export function MonitorForm({ monitorId, initialValues = defaults }: MonitorFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof MonitorFormValues>(key: K, value: MonitorFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = validateMonitorForm(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSaving(true);
    const body = { ...values, name: values.name.trim(), url: values.url.trim() };
    const result = monitorId
      ? await apiRequest<{ monitor: { id: string } }>(`/api/monitors/${monitorId}`, "PATCH", body)
      : await apiRequest<{ monitor: { id: string } }>("/api/monitors", "POST", body);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors);
      setFormError(result.error);
      return;
    }
    router.push(`/monitors/${result.data.monitor.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormError message={formError} />

      <Field id="name" label="Name" error={errors.name}>
        <Input
          id="name"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Production API"
          maxLength={80}
          error={errors.name}
        />
      </Field>

      <Field
        id="url"
        label="URL"
        error={errors.url}
        hint="Must be publicly reachable. Private and internal addresses are rejected."
      >
        <Input
          id="url"
          type="url"
          inputMode="url"
          value={values.url}
          onChange={(event) => update("url", event.target.value)}
          placeholder="https://api.example.com/health"
          error={errors.url}
          hint="Must be publicly reachable. Private and internal addresses are rejected."
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="method" label="HTTP method" error={errors.method}>
          <Select
            id="method"
            value={values.method}
            onChange={(event) => update("method", event.target.value as MonitorFormValues["method"])}
            error={errors.method}
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="expectedStatus" label="Expected status code" error={errors.expectedStatus}>
          <Input
            id="expectedStatus"
            type="number"
            min={100}
            max={599}
            value={Number.isNaN(values.expectedStatus) ? "" : values.expectedStatus}
            onChange={(event) => update("expectedStatus", event.target.valueAsNumber)}
            error={errors.expectedStatus}
          />
        </Field>

        <Field id="intervalSeconds" label="Check interval" error={errors.intervalSeconds}>
          <Select
            id="intervalSeconds"
            value={values.intervalSeconds}
            onChange={(event) => update("intervalSeconds", Number(event.target.value))}
            error={errors.intervalSeconds}
          >
            {CHECK_INTERVALS.map((option) => (
              <option key={option.seconds} value={option.seconds}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="timeoutMs" label="Request timeout" error={errors.timeoutMs}>
          <Select
            id="timeoutMs"
            value={values.timeoutMs}
            onChange={(event) => update("timeoutMs", Number(event.target.value))}
            error={errors.timeoutMs}
          >
            {REQUEST_TIMEOUTS.map((option) => (
              <option key={option.ms} value={option.ms}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : monitorId ? "Save changes" : "Create monitor"}
        </Button>
        <Link href={monitorId ? `/monitors/${monitorId}` : "/monitors"} className={buttonStyles("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
