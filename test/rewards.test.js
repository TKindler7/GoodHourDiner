import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_BY_ID } from '../catalog.js';
import { emptyState, createLine, completeOrder, normalizeState, pointsBalance, rewardDiscount, orderTotal, saveState, loadState, saveCompletedOrder, STORAGE_KEY, setLineQuantity, savingsTotal } from '../cart.js';

const store = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
function visits(count) {
  let state = emptyState();
  for (let i = 0; i < count; i++) {
    state.cart = [createLine('golden-fries')];
    state = completeOrder(state, { id: `visit-${i}`, createdAt: `2026-11-01T12:${String(i).padStart(2, '0')}:00Z` }).state;
  }
  return state;
}
function dessert(state, quantity = 1) {
  const line = { ...createLine('brownie-skillet', { toppings: ['vanilla', 'chocolate', 'whipped-cream'] }), quantity };
  return { ...state, cart: [line], rewardLineId: line.id };
}

test('10 points per unique completed order; old history migrates once without losing data', () => {
  const original = visits(10);
  const old = { ...original, cart: [createLine('midnight-stack')], sound: true, rewardsVersion: undefined, orders: original.orders.map(({ pointsEarned, pointsSpent, reward, ...order }) => order) };
  const storage = store();
  storage.setItem(STORAGE_KEY, JSON.stringify(old));
  const first = loadState(storage);
  assert.equal(pointsBalance(first), 100);
  assert.equal(first.rewardsVersion, 1);
  assert.equal(first.cart.length, 1);
  assert.equal(first.sound, true);
  assert.ok(saveState(storage, first));
  assert.deepEqual(loadState(storage), first);
  const replay = completeOrder(first, { id: 'visit-9' }).state;
  assert.equal(pointsBalance(replay), 100);
  assert.equal(replay.cart.length, 1);
  assert.equal(pointsBalance({ ...first, orders: [...first.orders, first.orders[0]] }), 100);
});

test('redeeming covers one dessert base price only, even with extras and multiple servings', () => {
  const before = dessert(visits(10), 3);
  assert.equal(rewardDiscount(before), 1000);
  assert.equal(orderTotal(before), 2300);
  const result = completeOrder(before, { id: 'redeem', createdAt: '2026-11-02T00:00:00Z' });
  assert.equal(result.order.total, 2300);
  assert.equal(result.order.pointsSpent, 100);
  assert.equal(result.order.pointsEarned, 10);
  assert.equal(result.order.reward.itemId, 'brownie-skillet');
  assert.equal(pointsBalance(result.state), 10);
  assert.equal(result.state.rewardLineId, null);
  const roundTrip = normalizeState(JSON.parse(JSON.stringify(result.state)));
  assert.equal(roundTrip.orders[0].total, 2300);
  assert.equal(roundTrip.orders[0].reward.discount, 1000);
  assert.equal(pointsBalance(roundTrip), 10);
  assert.deepEqual(completeOrder(roundTrip, { id: 'redeem' }).state, roundTrip);
});

test('preview, cancellation, removal, and reloading cannot spend reward points', () => {
  const before = dessert(visits(10));
  const storage = store();
  saveState(storage, before);
  assert.equal(pointsBalance(loadState(storage)), 100);
  assert.equal(loadState(storage).rewardLineId, before.rewardLineId);
  assert.equal(pointsBalance({ ...before, rewardLineId: null }), 100);
  const removed = normalizeState({ ...before, cart: setLineQuantity(before.cart, before.rewardLineId, 0) });
  assert.equal(removed.rewardLineId, null);
  assert.equal(rewardDiscount(removed), 0);
  assert.equal(pointsBalance(removed), 100);
  assert.equal(completeOrder(removed).order, null);
});

test('insufficient and malformed balances cannot redeem or use points from the current order', () => {
  const before = dessert(visits(9));
  // Balances are derived from orders; no freely editable counter is trusted.
  assert.equal(pointsBalance({ ...before, points: 99, balance: 10000 }), 90);
  assert.equal(rewardDiscount(before), 0);
  assert.equal(completeOrder(before).error, 'reward-unavailable');
  assert.equal(completeOrder(before).state.cart.length, 1);
  const earned = completeOrder({ ...before, rewardLineId: null }).state;
  assert.equal(pointsBalance(earned), 100);
  assert.equal(rewardDiscount(dessert(earned)), 1000);
  const malformed = { ...earned, orders: earned.orders.map(order => ({ ...order, pointsEarned: 999999, pointsSpent: -100 })) };
  assert.equal(pointsBalance(malformed), 100);
});

