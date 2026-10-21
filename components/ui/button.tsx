import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-haze-900 text-white hover:bg-haze-700 dark:bg-haze-100 dark:text-haze-900 dark:hover:bg-haze-300",
  secondary:
    "border border-haze-300 bg-white text-haze-900 hover:bg-haze-100 dark:border-haze-700 dark:bg-haze-900 dark:text-haze-100 dark:hover:bg-haze-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost:
    "text-haze-600 hover:bg-haze-100 hover:text-haze-900 dark:text-haze-400 dark:hover:bg-haze-800 dark:hover:text-haze-100",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

/** Shared so links can look like buttons without duplicating classes. */
export function buttonStyles(variant: Variant = "primary", size: Size = "md") {
  return `inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant,
  size,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonStyles(variant, size)} ${className}`}
      {...props}
    />
  );
}
