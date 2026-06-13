import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SUPPORT_EMAIL = "support@kinex.health";

const FAQS = [
  {
    q: "How do I book an appointment?",
    a: "Sign in, open your dashboard, choose a verified doctor and pick a time. You can review your bookings any time from the dashboard.",
  },
  {
    q: "How do I become a provider?",
    a: "Use “Apply as a Doctor” to submit your credentials. An admin reviews each application before you can take appointments.",
  },
  {
    q: "How do I update my details or photo?",
    a: "Open your dashboard — patients and doctors can edit their profile and upload a photo from the profile card.",
  },
];

/**
 * Contact & Support page (linked from the footer "Contact Support" / "Help
 * Center"). The form composes a mailto: message so it works without a backend.
 * Chrome comes from the shared Layout.
 */
export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Support request from ${name || "a visitor"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ""}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="flex-1 w-full bg-background px-6 py-12 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Contact &amp; Support</h1>
      <p className="text-on-surface-variant mb-10 max-w-xl">
        We're here to help. Send us a message and our team will get back to you, or
        browse the quick answers below.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Contact form */}
        <form
          onSubmit={onSubmit}
          className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-8 flex flex-col gap-4"
        >
          <h2 className="text-xl font-bold text-on-surface">Send us a message</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="message">How can we help?</Label>
            <Textarea id="message" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button type="submit" className="self-start">Send message</Button>
          <p className="text-xs text-on-surface-variant">
            This opens your email app addressed to {SUPPORT_EMAIL}.
          </p>
        </form>

        {/* Support info + help */}
        <div className="space-y-6">
          <div className="bg-surface-container-low rounded-xl p-6">
            <h3 className="font-bold text-on-surface mb-3">Reach us</h3>
            <p className="text-sm text-on-surface-variant flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-base text-primary">mail</span>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">{SUPPORT_EMAIL}</a>
            </p>
            <p className="text-sm text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">schedule</span>
              Mon–Fri, 9am–6pm
            </p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-6">
            <h3 className="font-bold text-on-surface mb-2">Are you a provider?</h3>
            <p className="text-sm text-on-surface-variant mb-3">
              Join Kinex and start taking appointments.
            </p>
            <Link to="/apply-doctor" className="text-primary font-bold text-sm underline">
              Apply as a Doctor →
            </Link>
          </div>
        </div>
      </div>

      {/* Help center / FAQ */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-on-surface mb-6">Help Center</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FAQS.map((f) => (
            <div key={f.q} className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
              <h3 className="font-bold text-on-surface mb-2">{f.q}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
