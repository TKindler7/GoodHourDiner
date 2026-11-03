import { ITEM_BY_ID, normalizeOptions } from "./catalog.js";
import { burgerPilotLayers, burgerPilotPlacements } from "./burger-pilot-model.js";
import { savoryRecipe } from "./food-recipes-savory.js";
import { sidesRecipe } from "./food-recipes-sides.js";
import { sweetRecipe } from "./food-recipes-sweet.js";

// All ordering state stays in catalog/cart. This module only describes the visible dish.
export function foodRecipe(itemOrId, value) {
  const item = ITEM_BY_ID[typeof itemOrId === "string" ? itemOrId : itemOrId?.id];
  if (!item) throw new Error("This dish is not on the menu.");
  const options = normalizeOptions(item.id, value);
  if (item.model === "burger") return burgerPilotLayers(options, item.id);
  const recipe = savoryRecipe(item, options) ?? sidesRecipe(item, options) ?? sweetRecipe(item, options);
  if (!Array.isArray(recipe) || !recipe.length) throw new Error(`The ${item.name} preview is unavailable.`);
  return recipe;
}

export function foodPlacements(recipe, manifest) {
  const configs = recipe.map(layer => {
    const config = manifest.ingredients[layer.asset];
    if (!config) throw new Error(`Missing model for ${layer.asset}.`);
    return { config, height: config.height };
  });
  const stack = burgerPilotPlacements(configs);
  return recipe.map((layer, index) => ({
    ...layer,
    position: layer.position ?? stack[index],
    rotation: layer.rotation ?? [0, 0, 0],
    scale: Array.isArray(layer.scale) ? layer.scale : [layer.scale ?? 1, layer.scale ?? 1, layer.scale ?? 1],
  }));
}

export function validateFoodManifest(manifest) {
  if (manifest?.version !== 1 || !manifest.ingredients || typeof manifest.ingredients !== "object" || Array.isArray(manifest.ingredients)) {
    throw new Error("The food library is unavailable.");
  }
  for (const [key, asset] of Object.entries(manifest.ingredients)) {
    if (!asset || typeof asset.url !== "string" || !/^\.\/[a-zA-Z0-9_./-]+\.glb$/.test(asset.url) || asset.url.includes("..")) throw new Error(`Invalid model path: ${key}.`);
    for (const field of ["width", "height"]) if (!Number.isFinite(asset[field]) || asset[field] <= 0 || asset[field] > 20) throw new Error(`Invalid ${field}: ${key}.`);
    for (const field of ["rotation", "offset"]) if (asset[field] !== undefined && (!Array.isArray(asset[field]) || asset[field].length !== 3 || !asset[field].every(Number.isFinite))) throw new Error(`Invalid ${field}: ${key}.`);
    for (const field of ["contactBottom", "contactTop", "stackHeight", "overlap"]) if (asset[field] !== undefined && (!Number.isFinite(asset[field]) || asset[field] < 0 || asset[field] > 20)) throw new Error(`Invalid ${field}: ${key}.`);
  }
  return manifest;
}
