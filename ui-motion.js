// Finite enhancements only: the application state always changes immediately.
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const running = new Map();
const counters = new Map();
export const motionAllowed = () => !reduced.matches && !document.hidden;
export const ease = "cubic-bezier(.22,1,.36,1)";

export function animateUI(element, frames, options = {}) {
  if (!element?.isConnected || !motionAllowed() || !element.animate) return null;
  let animation;
  try { animation = element.animate(frames, { duration: 360, easing: ease, ...options }); }
  catch { return null; }
  running.set(animation, element);
  animation.finished.then(() => running.delete(animation), () => running.delete(animation));
  return animation;
}

export function stopMotionWithin(container) {
  for (const [animation, element] of running) {
    if (container.contains(element)) { animation.cancel(); running.delete(animation); }
  }
  for (const [element, finish] of counters) if (container.contains(element)) finish();
}

export function animateAmount(element, from, to, format, { duration = 360, step = 1 } = {}) {
  if (!element) return;
  counters.get(element)?.();
  element.dataset.value = to;
  if (!motionAllowed() || !Number.isFinite(from) || from === to) { element.textContent = format(to); return; }
  const visual = document.createElement("span");
  visual.setAttribute("aria-hidden", "true");
  const accessible = document.createElement("span");
  accessible.className = "sr-only";
  accessible.textContent = format(to);
  element.replaceChildren(visual, accessible);
  let frame = 0;
  const start = performance.now();
  const finish = () => {
    cancelAnimationFrame(frame);
    visual.textContent = format(to);
    counters.delete(element);
  };
  counters.set(element, finish);
  function tick(now) {
    if (!element.isConnected || !motionAllowed()) { finish(); return; }
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    visual.textContent = format(Math.round((from + (to - from) * eased) / step) * step);
    if (progress < 1) frame = requestAnimationFrame(tick); else finish();
  }
  tick(start);
}

let menuExit = null;
export function replaceMenu(grid, render) {
  menuExit?.remove();
  menuExit = null;
  const old = motionAllowed() && grid.children.length ? grid.cloneNode(true) : null;
  if (old) {
    old.removeAttribute("id");
    old.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    old.classList.add("menu-previous");
    old.setAttribute("aria-hidden", "true");
    old.inert = true;
    grid.parentElement.append(old);
    menuExit = old;
  }
  render();
  if (old) {
    const exit = animateUI(old, [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-10px)" }], { duration: 180 });
    const remove = () => { old.remove(); if (menuExit === old) menuExit = null; };
    if (exit) exit.finished.then(remove, remove); else remove();
  }
  if (!document.documentElement.classList.contains("browse-motion-enabled")) [...grid.children].forEach((card, index) => animateUI(card,
    [{ opacity: 0, transform: "translateY(22px) scale(.985)" }, { opacity: 1, transform: "none" }],
    { duration: 430, delay: Math.min(index, 5) * 38, fill: "backwards" }));
}

export function moveCategoryIndicator(bar) {
  const active = bar.querySelector("[aria-pressed='true']");
  const indicator = bar.querySelector(".category-indicator");
  if (!active || !indicator) return;
  indicator.style.width = active.offsetWidth + "px";
  indicator.style.height = active.offsetHeight + "px";
  indicator.style.top = active.offsetTop + "px";
  indicator.style.transform = "translateX(" + active.offsetLeft + "px)";
  bar.classList.add("has-indicator");
}

export function animateCartArrival(dialog, lineId) {
  const row = [...dialog.querySelectorAll("[data-line-id]")].find(node => node.dataset.lineId === lineId);
  if (!row) return;
  row.scrollIntoView({ block: "nearest", behavior: "instant" });
  row.classList.add("cart-arrival");
  const photo = row.querySelector("img");
  animateUI(photo, [{ transform: "translateX(35px) scale(1.35)", opacity: .2 }, { transform: "translateX(-3px) scale(.98)", opacity: 1, offset: .75 }, { transform: "none", opacity: 1 }], { duration: 650 });
  const highlight = animateUI(row, [{ backgroundColor: "var(--soft-blue)" }, { backgroundColor: "transparent" }], { duration: 900 });
  const clean = () => row.classList.remove("cart-arrival");
  if (highlight) highlight.finished.then(clean, clean); else clean();
}

function settleAll() {
  for (const animation of running.keys()) animation.cancel();
  running.clear();
  for (const finish of [...counters.values()]) finish();
  menuExit?.remove();
  menuExit = null;
}
reduced.addEventListener("change", () => { if (reduced.matches) settleAll(); });
document.addEventListener("visibilitychange", () => {
  document.documentElement.classList.toggle("motion-paused", document.hidden);
  if (document.hidden) settleAll();
});
