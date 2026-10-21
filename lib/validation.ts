import { z } from "zod";
import {
  CHECK_INTERVALS,
  HTTP_METHODS,
  REQUEST_TIMEOUTS,
} from "@/lib/monitoring/options";
import { validateMonitorUrl } from "@/lib/monitoring/url-policy";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

// bcrypt only uses the first 72 bytes of a password.
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email,
  password,
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: password,
});

const monitorUrl = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .transform((value, ctx) => {
    const result = validateMonitorUrl(value);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.reason });
      return z.NEVER;
    }
    return result.url.toString();
  });

export const monitorInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(80, "Use at most 80 characters"),
  url: monitorUrl,
  method: z.enum(HTTP_METHODS),
  expectedStatus: z
    .number({ invalid_type_error: "Enter a status code" })
    .int()
    .min(100, "Use a status code between 100 and 599")
    .max(599, "Use a status code between 100 and 599"),
  intervalSeconds: z
    .number()
    .refine(
      (value) => CHECK_INTERVALS.some((option) => option.seconds === value),
      "Choose one of the supported intervals",
    ),
  timeoutMs: z
    .number()
    .refine(
      (value) => REQUEST_TIMEOUTS.some((option) => option.ms === value),
      "Choose one of the supported timeouts",
    ),
});

export const monitorUpdateSchema = monitorInputSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export type MonitorInput = z.infer<typeof monitorInputSchema>;

export const statusPageInputSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use at least 3 characters")
    .max(48, "Use at most 48 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens"),
  description: z.string().trim().max(280).optional().default(""),
  monitorIds: z.array(z.string().min(1)).max(25).default([]),
});

export const statusPageUpdateSchema = statusPageInputSchema.partial();

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "form";
    fieldErrors[field] ??= issue.message;
  }
  return fieldErrors;
}
