import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizePhone } from "@/lib/validation";

interface PhoneInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * 10-digit Indian phone input. The +91 country code is shown as a fixed,
 * non-editable prefix box (and in the placeholder) — only the bare 10-digit
 * local number is captured. Input is sanitized to digits and capped at 10.
 */
export function PhoneInput({ value, onValueChange, className, ...props }: PhoneInputProps) {
  return (
    <div className="flex items-stretch">
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
        +91
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        placeholder="98765 43210"
        value={value}
        onChange={(e) => onValueChange(sanitizePhone(e.target.value))}
        className={cn(
          "placeholder:text-muted-foreground border-input h-9 w-full min-w-0 rounded-r-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          className,
        )}
        {...props}
      />
    </div>
  );
}
