const STATS = [
  { value: "99%", label: "Patient Satisfaction" },
  { value: "15k+", label: "Staff Professionals" },
  { value: "24/7", label: "Available Assistant" },
  { value: "120+", label: "Medical Specialized" },
];

export default function Stats() {
  return (
    <section className="relative z-20 mt-8 md:-mt-14 px-6 md:px-8">
      <div className="max-w-7xl mx-auto bg-surface-container-lowest rounded-xl shadow-2xl p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center md:items-start text-center md:text-left"
            >
              <span className="text-3xl font-headline font-bold text-primary mb-1">
                {s.value}
              </span>
              <span className="text-sm font-label uppercase tracking-widest text-outline">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
