import { CATEGORIES, ITEMS, ITEM_BY_ID, defaultOptions, normalizeOptions, itemPrice } from "./catalog.js";
import { STORAGE_KEY, COMBO_DISCOUNT, SPECIAL_DISCOUNT, loadState, savePendingState, createLine, lineUnitPrice, lineSummary, addLine, setLineQuantity, cartCount, cartTotal, saveCompletedOrder, savingsTotal, pointsBalance, rewardDiscount, orderTotal, REWARD_COST, POINTS_PER_ORDER } from "./cart.js";
import { createFoodScene } from "./food-scene.js";
import { specialStatus } from "./special.js";
import { setupPageMotion } from "./page-motion.js";
import { setupBrowseMotion } from "./browse-motion.js";
import { animateUI, animateAmount, animateCartArrival, replaceMenu, moveCategoryIndicator, stopMotionWithin } from "./ui-motion.js";

const $ = (selector, parent = document) => parent.querySelector(selector);
const all = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
const icon = (name) => "<svg class='icon' aria-hidden='true'><use href='#i-" + name + "'/></svg>";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error("Storage unavailable"); } }; }
let state = loadState(storage);
const returning = state.visited || state.cart.length > 0 || state.orders.length > 0;
let category = "burgers";
let draft = null;
let currentModal = null;
let modalSequence = 0;
let focusOrigin = null;
let scene = null;
let sceneToken = 0;
let previewMode = "3d";
let previewFailed = false;
let previewReady = false;
let previewLoading = false;
let builderSceneAbort = null;
let kitchenSceneAbort = null;
let kitchenScene = null;
let kitchenToken = 0;
let kitchenStage = 0;
let kitchenTimers = [];
let activeOrder = null;
let checkoutId = null;
let checkoutCart = "";
const checkoutSignature = value => JSON.stringify([value.cart, value.rewardLineId, pointsBalance(value)]);
let placingOrder = false;
let canPersist = true;
let toastTimer = null;
let undoCart = null;
let audioContext = null;
let previousCount = cartCount(state.cart);

