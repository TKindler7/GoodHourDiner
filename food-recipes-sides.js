// Original modular sides. Coordinates restore authored surface contact after the
// viewer centers each GLB and aligns its bottom. Values come from authoring-report.json.
const authoredOffsets = {
  "plate": [
    0.0,
    0.018,
    -0.0
  ],
  "bowl": [
    0.0,
    0.03,
    -0.0
  ],
  "ramekin": [
    0.0,
    0.015,
    -0.0
  ],
  "fries": [
    -0.0593797,
    -0.041088,
    -0.0574092
  ],
  "fries-large": [
    -0.0489174,
    -0.041088,
    -0.0301402
  ],
  "chili": [
    -0.010161,
    0.1073111,
    0.009874
  ],
  "chili-large": [
    -0.0091676,
    0.17994,
    0.0111576
  ],
  "cheese": [
    -0.0256852,
    0.1224771,
    0.0149604
  ],
  "cheese-large": [
    -0.0298599,
    0.1767175,
    0.016204
  ],
  "cheese-chili": [
    -0.0256852,
    0.1504771,
    0.0149604
  ],
  "cheese-chili-large": [
    -0.0298599,
    0.2047175,
    0.016204
  ],
  "onion": [
    0.0510441,
    0.1970124,
    0.0030738
  ],
  "pickle-spear": [
    0.0031464,
    -0.1251181,
    -0.0
  ],
  "ranch": [
    0.0030571,
    -0.007,
    0.0034858
  ],
  "house": [
    0.0030571,
    -0.007,
    0.0034858
  ],
  "macaroni": [
    0.0077944,
    0.0207132,
    -0.02026
  ],
  "crumbs": [
    -0.0837665,
    0.0708441,
    0.0145664
  ],
  "bacon": [
    -0.0982238,
    0.0827059,
    -0.0191401
  ],
  "onion-large": [
    0.0577943,
    0.2775174,
    0.003456
  ],
  "onion-chili": [
    0.0510441,
    0.2340124,
    0.0030738
  ],
  "onion-chili-large": [
    0.0577943,
    0.3145174,
    0.003456
  ]
};
const pourAssets = new Set(['cheese', 'cheese-large', 'cheese-chili', 'cheese-chili-large']);
const part = (id, asset, position = [0,0,0], scale = 1, rotation = [0,0,0]) => ({id, asset: `sides-${asset}`, position, scale, rotation, ...(pourAssets.has(asset) ? { motion: 'pour' } : asset === 'crumbs' ? { motion: 'scatter' } : {})});
const placed = (id, asset, y = 0) => part(id, asset, authoredOffsets[asset].map((v,i) => v + (i === 1 ? y : 0)));
const has = (options, topping) => (options.toppings || []).includes(topping);
const resize = (parts, factor) => parts.map(p => ({...p, position:p.position.map(v => v*factor), scale:Array.isArray(p.scale) ? p.scale.map(v=>v*factor) : p.scale*factor}));

export function sidesRecipe(item, options = {}) {
  const id = typeof item === "string" ? item : item?.id;
  const large = options.size === "large";
  if (["golden-fries", "chili-cheese-fries"].includes(id)) {
    const suffix = large ? "-large" : "";
    const parts = [part("plate", "plate", [0,0,0], large ? 1.08 : 1), placed("fries", `fries${suffix}`, .06)];
    if (has(options,"chili")) parts.push(placed("chili",`chili${suffix}`,.06));
    if (has(options,"cheese")) parts.push(placed("cheese",`cheese${has(options,"chili") ? "-chili" : ""}${suffix}`,.06));
    if (has(options,"onion")) parts.push(placed("onion",`onion${has(options,"chili") ? "-chili" : ""}${suffix}`,.06 + (has(options,"cheese") ? .014 : 0)));
    return parts;
  }
  if (id === "pickle-spears") {
    const parts = [part("plate","plate",[0,0,0],large ? 1.10 : 1)];
    const locations = [[-.72,.045,-.08],[-.29,.045,-.28],[.14,.045,-.04],[.57,.045,-.22]];
    if (large) locations.push([-.52,.24,-.13],[.22,.24,-.23]);
    locations.forEach((position,i)=>parts.push(part(`spear-${i}`,["pickle-spear","pickle-spear-2","pickle-spear-3"][i%3],position,[1,1,[.97,1.04,.92,1.02,.95,1.05][i]],[0,[-.19,.12,-.07,.22,-.12,.17][i],0])));
    if (options.dip !== "none") {
      const x = large ? 1.02 : .94, z = .72;
      parts.push(part("ramekin","ramekin",[x,.05,z]));
      parts.push(part("dip",options.dip === "house" ? "house" : "ranch",[x,.298,z]));
    }
    return parts;
  }
  if (id === "mac-cheese") {
    const parts=[part("bowl","bowl"),placed("macaroni","macaroni",.34)];
    if (has(options,"crumbs")) parts.push(placed("crumbs","crumbs",.34));
    if (has(options,"bacon")) parts.push(placed("bacon","bacon",.34));
    return resize(parts,large ? 1.16 : 1);
  }
  return null;
}
