// Original authored drink and dessert geometry. All positions use Three.js Y-up.
const pourAssets = new Set(['drizzle-scoop', 'drizzle-flat', 'drizzle-cream']);
const part = (id, asset, position = [0, 0, 0], scale = 1, rotation = [0, 0, 0]) => ({ id, asset: `sweet-${asset}`, position, scale, rotation, ...(pourAssets.has(asset) ? { motion: 'pour' } : asset === 'nuts' ? { motion: 'scatter' } : {}) });
const selected = (options, key) => (options.toppings || []).includes(key);
// Large servings use a taller vessel, so the change stays visible after camera fitting.
// Cream, cherries, scoops and ice keep their natural proportions.
const resize = (parts, factor, toppingLevel = 2.47) => {
  if (factor === 1) return parts;
  const wide = 1.08, tall = 1.22;
  return parts.map(entry => {
    const stretch = ["glass", "shake", "soda", "coffee", "straw"].includes(entry.id);
    const scale = Array.isArray(entry.scale) ? entry.scale : [entry.scale, entry.scale, entry.scale];
    const [x, y, z] = entry.position;
    const newY = y >= toppingLevel ? toppingLevel * tall + (y - toppingLevel) * wide : y * tall;
    return { ...entry, position: [x * wide, newY, z * wide], scale: [scale[0] * wide, scale[1] * (stretch ? tall : wide), scale[2] * wide] };
  });
};
const scoop = (id, position, flavor = "vanilla", scale = 1) => part(id, `icecream-${flavor}`, position, scale);
const whip = (id, position, scale = 1) => part(id, "whipped-cream", position, scale);
const cherry = (position, scale = 1) => part("cherry", "cherry", position, scale);
// The pooled sauce is fitted to the scoop in authored space; retain its measured contact offset.
const scoopFudge = (id, position, scale = 1) => part(id, "drizzle-scoop", [position[0] + .0143 * scale, position[1] + 0.50231 * scale, position[2] + .0062 * scale], scale);

export function sweetRecipe(item, options) {
  const id = typeof item === "string" ? item : item?.id;
  if (["cherry-cloud-shake", "vanilla-malt", "chocolate-shake"].includes(id)) {
    const flavor = id === "cherry-cloud-shake" ? "cherry" : id === "vanilla-malt" ? "vanilla" : "chocolate";
    const parts = [part("glass", "glass"), part("shake", `shake-${flavor}`, [0, .067, 0]), part("straw", "straw", [.32, .15, -.29], 1, [0, 0, -.10])];
    const hasCream = selected(options, "whipped-cream");
    if (hasCream) parts.push(whip("whipped-cream", [0, 2.47, 0]));
    if (selected(options, "cherry")) parts.push(cherry([0, hasCream ? 3.07 : 2.43, .015]));
    if (selected(options, "chocolate")) parts.push(part("chocolate", hasCream ? "drizzle-cream" : "drizzle-flat", hasCream ? [.0357, 2.6879, .0132] : [0, 2.467, 0], hasCream ? 1 : 1.03));
    return resize(parts, options.size === "large" ? 1.16 : 1);
  }
  if (id === "strawberry-soda") {
    const parts = [part("glass", "glass"), part("soda", "soda", [0, .067, 0]), part("straw", "straw", [.32, .16, -.29], 1, [0, 0, -.1])];
    const icePositions = [[-.25,2.10,.02],[.11,2.19,.16],[.25,2.0,-.18],[-.12,1.77,-.20],[.14,1.65,.20],[-.29,1.42,.05],[.22,1.22,-.08],[0,1.05,.1],[0,2.36,-.15]];
    const count = options.ice === "none" ? 0 : options.ice === "light" ? 3 : icePositions.length;
    icePositions.slice(0, count).forEach((position, index) => parts.push(part(`ice-${index}`, "ice", position, .92, [.12*index,.43*index,.09*index])));
    return resize(parts, options.size === "large" ? 1.16 : 1);
  }
  if (id === "cold-brew-float") {
    const parts = [part("glass", "glass"), part("coffee", "coldbrew", [0,.067,0]), scoop("ice-cream", [0,2.13,0], options.scoop === "chocolate" ? "chocolate" : "vanilla", .95), part("straw", "straw", [.38,.16,-.24], 1, [0,0,-.08])];
    if (selected(options, "whipped-cream")) parts.push(whip("whipped-cream", [.02,2.81,.02], .72));
    return resize(parts, options.size === "large" ? 1.16 : 1, 2.13);
  }
  if (id === "apple-pie") {
    const parts = [part("plate", "plate"), part("pie", "apple-pie", [-.35,.09,-.12])];
    const iceCream = selected(options, "vanilla");
    if (iceCream) parts.push(scoop("ice-cream", [1.00,.105,.55], "vanilla", .90));
    if (selected(options, "whipped-cream")) parts.push(whip("whipped-cream", [-.42,.907,-.25], .65));
    if (selected(options, "chocolate")) parts.push(iceCream ? scoopFudge("chocolate", [1.00,.105,.55], .90) : part("chocolate", "drizzle-flat", [-.35,.918,-.12], 1.13));
    return parts;
  }
  if (id === "hot-fudge-sundae") {
    const positions = [[-.4,.66,.04],[.4,.68,.04],[0,1.22,-.10]];
    const parts = [part("dessert-glass", "sundae-bowl"), ...positions.map((position,index) => scoop(`ice-cream-${index}`,position))];
    if (selected(options, "chocolate")) positions.forEach((p,index) => parts.push(scoopFudge(`fudge-${index}`, p)));
    const hasCream = selected(options, "whipped-cream");
    if (hasCream) parts.push(whip("whipped-cream", [0,1.97,-.10], .77));
    if (selected(options, "cherry")) parts.push(cherry([0,hasCream ? 2.43 : 2.02,-.1]));
    if (selected(options, "nuts")) parts.push(part("nuts", "nuts", [0,1.7762,-.1], 1));
    return parts;
  }
  if (id === "cherry-cheesecake") {
    const parts = [part("plate", "plate"), part("cheesecake", "cheesecake", [0,.09,0])];
    if (selected(options, "cherry")) parts.push(part("cherry-compote", "cherry-compote", [0,.89,-.35]));
    if (selected(options, "whipped-cream")) parts.push(whip("whipped-cream", [.80,.083,.64], .75));
    return parts;
  }
  if (id === "brownie-skillet") {
    const parts = [part("skillet", "skillet"), part("brownie", "brownie", [0,.12,0])];
    const iceCream = selected(options, "vanilla");
    if (iceCream) parts.push(scoop("ice-cream", [.10,.59,.02]));
    if (selected(options, "chocolate")) parts.push(iceCream ? scoopFudge("chocolate", [.10,.59,.02]) : part("chocolate", "drizzle-flat", [0,.621,0],1.5));
    if (selected(options, "whipped-cream")) parts.push(whip("whipped-cream", iceCream ? [-.56,.595,-.44] : [0,.595,0], iceCream ? .57 : .80));
    return parts;
  }
  return null;
}
