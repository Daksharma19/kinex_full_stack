import { Link } from "react-router-dom";

/**
 * Privacy Policy page (linked from the footer). Standard healthcare privacy
 * template, including a "Patient Rights" section the footer also points to.
 * Chrome (navbar/footer) comes from the shared Layout.
 */
export default function PrivacyPage() {
  return (
    <div className="flex-1 w-full bg-background px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Privacy Policy</h1>
      <p className="text-sm text-on-surface-variant mb-8">Last updated: June 13, 2026</p>

      <div className="space-y-8 text-on-surface leading-relaxed">
        <section>
          <h2 className="text-lg font-bold mb-2">1. Information We Collect</h2>
          <p className="text-on-surface-variant">
            We collect information you provide when you create an account or book
            care — such as your name, email, phone number, and, for patients, basic
            health details you choose to share (e.g. date of birth, address, and
            notes you add to an appointment). We also collect limited technical data
            needed to operate the Platform securely.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">2. How We Use Your Information</h2>
          <p className="text-on-surface-variant">
            Your information is used to provide and improve our services: creating
            your account, connecting you with providers, scheduling appointments,
            and communicating with you. We do not sell your personal or health
            information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">3. Sharing With Providers</h2>
          <p className="text-on-surface-variant">
            When you book an appointment, relevant information is shared with your
            chosen provider so they can deliver care. Providers are responsible for
            handling that information in line with applicable professional and legal
            obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">4. Data Security</h2>
          <p className="text-on-surface-variant">
            We use reasonable administrative, technical, and physical safeguards —
            including authenticated access and encrypted transport — to protect your
            information. No method of transmission or storage is completely secure,
            but we work to protect your data and to limit access to those who need it.
          </p>
        </section>

        <section id="patient-rights">
          <h2 className="text-lg font-bold mb-2">5. Patient Rights</h2>
          <p className="text-on-surface-variant mb-3">
            You have rights regarding your personal and health information, including:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-on-surface-variant">
            <li>The right to access and obtain a copy of your information.</li>
            <li>The right to correct inaccurate or incomplete information.</li>
            <li>The right to request deletion of your account and associated data.</li>
            <li>The right to understand how your information is used and shared.</li>
            <li>The right to withdraw consent where processing relies on it.</li>
          </ul>
          <p className="text-on-surface-variant mt-3">
            You can update much of your profile information directly from your
            dashboard. To exercise other rights, contact us through the support page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">6. Data Retention</h2>
          <p className="text-on-surface-variant">
            We retain your information for as long as your account is active or as
            needed to provide services and meet legal obligations. When you delete
            your account, associated records are removed from our systems.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">7. Changes to This Policy</h2>
          <p className="text-on-surface-variant">
            We may update this Privacy Policy from time to time. Material changes
            will be communicated through the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">8. Contact</h2>
          <p className="text-on-surface-variant">
            Questions about your privacy? Visit our{" "}
            <Link to="/contact" className="text-primary underline">
              Contact &amp; Support
            </Link>{" "}
            page. See also our{" "}
            <Link to="/terms" className="text-primary underline">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </section>

        <p className="text-xs text-on-surface-variant/70 border-t border-outline-variant/20 pt-6">
          This document is a general template provided for convenience and does not
          constitute legal advice. Review with qualified counsel before production use.
        </p>
      </div>
    </div>
  );
}