async function persist() {
  const pending = structuredClone(state);
  const save = () => {
    const saved = savePendingState(storage, pending);
    // Preserve any newer in-memory draft/cart while refreshing the ledger.
    state.orders = saved.orders;
    canPersist = true;
    $("#storage-warning").hidden = true;
    updateStatus();
  };
  try {
    if (navigator.locks?.request) await navigator.locks.request("good-hour-checkout", save);
    else save();
    return true;
  } catch {
    canPersist = false;
    $("#storage-warning").hidden = false;
    return false;
  }
}
function announce(message) { $("#announcement").textContent = message; }
function clearUndo() {
  undoCart = null;
  if ($("[data-action='undo-clear']")) $("#toast").hidden = true;
}
function showToast(message, undo = false) {
  clearTimeout(toastTimer);
  const toast = $("#toast");
  toast.innerHTML = esc(message) + (undo ? " <button type='button' data-action='undo-clear'>Undo</button>" : "");
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; if (undo) undoCart = null; }, undo ? 10000 : 2800);
}
function sound(kind = "add") {
  if (!state.sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().catch(() => {});
    const notes = kind === "ready" ? [523.25, 659.25, 783.99] : kind === "order" ? [392, 523.25] : [659.25];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * .11;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.055, start + .018);
      gain.gain.exponentialRampToValueAtTime(.001, start + .24);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + .26);
    });
  } catch { /* Sound is optional; all feedback is also visible. */ }
}
function updateSoundButtons() {
  all("[data-action='sound']").forEach((button) => {
    button.innerHTML = icon(state.sound ? "sound" : "muted");
    button.setAttribute("aria-label", state.sound ? "Mute sound" : "Turn sound on");
    button.setAttribute("aria-pressed", String(state.sound));
  });
}
function updateStatus() {
  const count = cartCount(state.cart);
  $("#bag-count").textContent = count;
  $("#open-cart").setAttribute("aria-label", "Open your order, " + count + (count === 1 ? " item" : " items"));
  if (count !== previousCount && !reducedMotion.matches) {
    $("#open-cart").classList.remove("bump");
    void $("#open-cart").offsetWidth;
    $("#open-cart").classList.add("bump");
  }
  previousCount = count;
  $("#savings-total").textContent = money(savingsTotal(state));
  updateSoundButtons();
  renderWelcome();
}
function renderWelcome() {
  const strip = $("#welcome-strip");
  strip.hidden = !returning;
  if (!returning) return;
  if (state.cart.length) {
    strip.innerHTML = "<p><strong>Welcome back.</strong> Your " + cartCount(state.cart) + "-item order is right where you left it.</p><button class='text-button' data-action='cart'>Continue order <span aria-hidden='true'>›</span></button><button class='text-button quiet' data-action='new-order'>Start fresh</button>";
  } else if (state.draft) {
    strip.innerHTML = "<p><strong>Welcome back.</strong> Your last creation is saved.</p><button class='text-button' data-action='resume-draft'>Keep creating <span aria-hidden='true'>›</span></button>";
  } else {
    strip.innerHTML = "<p><strong>Good to see you again.</strong> There’s always room for another good idea.</p><button class='text-button' data-action='history'>Order history <span aria-hidden='true'>›</span></button>";
  }
}
function renderMenu(transition = false) {
  if (!$("#category-bar").children.length) $("#category-bar").innerHTML = "<span class='category-indicator' aria-hidden='true'></span>" + CATEGORIES.map((entry) => "<button type='button' data-category='" + entry.id + "' aria-pressed='" + (entry.id === category) + "'>" + esc(entry.label) + "<span>" + ITEMS.filter((item) => item.category === entry.id).length + "</span></button>").join("");
  all("[data-category]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.category === category)));
  moveCategoryIndicator($("#category-bar"));
  const items = ITEMS.filter((item) => item.category === category);
  const render = () => { $("#menu-grid").innerHTML = items.map((item, index) => "<article class='food-card' style='animation-delay:" + index * .035 + "s'><button class='food-image-button' type='button' data-item='" + item.id + "' aria-label='Customize " + esc(item.name) + "'><img src='" + item.image + "' alt='" + esc(item.name) + "' width='560' height='480' loading='lazy'>" + (item.id === "midnight-stack" ? "<span class='card-badge'>The house favorite</span>" : "") + "</button><div class='food-card-body'><h3>" + esc(item.name) + "</h3><p>" + esc(item.description) + "</p><div class='food-card-foot'><span>" + money(item.price) + "</span><button type='button' data-item='" + item.id + "' aria-label='Make " + esc(item.name) + " yours'>Make it yours " + icon("plus") + "</button></div></div></article>").join("");
  };
  if (transition) replaceMenu($("#menu-grid"), render); else render();
  $("#menu-status").textContent = items.length + " " + CATEGORIES.find((entry) => entry.id === category).label.toLowerCase() + " available.";
}
function modalHeader(kicker, closeLabel = "Close") {
  return "<header class='dialog-bar'><span class='dialog-kicker'>" + esc(kicker) + "</span><div class='dialog-tools'><button class='icon-button sound-toggle' type='button' data-action='sound' aria-label='Turn sound on'>" + icon(state.sound ? "sound" : "muted") + "</button><button class='icon-button' type='button' data-action='close' aria-label='" + esc(closeLabel) + "'>" + icon("close") + "</button></div></header>";
}
function cleanupModal(dialog) {
  if (dialog) stopMotionWithin(dialog);
  if (dialog?.id === "builder-dialog") {
    sceneToken++;
    builderSceneAbort?.abort();
    builderSceneAbort = null;
    scene?.dispose();
    scene = null;
  }
  if (dialog?.id === "journey-dialog") {
    kitchenToken++;
    kitchenSceneAbort?.abort();
    kitchenSceneAbort = null;
    kitchenTimers.forEach(clearTimeout);
    kitchenTimers = [];
    kitchenScene?.dispose();
    kitchenScene = null;
  }
}
function openModal(dialog) {
  modalSequence++;
  dialog.inert = false;
  dialog.classList.remove("motion-closing");
  stopMotionWithin(dialog);
  if (!currentModal) focusOrigin = document.activeElement;
  if (currentModal && currentModal !== dialog) {
    cleanupModal(currentModal);
    currentModal.close();
  }
  currentModal = dialog;
  document.body.classList.add("modal-open");
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  animateUI(dialog,
    dialog.id === "cart-dialog" ? [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }] : [{ opacity: 0, transform: "translateY(18px) scale(.985)" }, { opacity: 1, transform: "none" }],
    { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" },
  );
  updateSoundButtons();
}
function closeModal() {
  if (!currentModal || currentModal.classList.contains("motion-closing")) return;
  const closing = currentModal;
  const sequence = ++modalSequence;
  stopMotionWithin(closing);
  if (closing.id === "journey-dialog") { kitchenTimers.forEach(clearTimeout); kitchenTimers = []; }
  closing.classList.add("motion-closing");
  closing.inert = true;
  const finish = () => {
    exit?.cancel();
    if (sequence !== modalSequence) return;
    cleanupModal(closing);
    currentModal = null;
    closing.inert = false;
    closing.classList.remove("motion-closing");
    closing.close();
    document.body.classList.remove("modal-open");
    if (focusOrigin?.isConnected) focusOrigin.focus({ preventScroll: true });
  };
  const exit = animateUI(closing, closing.id === "cart-dialog"
    ? [{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(100%)", opacity: .6 }]
    : [{ transform: "none", opacity: 1 }, { transform: "translateY(14px) scale(.99)", opacity: 0 }],
    { duration: 230, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
  if (exit) exit.finished.then(finish, finish); else finish();
}
all("dialog").forEach((dialog) => {
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeModal(); });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeModal();
  });
});
function comboOptions(categoryId, selected) {
  return ITEMS.filter((item) => item.category === categoryId).map((item) => "<option value='" + item.id + "'" + (selected === item.id ? " selected" : "") + ">" + esc(item.name) + " · " + money(itemPrice(item.id)) + "</option>").join("");
}
function renderBuilderForm() {
  const item = ITEM_BY_ID[draft.itemId];
  const eligible = ["burgers", "breakfast"].includes(item.category);
  const entreeSelect = draft.combo ? "<label class='select-field entree-select'>Your entrée<select id='combo-entree'>" + ITEMS.filter((entry) => ["burgers", "breakfast"].includes(entry.category)).map((entry) => "<option value='" + entry.id + "'" + (entry.id === item.id ? " selected" : "") + ">" + esc(entry.name) + " · " + money(itemPrice(entry.id)) + "</option>").join("") + "</select></label>" : "";
  const groups = item.options.map((group) => "<fieldset><legend>" + esc(group.label) + "</legend><div class='choice-list'>" + group.choices.map((choice) => {
    const selected = Array.isArray(draft.options[group.id]) ? draft.options[group.id].includes(choice.id) : draft.options[group.id] === choice.id;
    return "<label class='option-choice'><input type='" + (group.type === "multiple" ? "checkbox" : "radio") + "' name='option-" + group.id + "' data-option='" + group.id + "' value='" + choice.id + "'" + (selected ? " checked" : "") + "><span>" + esc(choice.label) + "<small>" + (choice.price ? "+" + money(choice.price) : "Included") + "</small></span></label>";
  }).join("") + "</div></fieldset>").join("");
  const combo = eligible ? "<label class='combo-switch'><input id='make-combo' type='checkbox'" + (draft.combo ? " checked" : "") + "><span><strong>Make it a meal</strong><small>Entrée + side + drink. Take $3 off.</small></span></label>" + (draft.combo ? "<div class='combo-selects'><label class='select-field'>Your side<select id='combo-side'>" + comboOptions("sides", draft.combo.sideId) + "</select></label><label class='select-field'>Your drink<select id='combo-drink'>" + comboOptions("drinks", draft.combo.drinkId) + "</select></label><div class='combo-photos' id='combo-photos'></div><small class='combo-note'>The 3D preview shows your entrée. Sides and drinks come in their original, regular configuration.</small></div>" : "") : "";
  $("#builder-form").innerHTML = entreeSelect + "<p class='eyebrow'>" + esc(CATEGORIES.find((entry) => entry.id === item.category).label) + "</p><h2 id='builder-title'>" + esc(item.name) + ".</h2><p class='builder-description'>" + esc(item.description) + "</p>" + (draft.special ? "<p class='special-label'>Today’s fictional special: $2 off. This price stays with the item once it’s in your order.</p>" : "") + groups + combo;
  $("#builder-photo").src = item.image;
  $("#builder-photo").alt = item.name + ", original recipe before customization";
  updateBuilderTotal();
}
function renderMealPhotos() {
  const strip = $("#combo-photos");
  if (!strip || !draft?.combo) return;
  strip.innerHTML = [draft.combo.sideId, draft.combo.drinkId].map((id) => "<figure><img src='" + ITEM_BY_ID[id].image + "' alt=''><figcaption>" + esc(ITEM_BY_ID[id].name) + "</figcaption></figure>").join("");
}
function updateBuilderTotal() {
  if (!draft) return;
  const line = createLine(draft.itemId, draft.options, draft.combo, draft.special);
  const amount = lineUnitPrice(line);
  animateAmount($("#builder-total"), Number($("#builder-total").dataset.value ?? amount), amount, money);
  $("#builder-price-label").textContent = draft.combo ? "Your meal" : "Your creation";
  const discounts = (draft.combo ? COMBO_DISCOUNT : 0) + (draft.special ? SPECIAL_DISCOUNT : 0);
  $("#builder-discount").textContent = discounts ? "Includes " + money(discounts) + " in fictional offers" : "";
  renderMealPhotos();
  state.draft = structuredClone(draft);
  persist();
}
function setPreview(mode) {
  previewMode = mode;
  const show3d = mode === "3d" && scene && previewReady && !previewFailed;
  $("#food-scene").style.visibility = show3d ? "visible" : "hidden";
  $("#food-scene").setAttribute("aria-hidden", String(!show3d));
  const canvas = $("#food-scene canvas");
  if (canvas) { canvas.style.visibility = show3d ? "visible" : "hidden"; canvas.tabIndex = show3d ? 0 : -1; }
  $("#builder-photo").hidden = mode !== "photo" && !previewFailed;
  $("#preview-loading").hidden = mode !== "3d" || !previewLoading;
  $("#preview-controls").hidden = !show3d;
  all("[data-preview]").forEach((button) => { button.setAttribute("aria-pressed", String(button.dataset.preview === mode)); button.disabled = previewFailed && button.dataset.preview === "3d"; });
  const subject = draft?.combo ? "Entrée preview. " : "";
  $("#preview-caption").textContent = subject + (show3d ? "Your ingredients, in 3D. Drag to turn or use the controls." : previewLoading && mode === "3d" ? "Preparing your 3D ingredients. They’ll assemble here in a moment." : previewFailed ? "3D preview is unavailable here. Photo shows the original recipe; every option still works." : "Photo shows the original recipe. See your changes in 3D.");
}
async function startBuilderScene() {
  const token = ++sceneToken;
  const initialItemId = draft.itemId;
  const initialOptions = structuredClone(draft.options);
  builderSceneAbort?.abort();
  builderSceneAbort = new AbortController();
  previewFailed = false;
  previewReady = false;
  previewLoading = true;
  all("[data-preview]").forEach((button) => { button.disabled = false; });
  $("#preview-loading").hidden = false;
  setPreview(previewMode);
  $("#preview-controls").hidden = true;
  const result = await createFoodScene($("#food-scene"), {
    item: ITEM_BY_ID[initialItemId], options: initialOptions, reducedMotion: reducedMotion.matches,
    signal: builderSceneAbort.signal,
    onState: ({ ready, loading }) => {
      if (token !== sceneToken) return;
      previewReady = ready;
      previewLoading = loading;
      previewFailed = !ready && !loading;
      setPreview(previewMode);
    },
    onFallback: () => {
      if (token !== sceneToken) return;
      previewFailed = true;
      previewReady = false;
      previewLoading = false;
      $("#preview-loading").hidden = true;
      setPreview("photo");
    },
  });
  if (token !== sceneToken || currentModal?.id !== "builder-dialog") { result?.dispose(); return; }
  scene = result;
  $("#preview-loading").hidden = true;
  if (scene) {
    if (draft.itemId !== initialItemId || JSON.stringify(draft.options) !== JSON.stringify(initialOptions)) scene.update(ITEM_BY_ID[draft.itemId], draft.options);
    setPreview(previewMode);
  }
  else { previewFailed = true; setPreview("photo"); }
}
function openBuilder(itemId, { combo = false, special = false, resume = false } = {}) {
  const saved = resume ? state.draft : null;
  draft = saved ? structuredClone(saved) : { itemId, options: defaultOptions(itemId), combo: combo ? { sideId: "golden-fries", drinkId: "cherry-cloud-shake" } : null, special };
  if (!ITEM_BY_ID[draft.itemId]) return;
  draft.special = draft.special && specialStatus().active;
  previewMode = "3d";
  renderBuilderForm();
  openModal($("#builder-dialog"));
  $("#builder-form").scrollTop = 0;
  $(".builder-layout").scrollTop = 0;
  startBuilderScene().catch(() => { previewFailed = true; $("#preview-loading").hidden = true; setPreview("photo"); });
}
$("#builder-form").addEventListener("change", (event) => {
  if (!draft) return;
  const target = event.target;
  if (target.dataset.option) {
    const group = ITEM_BY_ID[draft.itemId].options.find((entry) => entry.id === target.dataset.option);
    draft.options[group.id] = group.type === "multiple" ? all("input[data-option='" + group.id + "']:checked", $("#builder-form")).map((input) => input.value) : target.value;
    draft.options = normalizeOptions(draft.itemId, draft.options);
  } else if (target.id === "make-combo") {
    draft.combo = target.checked ? { sideId: "golden-fries", drinkId: "cherry-cloud-shake" } : null;
    renderBuilderForm();
    $("#make-combo")?.focus({ preventScroll: true });
  } else if (target.id === "combo-entree") {
    draft.itemId = target.value;
    draft.options = defaultOptions(target.value);
    draft.special = false;
    renderBuilderForm();
    $("#combo-entree")?.focus({ preventScroll: true });
  } else if (target.id === "combo-side") draft.combo.sideId = target.value;
  else if (target.id === "combo-drink") draft.combo.drinkId = target.value;
  updateBuilderTotal();
  scene?.update(ITEM_BY_ID[draft.itemId], draft.options);
  setPreview(previewMode);
});
function lineDiscount(line) { return (line.combo ? COMBO_DISCOUNT : 0) + (line.special ? SPECIAL_DISCOUNT : 0); }
function totalDiscount(lines) { return lines.reduce((total, line) => total + lineDiscount(line) * line.quantity, 0); }
function rewardsCard({ cart = false } = {}) {
  const balance = pointsBalance(state);
  const available = balance >= REWARD_COST;
  const selected = rewardDiscount(state) > 0;
  const desserts = state.cart.filter(line => ITEM_BY_ID[line.itemId].category === "desserts");
  const options = cart && available ? (desserts.length ? desserts.map(line => "<button class='reward-choice' type='button' data-reward-line='" + line.id + "' aria-pressed='" + (selected && state.rewardLineId === line.id) + "'>" + icon(selected && state.rewardLineId === line.id ? "check" : "plus") + "<span>" + (selected && state.rewardLineId === line.id ? "Remove reward from " : "Use 100 points on ") + esc(ITEM_BY_ID[line.itemId].name) + "</span></button>").join("") : "<button class='text-button' type='button' data-action='reward-desserts'>Choose a dessert <span aria-hidden='true'>›</span></button>") : "";
  return "<section class='rewards-card' aria-label='Good Hour Points'><div class='rewards-heading'><span>Good Hour Points</span><strong>" + balance + " <small>points</small></strong></div><meter min='0' max='100' value='" + Math.min(100, balance) + "' aria-label='Progress toward a 100-point dessert reward'></meter><p>" + (available ? "Your dessert reward is ready." : (100 - balance) + " points to your next dessert reward.") + "</p><small>10 points per completed fictional order. 100 points covers one dessert’s base price; extras cost the usual fictional amount. One reward per order. Saved in this browser, with no cash value or expiry.</small>" + options + (selected && cart ? "<p class='reward-applied' role='status'>100 points will be used when you place this order.</p>" : "") + "</section>";
}
function renderCart() {
  const previous = new Map(all(".cart-line[data-line-id]").map(row => [row.dataset.lineId, {
    quantity: Number($(".quantity-value", row)?.dataset.value),
    total: Number($(".cart-line-price", row)?.dataset.value),
  }]));
  const oldTotal = Number($("#cart-total")?.dataset.value);
  const isUpdating = currentModal?.id === "cart-dialog";
  const count = cartCount(state.cart);
  const reward = rewardDiscount(state);
  const total = orderTotal(state);
  const heading = "<div class='cart-heading'><div><p>Good Hour Diner</p><h2 id='cart-title'>Your order.</h2></div><button class='icon-button' data-action='close' type='button' aria-label='Close your order'>" + icon("close") + "</button></div>";
  if (!count) {
    $("#cart-content").innerHTML = heading + "<div class='cart-empty-content'><div class='empty-state'>" + icon("bag") + "<h3>Something good starts here.</h3><p>Your order is empty. Find a favorite and make it yours.</p><button class='button primary' data-action='browse'>Explore the menu</button></div>" + rewardsCard({ cart: true }) + "</div>";
    return;
  }
  const lines = state.cart.map((line) => {
    const item = ITEM_BY_ID[line.itemId];
    return "<article class='cart-line' data-line-id='" + line.id + "'><img src='" + item.image + "' alt='' width='76' height='85'><div><div class='cart-line-heading'><h3>" + esc(item.name) + (line.combo ? " meal" : "") + "</h3><strong class='cart-line-price' data-value='" + lineUnitPrice(line) * line.quantity + "'>" + money(lineUnitPrice(line) * line.quantity) + "</strong></div><p>" + lineSummary(line).map(esc).join(" · ") + "</p><div class='line-actions'><div class='quantity-controls' aria-label='Quantity for " + esc(item.name) + "'><button data-quantity='" + line.id + "' data-delta='-1' aria-label='Remove one " + esc(item.name) + "'>−</button><span class='quantity-value' data-value='" + line.quantity + "' aria-label='Quantity " + line.quantity + "'>" + line.quantity + "</span><button data-quantity='" + line.id + "' data-delta='1' aria-label='Add one " + esc(item.name) + "'" + (line.quantity >= 99 ? " disabled" : "") + ">+</button></div><button class='remove-button' data-remove='" + line.id + "' aria-label='Remove " + esc(item.name) + " from order'>Remove</button></div></div></article>";
  }).join("");
  $("#cart-content").innerHTML = heading + "<div class='cart-items'>" + lines + "</div>" + rewardsCard({ cart: true }) + "<div class='cart-summary'><div class='summary-row total'><span>Fictional total</span><strong id='cart-total' data-value='" + total + "'>" + money(total) + "</strong></div>" + (totalDiscount(state.cart) ? "<div class='summary-row actual'><span>Offers included</span><span>−" + money(totalDiscount(state.cart)) + "</span></div>" : "") + (reward ? "<div class='summary-row actual'><span>Points reward · 100 points</span><span>−" + money(reward) + "</span></div>" : "") + "<div class='summary-row actual'><span>Actually charged</span><strong>$0</strong></div><button class='button primary' data-action='checkout'>Review fictional order " + icon("arrow") + "</button><p>No payment. No delivery. Just the good feeling.</p></div>";
  if (isUpdating) {
    for (const row of all(".cart-line[data-line-id]")) {
      const before = previous.get(row.dataset.lineId);
      if (!before) continue;
      const quantity = $(".quantity-value", row), total = $(".cart-line-price", row);
      animateAmount(quantity, before.quantity, Number(quantity.dataset.value), String, { duration: 240 });
      animateAmount(total, before.total, Number(total.dataset.value), money);
    }
    animateAmount($("#cart-total"), oldTotal, total, money);
  }
}
function openCart(arrivalId = null) {
  renderCart();
  openModal($("#cart-dialog"));
  if (arrivalId) animateCartArrival($("#cart-dialog"), arrivalId);
}
function checkoutRows(lines) {
  return lines.map((line) => "<div class='checkout-line'><img src='" + ITEM_BY_ID[line.itemId].image + "' alt=''><div><h3>" + line.quantity + " × " + esc(ITEM_BY_ID[line.itemId].name) + (line.combo ? " meal" : "") + "</h3><p>" + lineSummary(line).map(esc).join(" · ") + "</p></div><strong>" + money(lineUnitPrice(line) * line.quantity) + "</strong></div>").join("");
}
function beginCheckout() {
  if (!state.cart.length) return openCart();
  placingOrder = false;
  checkoutId = "order-" + (crypto.randomUUID?.() || Date.now().toString(36));
  checkoutCart = checkoutSignature(state);
  const total = orderTotal(state);
  const reward = rewardDiscount(state);
  const discount = totalDiscount(state.cart);
  $("#journey-content").innerHTML = modalHeader("One last look", "Close order review") + "<div class='checkout-body'><p class='eyebrow'>Only a good feeling at checkout</p><h2 id='journey-title'>Ready when you are.</h2><p>Your meal is all set. Place this fictional order to see it come together.</p><div class='fiction-note'>" + icon("spark") + "<p><strong>This is a simulation.</strong> No payment is collected, no personal details are needed, and no food is prepared or delivered.</p></div><div class='checkout-lines'>" + checkoutRows(state.cart) + "</div><div class='checkout-totals'><div class='summary-row'><span>Menu subtotal</span><span>" + money(total + discount + reward) + "</span></div>" + (discount ? "<div class='summary-row'><span>Meal & special offers</span><span>−" + money(discount) + "</span></div>" : "") + (reward ? "<div class='summary-row'><span>Points reward · 100 points</span><span>−" + money(reward) + "</span></div>" : "") + "<div class='summary-row total'><span>Fictional total</span><strong>" + money(total) + "</strong></div><div class='summary-row actual'><span>Actual charge</span><strong>$0</strong></div><p class='reward-checkout-note'>You’ll earn 10 Good Hour Points when this order is saved.</p></div><div class='checkout-actions'><button class='text-button' data-action='cart'>Back to your order</button><button class='button primary' data-action='place-order'>Place fictional order " + icon("arrow") + "</button></div></div>";
  openModal($("#journey-dialog"));
}
async function placeOrder() {
  if (placingOrder || !checkoutId) return;
  clearUndo();
  placingOrder = true;
  const submit = $("[data-action='place-order']");
  if (submit) { submit.disabled = true; submit.textContent = "Saving your order…"; }
  const submitOrder = () => {
    // Read failures must not be mistaken for an empty saved history. When a
    // previous save failed, only continue if its snapshot still matches the
    // last durable state; otherwise ask the visitor to review the newer state.
    storage.getItem(STORAGE_KEY);
    const saved = loadState(storage);
    const latest = canPersist ? saved : { ...state, orders: saved.orders };
    if (!canPersist && pointsBalance(saved) !== pointsBalance(state)) {
      state = { ...saved, cart: state.cart, rewardLineId: state.rewardLineId };
      updateStatus(); openCart();
      showToast("Your points changed in another tab. Please review your order.");
      return;
    }
    if (checkoutSignature(latest) !== checkoutCart) {
      state = latest;
      updateStatus();
      openCart();
      showToast("Your order changed in another tab. Please review it.");
      return;
    }
    const result = saveCompletedOrder(storage, latest, { id: checkoutId, createdAt: new Date().toISOString() });
    if (!result.order) { state = result.state; openCart(); if (result.error) showToast("Your points changed. Remove the reward or earn more points before ordering."); return; }
    state = result.state;
    activeOrder = result.order;
    canPersist = true;
    $("#storage-warning").hidden = true;
    updateStatus();
    sound("order");
    announce("Fictional order received. Nothing was charged.");
    renderKitchen(activeOrder);
  };
  try {
    if (navigator.locks?.request) await navigator.locks.request("good-hour-checkout", submitOrder);
    else if (state.rewardLineId) {
      openCart();
      showToast("Reward redemption needs a browser with secure shared checkout. Your points have not been used.");
    } else submitOrder();
  } catch {
    canPersist = false;
    $("#storage-warning").hidden = false;
    openCart();
    showToast("Your order could not be saved. Your cart and points are unchanged. Free some browser storage and try again.");
  } finally {
    placingOrder = false;
    checkoutId = null;
  }
}
const stages = [
  { title: "Order received.", description: "Your good idea has arrived at our imaginary kitchen.", name: "Received" },
  { title: "A little sizzle.", description: "The griddle is on. Your favorites are coming together.", name: "Cooking" },
  { title: "The finishing touch.", description: "Every detail, exactly the way you chose it.", name: "Plating" },
  { title: "Your good thing is ready.", description: "One perfect pretend meal. Every real dollar still yours.", name: "Ready" },
];
function updateKitchen(stage) {
  if (currentModal?.id !== "journey-dialog" || !$("#kitchen-title")) return;
  const wasReady = kitchenStage === 3;
  kitchenStage = stage;
  $("#kitchen-title").textContent = stages[stage].title;
  $("#kitchen-description").textContent = stages[stage].description;
  $("#kitchen-stage-label").textContent = stage === 0 ? "GOOD HOUR · ORDER RECEIVED" : stage === 1 ? "A LITTLE IMAGINARY SIZZLE" : "MADE YOUR WAY";
  $(".kitchen-preview").classList.toggle("ready", stage === 3);
  $(".kitchen-preview").classList.toggle("cooking", stage === 1);
  animateUI($("#kitchen-title"), [{ opacity: .4, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 420 });
  $(".kitchen-preview").classList.toggle("plating", stage === 2);
  all(".stage-list li").forEach((node, index) => { node.classList.toggle("complete", index < stage); node.classList.toggle("active", index === stage); if (index === stage) node.setAttribute("aria-current", "step"); else node.removeAttribute("aria-current"); });
  $("#kitchen-actions").innerHTML = stage === 3 ? "<button class='button primary' data-action='receipt'>See what you kept " + icon("arrow") + "</button>" : "<button class='text-button' data-action='skip-kitchen'>Skip to the good part <span aria-hidden='true'>›</span></button>";
  announce(stages[stage].title + " " + stages[stage].description);
  if (stage === 3 && !wasReady) { kitchenScene?.assemble(); sound("ready"); confetti(); }
}
function orderPreviewHtml(order) {
  const dishes = order.lines.flatMap((line) => [line.itemId, ...(line.combo ? [line.combo.sideId, line.combo.drinkId] : [])].map((id) => ({ item: ITEM_BY_ID[id], quantity: line.quantity })));
  return "<div class='kitchen-order' aria-label='Your complete fictional order'>" + dishes.map(({ item, quantity }) => "<figure><img src='" + item.image + "' alt=''><figcaption>" + quantity + " × " + esc(item.name) + "</figcaption></figure>").join("") + "</div>";
}
async function renderKitchen(order) {
  kitchenTimers.forEach(clearTimeout);
  kitchenTimers = [];
  kitchenStage = -1;
  const first = order.lines[0];
  $("#journey-content").innerHTML = modalHeader("Your fictional kitchen", "Close kitchen and keep order in history") + "<div class='kitchen-body'><p class='eyebrow'>Made with a little imagination</p><h2 id='journey-title' class='sr-only'>Fictional order progress</h2><h2 id='kitchen-title'>Order received.</h2><p class='kitchen-description' id='kitchen-description'></p><div class='kitchen-preview'><img src='" + ITEM_BY_ID[first.itemId].image + "' alt='" + esc(ITEM_BY_ID[first.itemId].name) + "'><div id='kitchen-scene'></div><div class='kitchen-heat' aria-hidden='true'></div><div class='kitchen-cloche'></div><div class='kitchen-steam' aria-hidden='true'><i></i><i></i><i></i></div><span class='kitchen-stage-label' id='kitchen-stage-label'></span></div><ol class='stage-list' aria-label='Fictional preparation stages'>" + stages.map((stage) => "<li>" + stage.name + "</li>").join("") + "</ol><p class='kitchen-featured'>Featured preview: " + esc(ITEM_BY_ID[first.itemId].name) + ". Your complete order is below.</p>" + orderPreviewHtml(order) + "<div class='kitchen-actions' id='kitchen-actions'></div><p class='kitchen-fine'>A fictional kitchen sequence. No food is being prepared or delivered.</p></div>";
  openModal($("#journey-dialog"));
  updateKitchen(reducedMotion.matches ? 3 : 0);
  if (!reducedMotion.matches) [[1800, 1], [4000, 2], [6400, 3]].forEach(([delay, stage]) => kitchenTimers.push(setTimeout(() => updateKitchen(stage), delay)));
  const token = ++kitchenToken;
  kitchenSceneAbort?.abort();
  kitchenSceneAbort = new AbortController();
  try {
    const result = await createFoodScene($("#kitchen-scene"), { item: ITEM_BY_ID[first.itemId], options: first.options, reducedMotion: reducedMotion.matches, signal: kitchenSceneAbort.signal, onState: ({ ready }) => { if (token === kitchenToken) $(".kitchen-preview")?.classList.toggle("has-scene", ready); }, onFallback: () => { if (token === kitchenToken) $(".kitchen-preview")?.classList.remove("has-scene"); } });
    if (token !== kitchenToken || !$("#kitchen-scene") || currentModal?.id !== "journey-dialog") { result?.dispose(); return; }
    kitchenScene = result;
  } catch { /* The photograph remains a complete fallback. */ }
}
function confetti() {
  if (reducedMotion.matches) return;
  const layer = $("#confetti");
  layer.replaceChildren();
  for (let index = 0; index < 32; index++) {
    const piece = document.createElement("i");
    piece.className = "confetti-piece";
    piece.style.left = (18 + Math.random() * 64) + "%";
    piece.style.background = ["#c62828", "#c1c5cc", "#d8b875", "#f7e7c8"][index % 4];
    piece.style.setProperty("--drift", (-120 + Math.random() * 240) + "px");
    piece.style.setProperty("--turn", (Math.random() * 600 - 300) + "deg");
    piece.style.animationDelay = (Math.random() * .2) + "s";
    layer.append(piece);
  }
  setTimeout(() => layer.replaceChildren(), 2300);
}
function renderReceipt(order, fromHistory = false) {
  if (!order) return;
  cleanupModal($("#journey-dialog"));
  activeOrder = order;
  const date = new Date(order.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const discount = totalDiscount(order.lines);
  const reward = order.reward?.discount || 0;
  $("#journey-content").innerHTML = modalHeader("Your Good Hour receipt", "Close receipt") + "<div class='receipt-body'><div class='receipt-hero'><span class='receipt-check'>" + icon("check") + "</span><p class='eyebrow'>The meal was pretend. The feeling is yours.</p><h2 id='journey-title'>Keep the good feeling.</h2><p>And every real dollar.</p></div><div class='receipt-paper'><div class='receipt-meta'><span>GOOD HOUR DINER<br>FICTIONAL ORDER</span><span>" + esc(date) + "<br>#" + esc(order.id.slice(-6).toUpperCase()) + "</span></div>" + order.lines.map((line) => "<div class='receipt-line'><strong>" + line.quantity + " × " + esc(ITEM_BY_ID[line.itemId].name) + (line.combo ? " meal" : "") + "</strong><span>" + money(((line.unitPrice ?? lineUnitPrice(line)) + lineDiscount(line)) * line.quantity) + "</span><small>" + lineSummary(line).map(esc).join(" · ") + "</small></div>").join("") + "<div class='receipt-totals'><div class='summary-row'><span>Menu subtotal</span><span>" + money(order.total + discount + reward) + "</span></div>" + (discount ? "<div class='summary-row'><span>Meal & special offers</span><span>−" + money(discount) + "</span></div>" : "") + (reward ? "<div class='summary-row'><span>Points reward · 100 points</span><span>−" + money(reward) + "</span></div>" : "") + "<div class='summary-row'><span>Fictional total</span><strong>" + money(order.total) + "</strong></div><div class='summary-row'><span>Actually paid</span><strong>$0</strong></div><div class='kept'><span>Money not spent</span><strong id='receipt-kept'>" + money(order.total) + "</strong></div></div><p>No purchase, payment, preparation, or delivery occurred.<br>This receipt is a reflection on a fictional order.</p></div><p class='receipt-cumulative'>Across your orders: <strong>" + money(savingsTotal(state)) + "</strong> in money not spent.</p><div class='receipt-points'><strong>+" + (order.pointsEarned ?? POINTS_PER_ORDER) + " Good Hour Points</strong>" + (order.pointsSpent ? "<span>" + order.pointsSpent + " points redeemed on this visit.</span>" : "") + "<span>Current balance: " + pointsBalance(state) + " points</span></div><div class='receipt-actions'><button class='button primary' data-action='browse'>Back to the menu</button><button class='text-button' data-action='history'>" + (fromHistory ? "Back to order history" : "View order history") + " <span aria-hidden='true'>›</span></button></div></div>";
  openModal($("#journey-dialog"));
  animateUI($(".receipt-paper"), [{ opacity: 0, transform: "translateY(-24px) scaleY(.94)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: 100, fill: "backwards" });
  animateUI($(".receipt-check"), [{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1.08)", opacity: 1, offset: .7 }, { transform: "scale(1)", opacity: 1 }], { duration: 520 });
  if (!fromHistory) animateAmount($("#receipt-kept"), 0, order.total, money, { duration: 950, step: order.total % 100 ? 1 : 100 });
}
function openHistory() {
  const total = savingsTotal(state);
  $("#history-content").innerHTML = modalHeader("Good things, remembered", "Close order history") + "<div class='history-body'><p class='eyebrow'>Your corner of the diner</p><h2 id='history-title'>Order history.</h2><p class='history-intro'>Every fictional order, saved in this browser. Come back for the feeling, and keep the real money.</p><div class='history-total'><span>Money not spent</span><strong>" + money(total) + "</strong></div>" + rewardsCard() + (state.orders.length ? state.orders.map((order) => {
    const first = ITEM_BY_ID[order.lines[0].itemId];
    const quantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);
    const date = new Date(order.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return "<button class='history-order' type='button' data-receipt='" + order.id + "' aria-label='View receipt for " + esc(date) + ", " + money(order.total) + "'><img src='" + first.image + "' alt=''><div><h3>" + esc(first.name) + (quantity > 1 ? " + more" : "") + "</h3><p>" + esc(date) + " · " + quantity + (quantity === 1 ? " item" : " items") + "</p></div><strong>" + money(order.total) + "</strong>" + icon("arrow") + "</button>";
  }).join("") : "<div class='empty-state'>" + icon("clock") + "<h3>Your first good hour awaits.</h3><p>Place a fictional order and its receipt will appear here.</p><button class='button primary' data-action='browse'>Explore the menu</button></div>") + "<p class='history-fine'>These are pretend menu totals, not measured real-world savings. Nothing has been purchased. Clearing your browser data removes these visits.</p></div>";
  openModal($("#history-dialog"));
}
function updateSpecial() {
  const offer = specialStatus();
  const hours = Math.floor(offer.remainingSeconds / 3600);
  const minutes = Math.floor(offer.remainingSeconds % 3600 / 60);
  $("#special-countdown").textContent = offer.active ? String(hours).padStart(2, "0") + "h " + String(minutes).padStart(2, "0") + "m until midnight" : "Back at 8 a.m. · your local time";
  $("#special-countdown").setAttribute("aria-label", offer.active ? "Time remaining in today's fictional special: " + hours + " hours and " + minutes + " minutes" : "The daily fictional special returns at 8 a.m., your local time");
  const button = $("[data-special='true']");
  button.disabled = !offer.active;
  button.textContent = offer.active ? "Make it yours" : "Back at 8 a.m.";
  $("#special-price").textContent = offer.active ? "$12" : "$14";
  $("#special-original-price").hidden = !offer.active;
  if (!offer.active && draft?.special && currentModal?.id === "builder-dialog") {
    draft.special = false;
    renderBuilderForm();
    announce("The daily special has ended. Your creation now shows the regular price. Offers already in your order stay locked.");
  }
}
document.addEventListener("click", (event) => {
  if (currentModal?.classList.contains("motion-closing")) return;
  const target = event.target.closest("button,a");
  if (!target) return;
  if (target.dataset.category) {
    if (category === target.dataset.category) return;
    category = target.dataset.category; renderMenu(true); $("[data-category='" + category + "']").focus({ preventScroll: true }); return;
  }
  if (target.dataset.item) { openBuilder(target.dataset.item, { special: target.dataset.special === "true" }); return; }
  if (target.dataset.preview) { setPreview(target.dataset.preview); return; }
  if (target.dataset.view) {
    const action = target.dataset.view;
    if (action === "left") scene?.rotate(-.35);
    if (action === "right") scene?.rotate(.35);
    if (action === "in") scene?.zoom(.5);
    if (action === "out") scene?.zoom(-.5);
    if (action === "reset") scene?.reset();
    if (action === "assemble") scene?.assemble();
    return;
  }
  if (target.dataset.quantity || target.dataset.remove) {
    const id = target.dataset.quantity || target.dataset.remove;
    const line = state.cart.find((entry) => entry.id === id);
    if (!line) return;
    clearUndo();
    const next = target.dataset.remove ? 0 : line.quantity + Number(target.dataset.delta);
    state.cart = setLineQuantity(state.cart, id, next);
    if (!state.cart.some(line => line.id === state.rewardLineId)) state.rewardLineId = null;
    persist(); updateStatus(); renderCart();
    const replacement = target.dataset.remove ? $(".cart-heading button") : $("[data-quantity='" + id + "'][data-delta='" + target.dataset.delta + "']") || $(".cart-heading button");
    replacement?.focus({ preventScroll: true });
    announce(ITEM_BY_ID[line.itemId].name + (next <= 0 ? " removed from your order." : " quantity " + next + "."));
    return;
  }
  if (target.dataset.rewardLine) {
    state.rewardLineId = state.rewardLineId === target.dataset.rewardLine ? null : target.dataset.rewardLine;
    persist(); renderCart();
    $("[data-reward-line='" + target.dataset.rewardLine + "']")?.focus({ preventScroll: true });
    announce(rewardDiscount(state) ? "Dessert reward applied. Points are used only when the order is placed." : "Reward removed. Your points are unchanged.");
    return;
  }
  if (target.dataset.receipt) { renderReceipt(state.orders.find((order) => order.id === target.dataset.receipt), true); return; }
  switch (target.dataset.action) {
    case "close": closeModal(); break;
    case "cart": openCart(); break;
    case "combo": openBuilder("midnight-stack", { combo: true, resume: Boolean(state.draft?.combo) }); break;
    case "resume-draft": if (state.draft) openBuilder(state.draft.itemId, { resume: true }); break;
    case "history": openHistory(); break;
    case "reward-desserts": category = "desserts"; renderMenu(true); closeModal(); $("#menu").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth" }); break;
    case "browse": closeModal(); $("#menu").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth" }); break;
    case "checkout": beginCheckout(); break;
    case "place-order": placeOrder(); break;
    case "receipt": renderReceipt(activeOrder); break;
    case "skip-kitchen": kitchenTimers.forEach(clearTimeout); kitchenTimers = []; updateKitchen(3); break;
    case "sound": state.sound = !state.sound; persist(); updateSoundButtons(); if (state.sound) sound(); announce(state.sound ? "Sound on." : "Sound muted."); break;
    case "add-configured": {
      if (!draft) break;
      if (draft.special && !specialStatus().active) { updateSpecial(); showToast("The special has ended. Review the updated price before adding."); break; }
      clearUndo();
      const added = createLine(draft.itemId, draft.options, draft.combo, draft.special);
      const previousQuantities = new Map(state.cart.map(line => [line.id, line.quantity]));
      state.cart = addLine(state.cart, added);
      const changed = state.cart.find(line => !previousQuantities.has(line.id) || previousQuantities.get(line.id) !== line.quantity);
      persist(); updateStatus(); sound(); announce(ITEM_BY_ID[draft.itemId].name + " added to your order."); openCart(changed?.id); break;
    }
    case "new-order": undoCart = structuredClone(state.cart); state.cart = []; state.rewardLineId = null; persist(); updateStatus(); showToast("Your order is clear.", true); break;
    case "undo-clear": if (undoCart) { state.cart = undoCart; undoCart = null; persist(); updateStatus(); $("#toast").hidden = true; announce("Your order was restored."); } break;
  }
});
function setupReveals() {
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  }), { threshold: .12 });
  all("[data-reveal]").forEach((node) => { if (node.getBoundingClientRect().top > innerHeight) { node.classList.add("will-reveal"); observer.observe(node); } });
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) { observer.disconnect(); all("[data-reveal]").forEach((node) => node.classList.add("is-visible")); } });
}
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches && $("#kitchen-title")) { kitchenTimers.forEach(clearTimeout); kitchenTimers = []; updateKitchen(3); }
});
window.addEventListener("storage", (event) => {
  if ((event.key !== STORAGE_KEY && event.key !== null) || placingOrder) return;
  clearUndo();
  state = loadState(storage);
  updateStatus();
  if (currentModal?.id === "cart-dialog") renderCart();
  if (currentModal?.id === "history-dialog") openHistory();
  if ($("[data-action='place-order']") && currentModal?.id === "journey-dialog") { openCart(); showToast("Your order changed in another tab. Please review it."); }
});
state.visited = true;
persist();
renderMenu();
updateStatus();
updateSpecial();
setInterval(updateSpecial, 30000);
setupReveals();

setupPageMotion();
setupBrowseMotion();
if ("ResizeObserver" in window) new ResizeObserver(() => moveCategoryIndicator($("#category-bar"))).observe($("#category-bar"));
document.fonts?.ready.then(() => moveCategoryIndicator($("#category-bar")));
