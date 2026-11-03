import test from "node:test";
import assert from "node:assert/strict";
import { ITEMS, defaultOptions } from "../catalog.js";
import { foodRecipe, foodPlacements, validateFoodManifest } from "../food-model.js";
import { loadFoodLibrary } from "../scripts/model-library.js";

function allOptions(item) {
  return item.options.reduce((combinations, group) => {
    const choices = group.type === "multiple"
      ? Array.from({ length: 2 ** group.choices.length }, (_, mask) => group.choices.filter((_, index) => mask & (1 << index)).map(choice => choice.id))
      : group.choices.map(choice => choice.id);
    return combinations.flatMap(options => choices.map(choice => ({ ...options, [group.id]: choice })));
  }, [{}]);
}

test("all menu configurations use complete local assets and distinct visible recipes", () => {
  const manifest = validateFoodManifest(loadFoodLibrary());
  let configurations = 0;
  for (const item of ITEMS) {
    const signatures = new Set();
    const options = allOptions(item);
    for (const value of options) {
      const recipe = foodPlacements(foodRecipe(item, value), manifest);
      assert.ok(recipe.length > 0, item.id);
      assert.equal(new Set(recipe.map(layer => layer.id)).size, recipe.length, `${item.id}: duplicate ingredient IDs`);
      for (const layer of recipe) {
        assert.ok(manifest.ingredients[layer.asset], `${item.id}: missing ${layer.asset}`);
        for (const field of ["position", "rotation", "scale"]) {
          assert.equal(layer[field].length, 3, `${item.id}: invalid ${field}`);
          assert.ok(layer[field].every(Number.isFinite), `${item.id}: nonfinite ${field}`);
        }
        assert.ok(layer.scale.every(value => value > 0 && value < 10), `${item.id}: invalid scale`);
        assert.ok(layer.position.every(value => Math.abs(value) < 10), `${item.id}: displaced ingredient`);
      }
      // Compare actual assets/transforms, not labels; changing a checkbox must
      // change the visible dish even when its price stays the same.
      signatures.add(JSON.stringify(recipe.map(({ asset, position, rotation, scale }) => ({ asset, position, rotation, scale }))));
    }
    assert.equal(signatures.size, options.length, `${item.id}: some choices have no visual effect`);
    configurations += options.length;
  }
  assert.equal(configurations, 2216);
});

test("burger siblings honor their own defaults and keep independent toppings", () => {
  for (const item of ITEMS.filter(item => item.model === "burger")) {
    const recipe = foodRecipe(item);
    const selected = defaultOptions(item.id);
    for (const topping of ["lettuce", "tomato", "pickle", "onion", "bacon", "extra-patty"]) assert.equal(recipe.some(layer => layer.id === topping), selected.toppings.includes(topping), `${item.id} ${topping}`);
    assert.equal(foodRecipe(item, { ...selected, toppings: [], cheese: "none", sauce: "none" }).length, item.id === 'maple-bacon' ? 4 : 3);
  }
});

test("food manifests reject remote resources and invalid bounds", () => {
  for (const bad of [
    { url: "https://elsewhere.test/food.glb", width: 2, height: 1 },
    { url: "./../food.glb", width: 2, height: 1 },
    { url: "./food.glb", width: 0, height: 1 },
    { url: "./food.glb", width: 2, height: NaN },
  ]) assert.throws(() => validateFoodManifest({ version: 1, ingredients: { food: bad } }));
  assert.throws(() => foodRecipe("missing-dish"));
});

export { allOptions };
