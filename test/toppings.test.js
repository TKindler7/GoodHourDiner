import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, defaultOptions, itemPrice } from '../catalog.js';
import { foodRecipe, foodPlacements } from '../food-model.js';
import { loadFoodLibrary } from '../scripts/model-library.js';

const library = loadFoodLibrary();
const multipleParts = {
  lettuce: /^lettuce$/, tomato: /^tomato$/, pickle: /^pickle$/, onion: /^(onion|caramelized-onion)$/,
  bacon: /^bacon$/, 'extra-patty': /^extra-patty$/, mushroom: /^mushrooms$/, avocado: /^avocado$/,
  pepper: /^peppers$/, zucchini: /^zucchini$/, butter: /^butter$/, syrup: /^syrup(?:-\d+)?$/,
  blueberry: /^(blueberries|berry-filling-\d+|fresh-berries-\d+)$/,
  chocolate: /^(chocolate|chocolate-chips|fudge-\d+)$/,
  'whipped-cream': /^whipped-cream(?:-\d+)?$/, toast: /^(toast|toast-butter)$/, potato: /^potatoes$/,
  cinnamon: /^cinnamon-\d+$/, cheese: /^cheese$/, chili: /^chili$/, crumbs: /^crumbs$/,
  cherry: /^(cherry|cherry-compote)$/, vanilla: /^ice-cream$/, nuts: /^nuts$/,
};

function singleCombinations(item) {
  return item.options.filter(g => g.type === 'single').reduce((all, group) =>
    all.flatMap(previous => group.choices.map(choice => ({ ...previous, [group.id]: choice.id }))), [{}]);
}

test('every optional topping appears and completely disappears for every serving choice', () => {
  let checked = 0;
  for (const item of ITEMS) for (const singles of singleCombinations(item)) {
    for (const group of item.options.filter(g => g.type === 'multiple')) for (const choice of group.choices) {
      const pattern = multipleParts[choice.id];
      assert.ok(pattern, `${item.id}: no semantic assertion for ${choice.id}`);
      const without = { ...defaultOptions(item.id), ...singles, [group.id]: group.choices.filter(c => c.id !== choice.id).map(c => c.id) };
      const withChoice = { ...without, [group.id]: [...without[group.id], choice.id] };
      assert.equal(foodRecipe(item, without).filter(p => pattern.test(p.id)).length, 0, `${item.id}: removed ${choice.id} still present`);
      assert.ok(foodRecipe(item, withChoice).some(p => pattern.test(p.id)), `${item.id}: selected ${choice.id} missing`);
      assert.equal(itemPrice(item.id, withChoice) - itemPrice(item.id, without), choice.price, `${item.id}: price not once per selected topping`);
      checked++;
    }
  }
  assert.ok(checked > 0);
});

test('French-toast garnish belongs to each slice for both portions, independently of other toppings', () => {
  for (const portion of ['two', 'three']) for (const syrup of [false, true]) {
    const options = { portion, toppings: ['whipped-cream', 'blueberry', ...(syrup ? ['syrup'] : [])] };
    const recipe = foodRecipe('cinnamon-french-toast', options);
    const count = portion === 'three' ? 3 : 2;
    assert.equal(recipe.filter(p => p.id.startsWith('whipped-cream-')).length, count);
    assert.equal(recipe.filter(p => p.id.startsWith('fresh-berries-')).length, count);
    for (let i = 0; i < count; i++) {
      const toast = recipe.find(p => p.id === `french-toast-${i}`);
      const top = toast.position[1] + library.ingredients[toast.asset].height * toast.scale;
      for (const key of ['whipped-cream', 'fresh-berries']) {
        const garnish = recipe.find(p => p.id === `${key}-${i}`);
        assert.ok(Math.abs(garnish.position[1] - top) < .01, `${key} must sit on slice ${i}`);
        assert.ok(Math.hypot(garnish.position[0] - toast.position[0], garnish.position[2] - toast.position[2]) < toast.scale * .6);
      }
    }
    assert.equal(itemPrice('cinnamon-french-toast', options) - itemPrice('cinnamon-french-toast', { portion, toppings: syrup ? ['syrup'] : [] }), 250);
  }
});

