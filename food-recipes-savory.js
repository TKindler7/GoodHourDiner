// Explicit placements for original, separately authored savory ingredients.
// Heights are measured from exported GLBs after manifest-width normalization.
const H = Object.freeze({
  bread: .2605828241, frenchToast: .3722531648, pancake: .1906178994,
  chicken: .5101942513, onion: .1417978611, mushroom: .2507115033,
  pepper: .1634452148, zucchini: .2444780473, avocado: .2717214174,
  butter: .11, syrup: .0077976701, patty: .274304,
});
const handled = new Set(['route-66-melt', 'crispy-chicken-club', 'garden-state-melt', 'sunrise-flapjacks', 'blueberry-griddle', 'all-day-breakfast', 'cinnamon-french-toast']);
const scatterAssets = new Set(['savory-cinnamon', 'savory-blueberries', 'savory-chocolate-chips']);
const part = (id, asset, x, y, z, scale = 1, yaw = 0) => ({ id, asset, position: [x, y, z], scale, rotation: [0, yaw, 0], ...(asset === 'savory-syrup' ? { motion: 'pour' } : scatterAssets.has(asset) ? { motion: 'scatter' } : {}) });
const has = (options, key) => (options.toppings || options.vegetables || []).includes(key);

export function savoryRecipe(item, options) {
  const id = typeof item === 'string' ? item : item?.id;
  if (!handled.has(id)) return null;
  if (id === 'all-day-breakfast') return breakfast(options);
  if (id === 'cinnamon-french-toast') return frenchToast(options);
  if (id === 'sunrise-flapjacks' || id === 'blueberry-griddle') return pancakes(options, id === 'blueberry-griddle');
  return sandwich(id, options);
}

function sandwich(id, options) {
  const layers = [part('plate', 'savory-plate', 0, 0, 0, .80)];
  const bread = id === 'route-66-melt' && options.bread === 'rye' ? 'savory-rye' : 'savory-sourdough';
  const base = .026;
  layers.push(part('bread-bottom', bread, 0, base, 0));
  let y = base + H.bread - .008;
  const add = (key, asset, height, scale = 1, yaw = 0, x = 0, z = 0, compression = 1) => {
    layers.push(part(key, asset, x, y, z, scale, yaw));
    y += height * (Array.isArray(scale) ? scale[1] : scale) * compression;
  };
  const cheese = () => {
    if (!options.cheese || options.cheese === 'none') return;
    // Cheese's hanging rim is lower than its supported central sheet.
    const s = .94;
    layers.push(part('cheese', options.cheese, 0, y - .1634601496 * s, 0, s, .03));
    y += (.1962877106 - .1634601496) * s;
  };
  if (id === 'route-66-melt') {
    add('patty', 'patty', H.patty, .91, -.12);
    cheese();
    if (has(options, 'onion')) add('caramelized-onion', 'savory-caramelized-onion', H.onion, .94, .2, 0, 0, .85);
    if (has(options, 'mushroom')) add('mushrooms', 'savory-mushroom', H.mushroom, .91, -.3, 0, 0, .8);
    if (has(options, 'bacon')) add('bacon', 'bacon', .14, .9, .2);
  } else if (id === 'crispy-chicken-club') {
    if (options.sauce !== 'none') add('sauce', `sauce-${options.sauce}`, .026, .94);
    if (has(options, 'lettuce')) add('lettuce', 'lettuce', .16, .90, -.1);
    add('chicken', 'savory-crispy-chicken', H.chicken, .97, -.07, 0, 0, .91);
    if (has(options, 'tomato')) add('tomato', 'tomato', .12, .89, .2);
    if (has(options, 'bacon')) add('bacon', 'bacon', .14, .88, -.25);
    if (has(options, 'avocado')) add('avocado', 'savory-avocado', H.avocado, 1.05, .35, 0, 0, .78);
  } else {
    // Each vegetable is independently removable, including the all-empty case.
    if (has(options, 'pepper')) add('peppers', 'savory-pepper', H.pepper, .94, -.2, 0, 0, .84);
    if (has(options, 'zucchini')) add('zucchini', 'savory-zucchini', H.zucchini, .94, .2, 0, 0, .78);
    if (has(options, 'mushroom')) add('mushrooms', 'savory-mushroom', H.mushroom, .94, -.35, 0, 0, .8);
    if (has(options, 'onion')) add('caramelized-onion', 'savory-caramelized-onion', H.onion, .94, .22, 0, 0, .84);
    cheese();
  }
  layers.push(part('bread-top', bread, .035, y - .012, -.025, 1, -.035));
  return layers;
}

