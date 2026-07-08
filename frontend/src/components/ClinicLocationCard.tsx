import { useEffect, useRef } from "react";
import NAVIG_ICON from "../../assets/images/navig_icon.png";

// Leaflet is loaded globally from a CDN <script> in index.html (window.L).
declare global {
  interface Window {
    L: any;
  }
}
// Single source of truth for the clinic's location & hours.
const CLINIC = {
  name: "Kinex Wellness & Rehab",
  address: "Plot no. S-9, Dayanand Park, Shalimar garden extension, Ghaziabad, Uttar Pradesh, 201005",
  latitude: 28.691730863319652,
  longitude: 77.34159832311803,
  hours: [
    { day: "Mon - Fri", time: "08:00 - 20:00" },
    { day: "Saturday", time: "09:00 - 16:00" },
    { day: "Sunday", time: "Emergency Only", emergency: true },
  ],
};

// Opens the coordinates in the visitor's default maps app (Google Maps on
// desktop; prompts the native maps app on mobile).
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${CLINIC.latitude},${CLINIC.longitude}`;

/**
 * Read-only location card for the Contact page: a wide, interactive Leaflet map
 * pinned to the clinic alongside the address, an "Open Maps" button, and
 * clinical hours. Map + details sit side-by-side on large screens.
 */
export default function ClinicLocationCard() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [CLINIC.latitude, CLINIC.longitude],
      zoom: 17,
      // Don't hijack the page scroll; users can still zoom with the controls.
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    // Custom navigation-pin marker that "breathes" (radar ring + gentle pulse),
    // mirroring the WhatsApp button. divIcon lets us layer the ring behind the img.
    const icon = L.divIcon({
      className: "kinex-nav-marker",
      html: `<span class="kinex-nav-ring"></span><img class="kinex-nav-img" src="${NAVIG_ICON}" alt="" />`,
      iconSize: [40,40],
      iconAnchor: [20, 38],
      popupAnchor: [0, -34],
    });
    L.marker([CLINIC.latitude, CLINIC.longitude], { icon })
      .addTo(map)
      .bindPopup(CLINIC.name);

    mapRef.current = map;
    // Leaflet mis-sizes when its container starts at zero/unknown width (common
    // inside responsive grids). A ResizeObserver re-syncs the tile layer whenever
    // the container's box changes - initial layout, breakpoint switches, resizes.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapDivRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="bg-surface-container-low rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      {/* Map - fills the left half on large screens */}
      <div
        ref={mapDivRef}
        className="w-full h-64 lg:h-auto min-h-[16rem] bg-surface-container-high"
      />

      {/* Details */}
      <div className="p-6 lg:p-8 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-on-surface">{CLINIC.name}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{CLINIC.address}</p>
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 text-sm font-bold text-on-primary shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">directions</span>
            Open Maps
          </a>
        </div>

        <div className="mt-6 border-t border-outline-variant/20 pt-5">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Clinical Hours
          </h4>
          <dl className="space-y-2.5">
            {CLINIC.hours.map((h) => (
              <div key={h.day} className="flex items-center justify-between text-sm">
                <dt className="text-on-surface-variant">{h.day}</dt>
                <dd
                  className={
                    h.emergency ? "font-bold text-error" : "font-medium text-on-surface"
                  }
                >
                  {h.time}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
