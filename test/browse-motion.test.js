import test from "node:test";
import assert from "node:assert/strict";
import { setupBrowseMotion } from "../browse-motion.js";

class Node {
  constructor(top = 900) {
    this.top = top; this.offsetTop = top; this.clientHeight = 250;
    this.attrs = new Map(); this.listeners = new Map(); this.styles = new Map(); this.classes = new Set(); this.runs = [];
    this.style = { setProperty: (k, v) => this.styles.set(k, v), removeProperty: k => this.styles.delete(k) };
    this.classList = { contains: k => this.classes.has(k), remove: k => this.classes.delete(k), toggle: (k, on) => on ? this.classes.add(k) : this.classes.delete(k) };
    this.dataset = {}; this.children = [];
  }
  setAttribute(k, v) { this.attrs.set(k, v); }
  removeAttribute(k) { this.attrs.delete(k); }
  addEventListener(k, v) { this.listeners.set(k, v); }
  removeEventListener(k) { this.listeners.delete(k); }
  getBoundingClientRect() { return { top: this.top, bottom: this.top + 400, height: 400 }; }
  querySelector(selector) { return selector === "[data-item]" ? { dataset: { item: this.key } } : this; }
  querySelectorAll() { return this.children; }
  animate(frames, options) { const run = { frames, options, cancelled: false, finished: new Promise(() => {}), cancel() { this.cancelled = true; } }; this.runs.push(run); return run; }
}

test("browsing motion reveals once, tracks category changes, and releases motion on preference or cleanup", () => {
  const root = new Node(), grid = new Node(), hero = new Node(900), body = new Node();
  const a = new Node(), b = new Node(); a.key = "burger"; b.key = "melt"; grid.children = [a, b];
  const reduce = new Node(), compact = new Node(); reduce.matches = compact.matches = false;
  const frames = new Map(); let id = 0, mutate, intersect;
  const observed = new Set();
  class IO { constructor(fn) { intersect = fn; } observe(n) { observed.add(n); } unobserve(n) { observed.delete(n); } disconnect() { observed.clear(); } }
  class MO { constructor(fn) { mutate = fn; } observe() {} disconnect() {} }
  class RO { observe() {} disconnect() {} }
  const win = new Node(); Object.assign(win, { CSS: { supports: () => true }, innerHeight: 800, matchMedia: q => q.includes("reduced") ? reduce : compact,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id), IntersectionObserver: IO, MutationObserver: MO, ResizeObserver: RO });
  const doc = new Node(); Object.assign(doc, { documentElement: root, body, hidden: false,
    querySelector: () => grid, querySelectorAll: () => [hero] });
  const globals = { window: win, document: doc, IntersectionObserver: IO, MutationObserver: MO, ResizeObserver: RO };
  const saved = Object.fromEntries(Object.keys(globals).map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const [k, value] of Object.entries(globals)) Object.defineProperty(globalThis, k, { value, configurable: true });
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); };
  let dispose;
  try {
    dispose = setupBrowseMotion(); flush();
    assert.ok(a.attrs.has("data-browse-pending")); assert.equal(a.runs.length, 0);
    a.top = b.top = 600; hero.top = 600;
    intersect([{ target: a, isIntersecting: true }, { target: b, isIntersecting: true }]); flush();
    assert.equal(a.runs.length, 1); assert.equal(b.runs.length, 1);
    assert.equal(b.runs[0].options.delay - a.runs[0].options.delay, 75);
    assert.ok(!a.attrs.has("data-browse-pending"));
    const before = a.styles.get("--browse-image-y"), focus = hero.styles.get("--browse-focus-scale");
    a.top = b.top = 100; hero.top = 100; win.listeners.get("scroll")(); flush();
    assert.notEqual(a.styles.get("--browse-image-y"), before);
    assert.ok(Number(hero.styles.get("--browse-focus-scale")) > Number(focus));
    a.top = 1000; win.listeners.get("scroll")(); flush(); a.top = 100; win.listeners.get("scroll")(); flush();
    assert.equal(a.runs.length, 1, "return scrolling must not replay entrances");
    const c = new Node(); c.key = "shake"; grid.children = [c]; mutate(); flush();
    assert.ok(!observed.has(a)); assert.ok(a.runs[0].cancelled);
    grid.listeners.get("focusin")({ target: { closest: () => c } });
    assert.ok(!c.attrs.has("data-browse-pending"), "keyboard focus must reveal offscreen content immediately");
    grid.children = [a]; mutate(); a.top = 100; flush();
    assert.equal(a.runs.length, 1, "returning to an already seen category must not replay");
    const d = new Node(); d.key = "pie"; grid.children = [d]; mutate(); flush();
    reduce.matches = true; reduce.listeners.get("change")();
    assert.ok(!root.classes.has("browse-motion-enabled")); assert.ok(!d.attrs.has("data-browse-pending"));
    assert.equal(frames.size, 0);
    reduce.matches = false; reduce.listeners.get("change")();
    doc.hidden = true; doc.listeners.get("visibilitychange")(); assert.equal(frames.size, 0);
    doc.hidden = false; doc.listeners.get("visibilitychange")(); assert.equal(frames.size, 1);
    dispose(); dispose = null;
    assert.equal(frames.size, 0); assert.equal(observed.size, 0); assert.equal(win.listeners.size, 0);
    assert.ok(!d.attrs.has("data-browse-card")); assert.equal(hero.styles.size, 0);
  } finally {
    dispose?.();
    for (const [k, descriptor] of Object.entries(saved)) { if (descriptor) Object.defineProperty(globalThis, k, descriptor); else delete globalThis[k]; }
  }
});
