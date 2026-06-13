const TESTIMONIALS = [
  {
    quote:
      "Kinex completely transformed my recovery. The neuromuscular therapy erased years of chronic back pain in just weeks.",
    name: "Ananya Sharma",
    role: "Marathon Runner",
  },
  {
    quote:
      "The private suites and calm environment made every visit feel restorative. World-class care with genuine warmth.",
    name: "Rohan Mehta",
    role: "Post-Op Patient",
  },
  {
    quote:
      "Dr. Prajapati's expertise is unmatched. My mobility has improved beyond what I thought was possible at my age.",
    name: "Sunita Verma",
    role: "Geriatric Rehab",
  },
  {
    quote:
      "Reduced wait times and a team that truly listens. Kinex respects both my health and my time.",
    name: "Arjun Nair",
    role: "Sports Injury",
  },
  {
    quote:
      "The cellular healing program accelerated my recovery dramatically. I felt supported at every single step.",
    name: "Priya Iyer",
    role: "Wellness Member",
  },
];

function Card({ quote, name, role }) {
  return (
    <div className="bento-card flex-shrink-0 w-[360px] bg-surface-container-lowest p-8 rounded-xl shadow-sm mx-4">
      <div className="flex gap-1 text-tertiary-fixed-dim mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="material-symbols-outlined text-xl">
            star
          </span>
        ))}
      </div>
      <p className="text-on-surface-variant leading-relaxed mb-8">“{quote}”</p>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-primary font-headline font-bold">
          {name.charAt(0)}
        </div>
        <div>
          <h5 className="font-headline font-bold text-on-surface">{name}</h5>
          <p className="text-sm text-outline">{role}</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  // Duplicate the list so the -50% marquee loop is seamless.
  const loop = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="py-20 md:py-28 bg-surface-container-lowest overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8 mb-12 md:mb-16 text-center">
        <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm mb-4 block">
          Patient Stories
        </span>
        <h2 className="text-4xl md:text-5xl font-headline font-bold text-on-surface leading-tight">
          Trusted by Those We Heal
        </h2>
      </div>
      <div className="marquee-pause relative">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-surface-container-lowest to-transparent"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-surface-container-lowest to-transparent"></div>
        <div className="marquee-track py-4">
          {loop.map((t, i) => (
            <Card key={i} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}
