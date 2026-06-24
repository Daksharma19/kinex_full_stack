/**
 * Floating WhatsApp call-to-action pinned to the bottom-right of every page
 * (mounted in Layout). Opens a pre-filled chat to the clinic in a new tab. On
 * hover the bubble lifts and a "Chat with us" label slides out; a soft pulsing
 * ring draws the eye at rest.
 */
const WHATSAPP_URL =
  "https://wa.me/918076944004?text=Hi%20Doctor%2C%20I%20would%20like%20to%20book%20a%20consultation.%20Please%20let%20me%20know%20your%20availability.";

export default function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-6 right-6 z-50 flex items-center gap-3"
    >
      {/* Slide-out label (hidden on small screens) */}
      <span className="hidden sm:inline-block max-w-0 overflow-hidden whitespace-nowrap rounded-full bg-white text-[#075E54] font-semibold text-sm shadow-lg opacity-0 -translate-x-2 px-0 py-2.5 transition-all duration-300 group-hover:max-w-[180px] group-hover:px-4 group-hover:opacity-100 group-hover:translate-x-0">
        Chat with us
      </span>

      {/* Bubble */}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-active:scale-95">
        {/* Pulsing ring — pauses and fades out while hovered */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping group-hover:animate-none group-hover:opacity-0" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="relative h-7 w-7"
          aria-hidden="true"
        >
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
        </svg>
      </span>
    </a>
  );
}
