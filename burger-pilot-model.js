import { normalizeOptions } from "./catalog.js";

export const PILOT_ITEM_ID = "midnight-stack";
export const PILOT_INGREDIENTS = Object.freeze([
  "bun-bottom", "patty", "bun-top", "cheddar", "swiss", "lettuce", "tomato",
  "pickle", "onion", "bacon", "sauce-house", "sauce-smoky",
]);

// Asset keys stay independent from order choices: the second patty reuses one asset.
export function burgerPilotLayers(value, itemId = PILOT_ITEM_ID) {
  const options = normalizeOptions(itemId, value);
  const layers = [{ id: "bun-bottom", asset: "bun-bottom" }];
  if (options.sauce !== "none") layers.push({ id: "sauce", asset: `sauce-${options.sauce}` });
  for (const key of ["lettuce", "tomato"]) {
    if (options.toppings.includes(key)) layers.push({ id: key, asset: key });
  }
  layers.push({ id: "patty", asset: "patty" });
  if (options.toppings.includes("extra-patty")) layers.push({ id: "extra-patty", asset: "patty" });
  // The named maple burger has a fixed thin glaze on its griddled patty.
  // This is part of the recipe, independent from the optional house/smoky sauce.
  if (itemId === 'maple-bacon') layers.push({ id: 'maple-glaze', asset: 'savory-syrup', motion: 'pour', pourStage: 'inline' });
  if (options.cheese !== "none") layers.push({ id: "cheese", asset: options.cheese });
  for (const key of ["pickle", "onion", "bacon"]) {
    if (options.toppings.includes(key)) layers.push({ id: key, asset: key });
  }
  layers.push({ id: "bun-top", asset: "bun-top" });
  return layers;
}

// Contact heights are measured upward from the normalized model's lowest point.
// A draped cheese edge can extend below its support without lifting the whole stack.
export function burgerPilotPlacements(layers) {
  let supportY = 0;
  return layers.map(({ height, config = {} }) => {
    const bottom = config.contactBottom ?? 0;
    const top = config.contactTop ?? height;
    const offset = config.offset ?? [0, 0, 0];
    const position = [offset[0], supportY - bottom + offset[1], offset[2]];
    supportY += Math.max(0, (config.stackHeight ?? top - bottom) - (config.overlap ?? 0));
    return position;
  });
}

export function validateBurgerPilotManifest(manifest) {
  if (manifest?.version !== 1 || manifest.itemId !== PILOT_ITEM_ID || !manifest.ingredients || typeof manifest.ingredients !== "object" || Array.isArray(manifest.ingredients)) {
    throw new Error("This preview needs a compatible burger ingredient manifest.");
  }
  for (const [key, asset] of Object.entries(manifest.ingredients)) {
    if (!PILOT_INGREDIENTS.includes(key)) throw new Error(`Unknown ingredient: ${key}`);
    if (!asset || typeof asset.url !== "string" || !/^\.\/[a-zA-Z0-9_./-]+\.glb$/.test(asset.url) || asset.url.includes("..")) {
      throw new Error(`Missing local model for ${key}.`);
    }
    if (!Number.isFinite(asset.width) || asset.width <= 0 || asset.width > 10) throw new Error(`Invalid size for ${key}.`);
    for (const vector of ["rotation", "offset"]) {
      if (asset[vector] !== undefined && (!Array.isArray(asset[vector]) || asset[vector].length !== 3 || !asset[vector].every(Number.isFinite))) {
        throw new Error(`Invalid ${vector} for ${key}.`);
      }
    }
    for (const scalar of ["stackHeight", "overlap", "contactBottom", "contactTop"]) {
      if (asset[scalar] !== undefined && (!Number.isFinite(asset[scalar]) || asset[scalar] < 0 || asset[scalar] > 10)) {
        throw new Error(`Invalid ${scalar} for ${key}.`);
      }
    }
    if (asset.contactTop !== undefined && asset.contactTop < (asset.contactBottom ?? 0)) throw new Error(`Invalid contact surfaces for ${key}.`);
  }
  return manifest;
}
