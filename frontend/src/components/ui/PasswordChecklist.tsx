import { Check, X } from "lucide-react";
import { getPasswordChecks } from "@/lib/validation";

/**
 * Live password-strength checklist. Each rule shows a green tick when satisfied
 * and a red cross otherwise, updating as the user types. Render it directly
 * under a password field. Hidden until the user starts typing to avoid greeting
 * an empty field with a wall of red crosses.
 */
export default function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;
  const checks = getPasswordChecks(password);

  return (
    <ul className="flex flex-col gap-1 text-xs" aria-live="polite">
      {checks.map((c) => (
        <li
          key={c.label}
          className={`flex items-center gap-1.5 ${
            c.ok ? "text-green-600" : "text-red-600"
          }`}
        >
          {c.ok ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <X className="h-3.5 w-3.5 shrink-0" />
          )}
          {c.label}
        </li>
      ))}
    </ul>
  );
}
