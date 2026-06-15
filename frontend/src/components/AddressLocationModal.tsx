import { useEffect, useRef, useState } from "react";
import { isValidPhone, sanitizePhone, sanitizeText } from "../lib/validation";

// Leaflet is loaded globally from a CDN <script> in index.html.
declare global {
  interface Window {
    L: any;
  }
}

export interface AddressLocationResult {
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  open: boolean;
  saving?: boolean;
  error?: string | null;
  initialPhone?: string;
  onClose: () => void;
  onSave: (data: AddressLocationResult) => void;
}

// Default map center (India) used until the browser gives us a real location.
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;
const LOCATED_ZOOM = 16;

const INPUT_CLASS =
  "w-full rounded-lg bg-surface-container-low border border-outline-variant/20 px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30";

const emptyAddress = {
  line1: "", // Flat, House No, Building, Apartment
  line2: "", // Area, Street, Sector
  landmark: "", // optional
  town: "",
  city: "",
  state: "",
  pincode: "",
};

// Join the structured fields into the single string we persist in `address`.
function mergeAddress(a: typeof emptyAddress) {
  return [
    a.line1,
    a.line2,
    a.landmark ? `Near ${a.landmark}` : "",
    a.town,
    a.city,
    a.state,
    a.pincode,
  ]
    .map((p) => sanitizeText(p))
    .filter(Boolean)
    .join(", ");
}

export default function AddressLocationModal({
  open,
  saving = false,
  error = null,
  initialPhone = "",
  onClose,
  onSave,
}: Props) {
  const [phone, setPhone] = useState(sanitizePhone(initialPhone));
  const [addr, setAddr] = useState({ ...emptyAddress });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Reset fields each time the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setPhone(sanitizePhone(initialPhone));
      setAddr({ ...emptyAddress });
      setCoords(null);
      setFormError(null);
    }
  }, [open, initialPhone]);

  // Place (or move) the marker and remember the coordinates.
  function setMarker(lat: number, lng: number) {
    const L = window.L;
    if (!L || !mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        setCoords({ lat: p.lat, lng: p.lng });
      });
    }
    setCoords({ lat, lng });
  }

  function locate() {
    if (!navigator.geolocation) {
      setFormError("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], LOCATED_ZOOM);
        setMarker(latitude, longitude);
        setLocating(false);
      },
      () => {
        setFormError("Could not detect your location - drop a pin on the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Initialise the Leaflet map once the modal is open and the div exists.
  useEffect(() => {
    if (!open) return;
    const L = window.L;
    if (!L || !mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    // Click anywhere to drop / move the pin.
    map.on("click", (e: any) => setMarker(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;

    // Leaflet needs a size recalc once it's visible inside the modal.
    setTimeout(() => map.invalidateSize(), 50);

    // Try to centre on the user straight away.
    locate();

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function handleSave() {
    setFormError(null);
    if (!isValidPhone(phone)) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!addr.line1.trim() || !addr.city.trim() || !addr.pincode.trim()) {
      setFormError("Please fill at least the house/flat, city and pincode.");
      return;
    }
    onSave({
      phone,
      address: mergeAddress(addr),
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    });
  }

  const set = (k: keyof typeof emptyAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Complete your details</h2>
            <p className="text-sm text-on-surface-variant">
              We need your phone and address before booking an appointment.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Phone */}
          <Field label="Phone Number" required>
            <div className="flex items-stretch">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-outline-variant/20 bg-surface-container-low px-3 text-sm text-on-surface-variant select-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                placeholder="98765 43210"
                className={`${INPUT_CLASS} rounded-l-none`}
              />
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Flat, House No, Building, Apartment" required full>
              <input value={addr.line1} onChange={set("line1")} className={INPUT_CLASS} />
            </Field>
            <Field label="Area, Street, Sector" full>
              <input value={addr.line2} onChange={set("line2")} className={INPUT_CLASS} />
            </Field>
            <Field label="Landmark (optional)" full>
              <input value={addr.landmark} onChange={set("landmark")} className={INPUT_CLASS} />
            </Field>
            <Field label="Town">
              <input value={addr.town} onChange={set("town")} className={INPUT_CLASS} />
            </Field>
            <Field label="City" required>
              <input value={addr.city} onChange={set("city")} className={INPUT_CLASS} />
            </Field>
            <Field label="State">
              <input value={addr.state} onChange={set("state")} className={INPUT_CLASS} />
            </Field>
            <Field label="Pincode" required>
              <input value={addr.pincode} onChange={set("pincode")} className={INPUT_CLASS} />
            </Field>
          </div>

          {/* Map */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Pin your location
              </label>
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">my_location</span>
                {locating ? "Locating..." : "Use my location"}
              </button>
            </div>
            <div
              ref={mapDivRef}
              className="h-64 w-full overflow-hidden rounded-xl border border-outline-variant/20"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              {coords
                ? `Selected: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} - drag the pin to fine-tune.`
                : "Tap on the map to drop a pin where the doctor should visit."}
            </p>
          </div>

          {(formError || error) && (
            <p className="text-sm text-error">{formError || error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-outline-variant/20 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-outline-variant/30 px-5 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary-container px-6 py-2.5 text-sm font-bold text-on-primary shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label} {required && <span className="text-error">*</span>}
      </label>
      {children}
    </div>
  );
}
