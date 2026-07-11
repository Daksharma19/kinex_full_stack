import drmaheshwar from "../../../assets/images/drmaheshwar.png";
import drvarsha from "../../../assets/images/drvarsha.png";
const TEAM = [
  {
    name: "Dr. Maheshwar Prajapati",
    role: "Lead Physiotherapist",
    bio: "Specializing in advanced musculoskeletal recovery, Dr. Prajapati integrates traditional techniques with modern kinetic science. His approach focuses on precision-based movement patterns and neurological re-education to ensure long-term physical resilience.",
    image: drmaheshwar,
  },
  {
    name: "Dr. Varsha",
    role: "Clinical Director",
    bio: "With a focus on holistic patient journeys, Dr. Varsha oversees the integration of clinical excellence and wellness protocols. Her leadership ensures that every patient's recovery is supported by empathetic guidance and evidence-based clinical strategies.",
    image: drvarsha,
  },
];

function ProfilePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-secondary-container rounded-full">
      <span
        className="material-symbols-outlined text-on-secondary-container"
        style={{ fontSize: "3.5rem" }}
      >
        person
      </span>
    </div>
  );
}

export default function Team() {
  return (
    <section className="pt-2 md:pt-4 pb-4 md:pb-6 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <header className="mb-8 md:mb-10 text-center">
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-on-surface tracking-tight">
            Meet Our Team
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {TEAM.map((member) => (
            <article
              key={member.name}
              className="group flex flex-col items-center text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="relative shrink-0 aspect-square overflow-hidden rounded-full w-28 md:w-32">
                {member.image ? (
                  <img
                    alt={member.name}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105 rounded-full"
                    src={member.image}
                  />
                ) : (
                  <ProfilePlaceholder />
                )}
              </div>
              <h3 className="mt-4 text-lg md:text-xl font-headline font-bold text-on-surface tracking-tight">
                {member.name}
              </h3>
              <p className="mt-1 text-primary font-semibold tracking-wide uppercase text-xs">
                {member.role}
              </p>
              <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                {member.bio}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