function pancakes(options, blueberryRecipe) {
  const layers = [part('plate', 'savory-plate', 0, 0, 0, .80)];
  const count = options.stack === 'tall' ? 5 : 3;
  const base = .026;
  for (let i = 0; i < count; i++) {
    layers.push(part(`pancake-${i}`, ['savory-pancake', 'savory-pancake-2', 'savory-pancake-3'][i % 3], .018 * Math.sin(i * 3), base + i * (H.pancake - .008), .016 * Math.cos(i * 2), 1, i * .72));
    // Visible berry pieces near the edge distinguish filled griddle cakes.
    if (blueberryRecipe && has(options, 'blueberry') && i < count - 1) {
      layers.push(part(`berry-filling-${i}`, 'savory-blueberries', i % 2 ? .72 : -.64, base + (i + 1) * (H.pancake - .008) - .065, .32, [.32, .28, .32], i));
    }
  }
  const top = base + count * H.pancake - (count - 1) * .008;
  if (has(options, 'syrup')) layers.push(part('syrup', 'savory-syrup', -.03, top - .003, -.02, 1.03, .4));
  const surface = top + (has(options, 'syrup') ? H.syrup * 1.03 - .005 : 0);
  if (has(options, 'butter')) layers.push(part('butter', 'savory-butter', -.15, surface, .07, 1, .18));
  if (has(options, 'blueberry')) layers.push(part('blueberries', 'savory-blueberries', .40, surface, .24, .72, .4));
  if (has(options, 'chocolate')) layers.push(part('chocolate-chips', 'savory-chocolate-chips', 0, surface, -.05, 1.20, .5));
  if (has(options, 'whipped-cream')) layers.push(part('whipped-cream', 'sweet-whipped-cream', -.52, surface, -.38, .80));
  return layers;
}

function breakfast(options) {
  const layers = [part('plate', 'savory-plate', 0, 0, 0)];
  const base = .033;
  if (options.eggs === 'scrambled') {
    layers.push(part('scrambled-eggs', 'savory-eggs-scrambled', -.30, base, -.32, 1.10, -.2));
  } else {
    layers.push(part('sunny-egg-1', 'savory-egg-sunny', -.52, base, -.43, .86, -.5));
    layers.push(part('sunny-egg-2', 'savory-egg-sunny-2', .28, base + .015, -.36, .82, 1.6));
  }
  if (options.protein === 'sausage') layers.push(part('sausage', 'savory-sausage', .98, base, .69, .83, -.4));
  else if (options.protein === 'veggie') layers.push(part('roasted-mushrooms', 'savory-mushroom', 1.02, base, .62, .65, -.4));
  else layers.push(part('bacon', 'bacon', .98, base, .65, .65, .40));
  if (has(options, 'potato')) layers.push(part('potatoes', 'savory-potato', -.93, base, .64, .88, -.3));
  if (has(options, 'toast')) {
    const s = .43;
    layers.push(part('toast', 'savory-sourdough', 1.05, base + .012, -.87, s, -.55));
    layers.push(part('toast-butter', 'savory-butter', 1.05, base + .012 + H.bread * s, -.87, .62, -.4));
  }
  if (has(options, 'avocado')) layers.push(part('avocado', 'savory-avocado', -.94, base, -.99, .54, -.8));
  return layers;
}

function frenchToast(options) {
  const layers = [part('plate', 'savory-plate', 0, 0, 0)];
  const base = .033;
  const placements = options.portion === 'three'
    ? [[-.72, -.65, -.12, .58], [.72, -.65, .12, .58], [0, .70, .05, .58]]
    : [[-.79, -.06, -.08, .64], [.79, .06, .08, .64]];
  placements.forEach(([x,z,yaw,s], i) => {
    layers.push(part(`french-toast-${i}`, 'savory-french-toast', x, base, z, s, yaw));
    const top = base + H.frenchToast * s;
    if (has(options, 'cinnamon')) layers.push(part(`cinnamon-${i}`, 'savory-cinnamon', x, top + .001, z, s * 1.05, yaw));
    if (has(options, 'syrup')) layers.push(part(`syrup-${i}`, 'savory-syrup', x, top + .003, z, s * .9, yaw + .1));
    // Garnish each serving, using slice-local offsets so rotation and portion
    // changes cannot leave a garnish behind or attach it only to the last slice.
    const garnish = (key, asset, dx, dz, scale) => {
      const gx = x + (dx * Math.cos(yaw) + dz * Math.sin(yaw)) * s;
      const gz = z + (-dx * Math.sin(yaw) + dz * Math.cos(yaw)) * s;
      layers.push(part(`${key}-${i}`, asset, gx, top + .003, gz, scale * s, yaw + i * .19));
    };
    if (has(options, 'blueberry')) garnish('fresh-berries', 'savory-blueberries', -.38, .18, .60);
    if (has(options, 'whipped-cream')) garnish('whipped-cream', 'sweet-whipped-cream', .37, -.16, .78);
  });
  return layers;
}
