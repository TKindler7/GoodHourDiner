import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as cart from '../cart.js';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const checkout = source.slice(source.indexOf('async function placeOrder()'), source.indexOf('const stages ='));
function harness() {
  let state = cart.emptyState();
  for (let index = 0; index < 10; index++) state = cart.completeOrder({ ...state, cart: [cart.createLine('golden-fries')] }, { id: `old-${index}` }).state;
  state.cart = [cart.createLine('brownie-skillet')]; state.rewardLineId = state.cart[0].id;
  let stored = JSON.stringify(state), denied = false;
  const events = [];
  const nodes = new Map();
  const signature = value => JSON.stringify([value.cart, value.rewardLineId, cart.pointsBalance(value)]);
  const context = vm.createContext({
    ...cart, state, checkoutId: 'checkout-fixed', checkoutCart: signature(state), checkoutSignature: signature,
    canPersist: true, placingOrder: false, activeOrder: null,
    storage: { getItem: () => stored, setItem: (_key, value) => { if (denied) throw new Error('full'); stored = value; } },
    navigator: { locks: { request: async (name, callback) => { events.push(name); callback(); } } },
    $: selector => { if (!nodes.has(selector)) nodes.set(selector, {}); return nodes.get(selector); },
    clearUndo() {}, updateStatus() {}, openCart() { events.push('cart'); }, showToast(message) { events.push(message); },
    sound() {}, announce() {}, renderKitchen() { events.push('kitchen'); },
  });
  vm.runInContext(checkout, context);
  return { context, events, nodes, get stored() { return stored; }, set stored(value) { stored = value; }, deny() { denied = true; }, run: () => context.placeOrder() };
}

test('checkout UI publishes success only after durable order/points commit under shared lock', async () => {
  const app = harness();
  await app.run();
  assert.deepEqual(app.events, ['good-hour-checkout', 'kitchen']);
  assert.equal(cart.pointsBalance(app.context.state), 10);
  assert.equal(app.context.state.cart.length, 0);
  assert.equal(cart.pointsBalance(JSON.parse(app.stored)), 10);
  await app.run();
  assert.equal(app.events.filter(event => event === 'kitchen').length, 1);
});

test('checkout UI save failure retains its in-memory cart and points and never shows kitchen success', async () => {
  const app = harness(), initialStored = app.stored;
  app.deny(); await app.run();
  assert.equal(app.stored, initialStored);
  assert.equal(app.context.state.cart.length, 1);
  assert.equal(cart.pointsBalance(app.context.state), 100);
  assert.equal(app.events.includes('kitchen'), false);
  assert.equal(app.nodes.get('#storage-warning').hidden, false);
  assert.ok(app.events.some(event => /could not be saved/.test(event)));
});

test('checkout UI rechecks shared state and refuses a reward already spent by another tab', async () => {
  const app = harness();
  app.stored = JSON.stringify(cart.completeOrder(JSON.parse(app.stored), { id: 'another-tab' }).state);
  await app.run();
  assert.equal(app.events.includes('kitchen'), false);
  assert.ok(app.events.some(event => /another tab/.test(event)));
  assert.equal(cart.pointsBalance(app.context.state), 10);
});

const persist = source.slice(source.indexOf('async function persist()'), source.indexOf('function announce('));

test('ordinary persistence from a stale tab preserves another tab’s completed redemption ledger', async () => {
  const app = harness();
  const pendingCart = app.context.state.cart;
  app.context.structuredClone = structuredClone;
  vm.runInContext(persist, app.context);
  // Another tab completes while this tab's storage event is still queued.
  app.stored = JSON.stringify(cart.completeOrder(JSON.parse(app.stored), { id: 'other-tab-redemption' }).state);
  app.context.state.sound = true;
  assert.equal(await app.context.persist(), true);
  const saved = JSON.parse(app.stored);
  assert.equal(cart.pointsBalance(saved), 10);
  assert.equal(saved.orders.length, 11);
  assert.equal(saved.orders[0].id, 'other-tab-redemption');
  assert.equal(saved.sound, true);
  assert.equal(saved.cart[0].id, pendingCart[0].id);
  assert.equal(cart.pointsBalance(app.context.state), 10);
  assert.deepEqual(app.events, ['good-hour-checkout']);
});

test('ordinary persistence read failure cannot replace the durable ledger with empty history', async () => {
  const app = harness(), saved = app.stored;
  app.context.structuredClone = structuredClone;
  vm.runInContext(persist, app.context);
  app.context.storage.getItem = () => { throw new Error('denied'); };
  assert.equal(await app.context.persist(), false);
  assert.equal(app.stored, saved);
  assert.equal(app.context.state.cart.length, 1);
  assert.equal(cart.pointsBalance(app.context.state), 100);
  assert.equal(app.nodes.get('#storage-warning').hidden, false);
});