test('reward eligibility cannot discount an entrée and coexists with special and combo pricing', () => {
  const state = visits(10);
  const meal = createLine('midnight-stack', {}, { sideId: 'golden-fries', drinkId: 'cherry-cloud-shake' }, true);
  state.cart = [meal]; state.rewardLineId = meal.id;
  assert.equal(rewardDiscount(state), 0);
  const candidate = dessert(state);
  candidate.cart.push(meal);
  assert.equal(orderTotal(candidate), 2300); // dessert extras 100 + special meal 2200
  const completed = completeOrder(candidate).state;
  assert.equal(completed.orders[0].total, 2300);
  assert.equal(savingsTotal(completed), 5000 + 2300);
});

test('durable completion is atomic: failed save leaves cart, ledger, and stored history unchanged', () => {
  const storage = store();
  const initial = dessert(visits(10));
  saveState(storage, initial);
  const snapshot = storage.getItem(STORAGE_KEY);
  const denied = { ...storage, setItem() { throw new Error('quota'); } };
  assert.throws(() => saveCompletedOrder(denied, initial, { id: 'attempt' }), /could not be saved/);
  assert.equal(storage.getItem(STORAGE_KEY), snapshot);
  assert.equal(pointsBalance(initial), 100);
  assert.equal(initial.cart.length, 1);
  const success = saveCompletedOrder(storage, initial, { id: 'attempt' });
  assert.equal(pointsBalance(loadState(storage)), 10);
  assert.equal(loadState(storage).cart.length, 0);
  assert.deepEqual(saveCompletedOrder(storage, loadState(storage), { id: 'attempt' }).order, success.order);
});

test('a second checkout using the latest shared state cannot spend the same reward again', () => {
  const storage = store();
  const first = dessert(visits(10));
  saveCompletedOrder(storage, first, { id: 'tab-a' });
  const latest = dessert(loadState(storage));
  assert.equal(saveCompletedOrder(storage, latest, { id: 'tab-b' }).error, 'reward-unavailable');
  assert.equal(pointsBalance(loadState(storage)), 10);
  assert.equal(loadState(storage).orders.length, 11);
});

test('invalid historical redemption snapshots and duplicate order IDs do not corrupt balance', () => {
  const source = completeOrder(dessert(visits(10)), { id: 'spent' }).state;
  for (const reward of [ { lineId: 'missing', discount: 1000, basePrice: 1000 }, { ...source.orders[0].reward, discount: -1 }, { ...source.orders[0].reward, discount: 2000, basePrice: 2000 } ]) {
    const bad = { ...source, orders: [{ ...source.orders[0], reward }, ...source.orders.slice(1)] };
    const restored = normalizeState(bad);
    assert.equal(restored.orders[0].reward, null);
    assert.equal(pointsBalance(restored), 110);
    assert.equal(restored.orders[0].total, 1100);
  }
  assert.equal(pointsBalance({ ...source, orders: [...source.orders, source.orders[0]] }), 10);
});

test('historic reward amount survives future catalog price changes through its snapshot', () => {
  const state = completeOrder(dessert(visits(10)), { id: 'snapshot' }).state;
  const historical = state.orders[0];
  // Simulate a valid earlier menu: base price $9, with one $1 extra.
  historical.lines[0].unitPrice = 1000;
  historical.reward.basePrice = 900;
  historical.reward.discount = 900;
  assert.equal(ITEM_BY_ID['brownie-skillet'].price, 1000);
  const restored = normalizeState(state);
  assert.equal(restored.orders[0].total, 100);
  assert.equal(restored.orders[0].reward.discount, 900);
});

test('99-point boundary rejects redemption and historical earning snapshots stay stable', () => {
  const state = dessert(visits(10));
  state.orders[0].pointsEarned = 9;
  assert.equal(pointsBalance(state), 99);
  assert.equal(rewardDiscount(state), 0);
  assert.equal(completeOrder(state).error, 'reward-unavailable');
  assert.equal(normalizeState(state).orders[0].pointsEarned, 9);
  state.orders[0].pointsEarned = 10;
  assert.equal(rewardDiscount(state), 1000);
  const redeemed = completeOrder(state, { id: 'cost-snapshot' }).state;
  redeemed.orders[0].pointsSpent = 90; // valid saved cost from a different rule version
  assert.equal(normalizeState(redeemed).orders[0].pointsSpent, 90);
  assert.equal(pointsBalance(redeemed), 20);
  const mismatch = structuredClone(redeemed);
  mismatch.orders[0].reward.itemId = 'apple-pie';
  assert.equal(normalizeState(mismatch).orders[0].reward, null);
});
