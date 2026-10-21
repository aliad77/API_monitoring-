import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  // Glossy lavender: a top highlight and darker base give it a pressable feel.
  primary:
    "border border-[#4b2fb8] bg-linear-to-b from-[#7d5bf5] to-[#5838cf] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_8px_20px_-10px_var(--glow)] hover:brightness-110",
  secondary: "chrome hover:brightness-[1.04]",
  danger:
    "border border-red-800 bg-linear-to-b from-red-500 to-red-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] hover:brightness-110",
  ghost:
    "text-haze-600 hover:bg-lavender/10 hover:text-haze-950 dark:text-haze-300 dark:hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

/** Shared so links can look like buttons without duplicating classes. */
export function buttonStyles(variant: Variant = "primary", size: Size = "md") {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition active:translate-y-px active:brightness-95 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]}`;
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
