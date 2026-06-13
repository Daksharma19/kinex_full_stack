export default function Newsletter() {
  return (
    <section className="py-20 md:py-28 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -ml-48 -mb-48"></div>
      </div>
      <div className="max-w-4xl mx-auto px-6 md:px-8 relative z-10 text-center text-white">
        <h2 className="text-4xl md:text-5xl font-headline font-bold mb-8">
          Ready to Prioritize Your Health?
        </h2>
        <p className="text-xl text-on-primary-container mb-12 opacity-90 max-w-2xl mx-auto">
          Join our community for exclusive clinical insights, early appointment
          windows, and wellness resources delivered to your inbox.
        </p>
        <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
          <input
            className="flex-grow bg-white/10 border border-white/20 text-white placeholder:text-white/50 px-6 py-4 rounded-lg focus:ring-2 focus:ring-primary-fixed outline-none transition-all"
            placeholder="Enter your email address"
            type="email"
          />
          <button
            className="bg-surface-container-lowest text-primary px-8 py-4 rounded-lg font-bold hover:bg-primary-fixed transition-all"
            type="submit"
          >
            Submit Now
          </button>
        </form>
      </div>
    </section>
  );
}
