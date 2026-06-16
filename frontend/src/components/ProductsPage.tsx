import { useEffect, useMemo, useRef, useState } from "react";
import { products, categories, getProductImage, type Product } from "../lib/products";

/**
 * Public "/products" catalog. Renders every product from src/data/products.json
 * in a responsive grid with a text search and a category filter that work
 * together. Results are paged: a "Load More" button reveals the next batch, and
 * an IntersectionObserver auto-advances as the user scrolls near the button.
 * Navbar + Footer come from the shared Layout.
 */

const PAGE_SIZE = 12;
const ALL = "All Categories";

// The product images in the data are placeholder paths without real files, so we
// render a branded placeholder tile keyed off the product's initials instead.
function ProductImage({ product }: { product: Product }) {
  const src = getProductImage(product.id);
  return (
    <div className="relative h-40 overflow-hidden bg-primary-container/15">
      {src && (
        <img
          src={src}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700"
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Search + category filter applied together (case-insensitive search across
  // name, category, subcategory and tags).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === ALL || p.category === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  // Reset paging whenever the filters change so we don't keep a stale offset.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, category]);

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  // Infinite scroll: when the sentinel near the "Load More" button scrolls into
  // view, reveal the next page automatically.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((v) => v + PAGE_SIZE);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div className="flex-1 w-full bg-background text-on-surface">
      {/* Page heading */}
      <header className="max-w-7xl mx-auto px-8 pt-16 md:pt-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-on-surface">
          Our Products
        </h1>
        <p className="mt-4 text-on-surface-variant max-w-2xl mx-auto text-lg leading-relaxed">
          Clinically chosen rehabilitation and recovery equipment, supports, and
          aids to help you move better and live better.
        </p>
      </header>

      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-8">
          {/* Search + category filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-10">
            <div className="relative flex-grow">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl pointer-events-none">
                search
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, categories, or tags…"
                aria-label="Search products"
                className="w-full h-12 rounded-lg border border-outline-variant/40 bg-surface-container-lowest pl-11 pr-4 text-on-surface placeholder:text-on-surface-variant outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="relative md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl pointer-events-none">
                filter_list
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
                className="w-full h-12 appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-lowest pl-11 pr-10 text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value={ALL}>{ALL}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Result count */}
          <p className="text-sm text-on-surface-variant mb-6">
            Showing {shown.length} of {filtered.length} product
            {filtered.length === 1 ? "" : "s"}
          </p>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/50 mb-4">
                search_off
              </span>
              <h3 className="text-xl font-bold text-on-surface mb-2">
                No products found
              </h3>
              <p className="text-on-surface-variant">
                Try a different search term or category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {shown.map((p) => (
                <div
                  key={p.id}
                  className="group bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,89,92,0.08)]"
                >
                  <ProductImage product={p} />
                  <div className="p-5 flex flex-col flex-grow">
                    <span className="text-[11px] tracking-widest uppercase text-primary font-bold mb-2">
                      {p.category}
                    </span>
                    <h4 className="text-base font-bold mb-1 text-on-surface leading-snug">
                      {p.name}
                    </h4>
                    <p className="text-sm text-on-surface-variant mb-4">
                      {p.subcategory}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {p.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More (also the infinite-scroll sentinel) */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center mt-12">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex items-center gap-2 bg-primary-container text-on-primary px-8 py-3.5 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all"
              >
                Load More
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
