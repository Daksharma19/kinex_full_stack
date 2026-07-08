/**
 * Terms & Conditions page. Standard medical / telehealth terms (a commonly used
 * template) shown to users before signup. Linked from the signup checkbox.
 *
 * NOTE: this is a generic sample for product use - have it reviewed by legal
 * counsel before relying on it in production.
 */
export default function TermsPage() {
  return (
    <div className="flex-1 w-full bg-background px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Terms &amp; Conditions</h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Last updated: June 13, 2026
      </p>

      <div className="space-y-8 text-on-surface leading-relaxed">
        <section>
          <h2 className="text-lg font-bold mb-2">1. Acceptance of Terms</h2>
          <p className="text-on-surface-variant">
            By creating an account or using Kinex Wellness &amp; Rehab (the
            "Platform"), you agree to be bound by these Terms &amp; Conditions and
            our Privacy Policy. If you do not agree, you must not use the Platform.
            You confirm that you are at least 18 years of age, or are using the
            Platform under the supervision of a parent or legal guardian.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">2. Not for Medical Emergencies</h2>
          <p className="text-on-surface-variant">
            The Platform is not designed for use in medical emergencies. If you are
            experiencing a medical emergency, call your local emergency number
            immediately or go to the nearest emergency room. Do not rely on the
            Platform for urgent or life-threatening conditions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">3. Nature of Services</h2>
          <p className="text-on-surface-variant">
            The Platform facilitates appointments and communication between patients
            and independent, licensed healthcare providers. We do not practice
            medicine, provide medical advice, or guarantee any particular outcome.
            Any medical care, diagnosis, or treatment is provided solely by the
            treating provider, who is responsible for the services they deliver. The
            content on the Platform is for informational purposes only and is not a
            substitute for professional medical advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">4. Provider Verification</h2>
          <p className="text-on-surface-variant">
            Doctors who apply to the Platform are reviewed before they become
            bookable. While we take reasonable steps to verify credentials, you are
            encouraged to confirm a provider's qualifications and discuss any
            concerns directly with them before receiving care.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">5. Patient Responsibilities</h2>
          <p className="text-on-surface-variant">
            You agree to provide accurate, current, and complete information about
            your identity and health, and to keep it up to date. You are responsible
            for maintaining the confidentiality of your account credentials and for
            all activity under your account. Providing false information may affect
            the care you receive and may result in suspension of your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">6. Appointments, Cancellations &amp; Payments</h2>
          <p className="text-on-surface-variant">
            Appointments are subject to provider availability and confirmation.
            Please cancel or reschedule appointments you cannot attend in a timely
            manner. Where applicable, fees, refunds, and cancellation policies will
            be presented at the time of booking and are subject to change.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">7. Privacy &amp; Confidentiality of Health Information</h2>
          <p className="text-on-surface-variant">
            We handle your personal and health information in accordance with
            applicable data-protection and health-privacy laws and our Privacy
            Policy. We implement reasonable administrative, technical, and physical
            safeguards to protect your information. By using the Platform, you
            consent to the collection and use of your information as described,
            including sharing relevant information with your chosen providers to
            deliver care.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">8. Telehealth Consent</h2>
          <p className="text-on-surface-variant">
            Some services may be delivered via telehealth (e.g. video
            consultations). You acknowledge that telehealth has potential
            limitations, including that a provider may determine an in-person visit
            is necessary. By choosing a telehealth appointment, you consent to
            receiving care through that medium.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">9. Prohibited Use</h2>
          <p className="text-on-surface-variant">
            You agree not to misuse the Platform, including by impersonating others,
            uploading unlawful or harmful content, attempting to gain unauthorized
            access, or using the Platform for any unlawful purpose.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">10. Limitation of Liability</h2>
          <p className="text-on-surface-variant">
            To the maximum extent permitted by law, the Platform and its operators
            are not liable for any indirect, incidental, or consequential damages
            arising from your use of the Platform or from the care provided by
            independent providers. The Platform is provided on an "as is" and "as
            available" basis without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">11. Changes to These Terms</h2>
          <p className="text-on-surface-variant">
            We may update these Terms from time to time. Material changes will be
            communicated through the Platform. Your continued use after changes take
            effect constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-2">12. Contact</h2>
          <p className="text-on-surface-variant">
            For questions about these Terms, contact us through the support channels
            listed on the Platform.
          </p>
        </section>

        <section className="border-t border-outline-variant/20 pt-8">
          <h2 className="text-xl font-bold mb-4 text-primary">
            Additional Terms for Practitioner Applicants
          </h2>
          <p className="text-on-surface-variant mb-6">
            The following terms apply to medical and physiotherapy professionals who
            apply to join Kinex Wellness &amp; Rehab through the recruitment portal.
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-2">Accuracy of Submissions</h3>
              <p className="text-on-surface-variant">
                The applicant accepts full responsibility for the authenticity of the
                resumes, certificates, and identification documents uploaded. Any
                falsified information will result in immediate disqualification or
                termination if hired.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2">Credential Verification</h3>
              <p className="text-on-surface-variant">
                Kinex Wellness reserves the right to contact the respective licensing
                boards (e.g. Medical Council, Physiotherapy Council) to verify the
                standing of the applicant's license and check for any history of
                malpractice or disciplinary action.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2">Data Protection &amp; Privacy</h3>
              <p className="text-on-surface-variant">
                All personal data, CVs, and contact information submitted through this
                portal will be kept strictly confidential. Kinex Wellness will not
                share, sell, or distribute applicant data to third-party agencies
                without explicit consent.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2">Communication Consent</h3>
              <p className="text-on-surface-variant">
                By submitting this form, the applicant agrees to receive
                communications (via email) regarding their application status,
                interview schedules, and future career opportunities at Kinex Wellness
                &amp; Rehab.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2">Document Retention</h3>
              <p className="text-on-surface-variant">
                Applications and uploaded documents may be retained in the Kinex
                Wellness database for up to 12 months for future openings, even if the
                current application is unsuccessful. Applicants may request data
                deletion by contacting the clinic directly.
              </p>
            </div>
          </div>
        </section>

        <p className="text-xs text-on-surface-variant/70 border-t border-outline-variant/20 pt-6">
          This document is a general template provided for convenience and does not
          constitute legal advice. It should be reviewed and adapted by qualified
          legal counsel before production use.
        </p>
      </div>
    </div>
  );
}
