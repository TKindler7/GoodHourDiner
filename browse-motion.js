// Browsing motion follows native scrolling; no idle loop or scroll interception.
let disposePrevious;
const clamp = value => Math.max(0, Math.min(1, value));

export function setupBrowseMotion() {
  disposePrevious?.();
  if (typeof window === "undefined" || !window.CSS?.supports("translate", "0 0") || !window.CSS.supports("scale", "1")) return () => {};
  const root = document.documentElement;
  const grid = document.querySelector("#menu-grid");
  const featured = [...document.querySelectorAll(".hero-photo, .meal-art")];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 760px)");
  const seen = new Set(), cards = new Map(), animations = new Map();
  let frame = 0, disposed = false, mutations, intersections, sizes;
  const visible = new Set();

  function reveal(card, immediate = false, delay = 0) {
    const entry = cards.get(card);
    if (!entry || entry.revealed) return;
    entry.revealed = true;
    seen.add(entry.key);
    card.removeAttribute("data-browse-pending");
    if (immediate || reduce.matches || !card.animate) return;
    try {
      const animation = card.animate([
        { opacity: 0, transform: "translateY(24px)" },
        { opacity: 1, transform: "none" },
      ], { duration: 600, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
      animations.set(card, animation);
      const done = () => { if (animations.get(card) === animation) animations.delete(card); };
      animation.finished.then(done, done);
    } catch { /* Content remains visible if animation is unsupported. */ }
  }
  function release(card) {
    intersections?.unobserve(card);
    visible.delete(card);
    animations.get(card)?.cancel(); animations.delete(card);
    card.removeAttribute("data-browse-pending");
    card.removeAttribute("data-browse-card");
    card.style.removeProperty("--browse-image-y");
    cards.delete(card);
  }
  function syncCards() {
    const current = new Set(grid?.querySelectorAll(".food-card") || []);
    for (const card of cards.keys()) if (!current.has(card)) release(card);
    for (const card of current) {
      if (cards.has(card)) continue;
      const key = card.querySelector("[data-item]")?.dataset.item || card;
      cards.set(card, { key, revealed: seen.has(key) });
      card.setAttribute("data-browse-card", "");
      if (!seen.has(key) && !reduce.matches) card.setAttribute("data-browse-pending", "");
      intersections?.observe(card);
      if (reduce.matches) reveal(card, true);
    }
    schedule();
  }
  function update() {
    frame = 0;
    if (disposed || reduce.matches || document.hidden) return;
    const height = window.innerHeight || root.clientHeight;
    // Measure the row positions before writing transforms. Existing card hover
    // uses translate, leaving this one-time transform entrance independent.
    const measurements = [...cards].map(([card, entry]) => ({ card, entry, bounds: card.getBoundingClientRect(), imageHeight: card.querySelector(".food-image-button")?.clientHeight || 0 }));
    const features = featured.map(element => ({ element, bounds: element.getBoundingClientRect() }));
    const rowCounts = new Map();
    for (const { card, entry, bounds, imageHeight } of measurements) {
      if (!entry.revealed && bounds.top < height * .94) {
        const row = Math.round(card.offsetTop / 8);
        const order = rowCounts.get(row) || 0;
        rowCounts.set(row, order + 1);
        reveal(card, bounds.bottom <= 0, order * 75);
      }
      if (bounds.bottom <= 0 || bounds.top >= height) continue;
      const progress = clamp((height - bounds.top) / (height + bounds.height));
      const amplitude = Math.min(12, imageHeight * .035) * (compact.matches ? .6 : 1);
      card.style.setProperty("--browse-image-y", `${((progress * 2 - 1) * amplitude).toFixed(2)}px`);
    }
    for (const { element, bounds } of features) {
      const progress = clamp((height - bounds.top) / Math.max((height + bounds.height) * .5, 1));
      const ease = progress * progress * (3 - 2 * progress);
      const amount = compact.matches ? .5 : 1;
      element.style.setProperty("--browse-focus-scale", (1 - .06 * (1 - ease) * amount).toFixed(4));
      element.style.setProperty("--browse-focus-turn", `${(-1.4 * (1 - ease) * amount).toFixed(3)}deg`);
    }
  }
  function schedule() {
    if (!disposed && !reduce.matches && !document.hidden && !frame) frame = window.requestAnimationFrame(update);
  }
  function scroll() { if (!intersections || visible.size) schedule(); }
  function pause() {
    window.cancelAnimationFrame(frame); frame = 0;
    for (const animation of animations.values()) animation.cancel();
    animations.clear();
  }
  function preference() {
    root.classList.toggle("browse-motion-enabled", !reduce.matches);
    if (reduce.matches) { pause(); for (const card of cards.keys()) reveal(card, true); }
    else schedule();
  }
  function visibility() { if (document.hidden) pause(); else schedule(); }
  function focus(event) {
    const card = event.target.closest?.(".food-card");
    if (!cards.has(card)) return;
    reveal(card, true);
    animations.get(card)?.cancel(); animations.delete(card);
  }
  if ("IntersectionObserver" in window) {
    intersections = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
      }
      schedule();
    }, { rootMargin: "100px 0px" });
    for (const element of featured) intersections.observe(element);
  }
  if ("MutationObserver" in window && grid) {
    mutations = new MutationObserver(syncCards);
    mutations.observe(grid, { childList: true });
  }
  if ("ResizeObserver" in window) {
    sizes = new ResizeObserver(schedule); sizes.observe(document.body);
  }
  for (const element of featured) element.setAttribute("data-browse-focus", "");
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", visibility);
  grid?.addEventListener("focusin", focus);
  reduce.addEventListener("change", preference);
  compact.addEventListener("change", schedule);
  syncCards(); preference();

  function dispose() {
    if (disposed) return;
    disposed = true; pause();
    mutations?.disconnect(); intersections?.disconnect(); sizes?.disconnect();
    for (const card of [...cards.keys()]) release(card);
    for (const element of featured) {
      element.removeAttribute("data-browse-focus");
      element.style.removeProperty("--browse-focus-scale"); element.style.removeProperty("--browse-focus-turn");
    }
    root.classList.remove("browse-motion-enabled");
    window.removeEventListener("scroll", scroll); window.removeEventListener("resize", schedule); window.removeEventListener("pageshow", schedule);
    document.removeEventListener("visibilitychange", visibility); grid?.removeEventListener("focusin", focus);
    reduce.removeEventListener("change", preference); compact.removeEventListener("change", schedule);
    if (disposePrevious === dispose) disposePrevious = undefined;
  }
  disposePrevious = dispose;
  return dispose;
}