test('serving, protein, bread, cheese, sauce, scoop and ice choices select the intended geometry', () => {
  for (const item of ITEMS) for (const options of singleCombinations(item)) {
    const recipe = foodPlacements(foodRecipe(item, { ...defaultOptions(item.id), ...options }), library);
    const get = id => recipe.find(p => p.id === id);
    if (options.cheese) assert.equal(get('cheese')?.asset ?? null, options.cheese === 'none' ? null : options.cheese);
    if (options.sauce) assert.equal(get('sauce')?.asset ?? null, options.sauce === 'none' ? null : `sauce-${options.sauce}`);
    if (options.bread) assert.equal(get('bread-top').asset, `savory-${options.bread}`);
    if (options.stack) assert.equal(recipe.filter(p => /^pancake-/.test(p.id)).length, options.stack === 'tall' ? 5 : 3);
    if (options.portion) assert.equal(recipe.filter(p => /^french-toast-/.test(p.id)).length, options.portion === 'three' ? 3 : 2);
    if (options.eggs) assert.equal(recipe.filter(p => /^(sunny-egg-\d+|scrambled-eggs)$/.test(p.id)).length, options.eggs === 'sunny' ? 2 : 1);
    if (options.protein) assert.ok(get({ bacon: 'bacon', sausage: 'sausage', veggie: 'roasted-mushrooms' }[options.protein]));
    if (options.dip) {
      assert.equal(get('dip')?.asset ?? null, options.dip === 'none' ? null : `sides-${options.dip}`);
      assert.equal(Boolean(get('ramekin')), options.dip !== 'none');
    }
    if (options.ice) assert.equal(recipe.filter(p => /^ice-\d+$/.test(p.id)).length, { none: 0, light: 3, regular: 9 }[options.ice]);
    if (options.scoop) assert.equal(get('ice-cream').asset, `sweet-icecream-${options.scoop}`);
  }
});

test('support-dependent drizzle follows cream or ice cream and is distinct from chocolate chips', () => {
  for (const id of ['cherry-cloud-shake', 'vanilla-malt', 'chocolate-shake']) for (const size of ['regular', 'large']) {
    const bare = foodRecipe(id, { size, toppings: ['chocolate', 'cherry'] });
    const cream = foodRecipe(id, { size, toppings: ['chocolate', 'cherry', 'whipped-cream'] });
    assert.equal(bare.find(p => p.id === 'chocolate').asset, 'sweet-drizzle-flat');
    assert.equal(cream.find(p => p.id === 'chocolate').asset, 'sweet-drizzle-cream');
    assert.ok(cream.find(p => p.id === 'cherry').position[1] > bare.find(p => p.id === 'cherry').position[1]);
  }
  for (const id of ['apple-pie', 'brownie-skillet']) {
    assert.equal(foodRecipe(id, { toppings: ['chocolate'] }).find(p => p.id === 'chocolate').asset, 'sweet-drizzle-flat');
    assert.equal(foodRecipe(id, { toppings: ['chocolate', 'vanilla'] }).find(p => p.id === 'chocolate').asset, 'sweet-drizzle-scoop');
  }
  assert.equal(foodRecipe('hot-fudge-sundae').filter(p => /^fudge-/.test(p.id)).length, 3);
  for (const id of ['sunrise-flapjacks', 'blueberry-griddle']) {
    const chips = foodRecipe(id, { toppings: ['chocolate'] }).find(p => p.id === 'chocolate-chips');
    assert.equal(chips.asset, 'savory-chocolate-chips');
    assert.equal(chips.motion, 'scatter');
  }
});

test('named maple finish is present only on the maple burger and does not become an optional sauce', () => {
  const recipe = foodRecipe('maple-bacon', { toppings: [], sauce: 'none', cheese: 'none' });
  assert.equal(recipe.find(p => p.id === 'maple-glaze').asset, 'savory-syrup');
  assert.ok(!recipe.some(p => p.id === 'sauce'));
  for (const id of ['midnight-stack', 'classic-chrome']) assert.ok(!foodRecipe(id).some(p => p.id === 'maple-glaze'));
});
