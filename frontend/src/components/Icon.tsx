import { cn } from "@/lib/utils";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

const sizeMap: Record<string, string> = {
  xs: "text-[14px]",
  sm: "text-[16px]", // DEFAULT UI ICON SIZE
  md: "text-[20px]",
  lg: "text-[24px]",
  xl: "text-[32px]",
};

export function Icon({
  name,
  className,
  filled,
  size,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  size?: IconSize;
}) {
  const sizeClass =
    typeof size === "number"
      ? `text-[${size}px]`
      : size
      ? sizeMap[size]
      : undefined;

  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined", sizeClass, filled && "filled", className)}
    >
      {name}
    </span>
  );
}
