import { Link } from "react-router-dom";

/**
 * Required "I agree to the Terms & Conditions" checkbox shared by the signup
 * flows. Links to the /terms page (opens in a new tab so the form isn't lost).
 */
export default function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-on-surface-variant cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <span>
        I agree to the{" "}
        <Link to="/terms" target="_blank" className="text-primary underline">
          Terms &amp; Conditions
        </Link>
      </span>
    </label>
  );
}
