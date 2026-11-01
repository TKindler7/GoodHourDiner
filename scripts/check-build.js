import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS } from "../catalog.js";
import { validateBurgerPilotManifest } from "../burger-pilot-model.js";
import { foodRecipe, foodPlacements, validateFoodManifest } from "../food-model.js";
import { loadFoodLibrary } from "./model-library.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const references = [...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map((match) => match[1]).concat(ITEMS.map(item => item.image));
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const missing = references.filter((reference) => !existsSync(resolve(projectRoot, reference)));
if (missing.length) {
  console.error(`Missing site assets: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  const outputDir = resolve(projectRoot, "public");
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  for (const filename of ["index.html", "styles.css", "app.js", "cart.js", "catalog.js", "food-scene.js", "food-model.js", "food-recipes-savory.js", "food-recipes-sides.js", "food-recipes-sweet.js", "special.js", "page-motion.js", "browse-motion.js", "page-motion.css", "ui-motion.js", "ui-motion.css"]) {
    copyFileSync(resolve(projectRoot, filename), resolve(outputDir, filename));
  }
  // Preserve the original one-burger review page alongside the integrated menu.
  for (const filename of ["burger-pilot.html", "burger-pilot.css", "burger-pilot.js", "burger-pilot-model.js", "burger-pilot-scene.js"]) {
    copyFileSync(resolve(projectRoot, filename), resolve(outputDir, filename));
  }
  mkdirSync(resolve(outputDir, "assets"), { recursive: true });
  cpSync(resolve(projectRoot, "assets/food"), resolve(outputDir, "assets/food"), { recursive: true });
  const pilotRoot = resolve(projectRoot, "assets/models/burger-pilot");
  const pilotManifest = resolve(pilotRoot, "manifest.json");
  if (existsSync(pilotManifest)) {
    const manifest = validateBurgerPilotManifest(JSON.parse(readFileSync(pilotManifest, "utf8")));
    const pilotOutput = resolve(outputDir, "assets/models/burger-pilot");
    mkdirSync(pilotOutput, { recursive: true });
    copyFileSync(pilotManifest, resolve(pilotOutput, "manifest.json"));
    // Embedded GLBs are the only deployed model files. Original references,
    // Blender sources, temporary renders, and loose textures stay local.
    for (const { url } of Object.values(manifest.ingredients)) {
      const destination = resolve(pilotOutput, url);
      mkdirSync(resolve(destination, ".."), { recursive: true });
      copyFileSync(resolve(pilotRoot, url), destination);
    }
  }
  const library = validateFoodManifest(loadFoodLibrary());
  for (const item of ITEMS) foodPlacements(foodRecipe(item), library);
  const modelOutput = resolve(outputDir, "assets/models");
  writeFileSync(resolve(modelOutput, "menu.json"), JSON.stringify(library));
  for (const { url } of Object.values(library.ingredients)) {
    const destination = resolve(modelOutput, url);
    mkdirSync(resolve(destination, ".."), { recursive: true });
    copyFileSync(resolve(projectRoot, "assets/models", url), destination);
  }
  copyFileSync(resolve(projectRoot, "assets/favicon.svg"), resolve(outputDir, "assets/favicon.svg"));
  mkdirSync(resolve(outputDir, "vendor"), { recursive: true });
  for (const filename of ["three.module.js", "three.core.js"]) {
    copyFileSync(resolve(projectRoot, "node_modules/three/build", filename), resolve(outputDir, "vendor", filename));
  }
  for (const relative of ["loaders/GLTFLoader.js", "utils/BufferGeometryUtils.js", "utils/SkeletonUtils.js", "environments/RoomEnvironment.js"]) {
    const filename = relative.split("/").at(-1);
    const source = readFileSync(resolve(projectRoot, "node_modules/three/examples/jsm", relative), "utf8")
      .replaceAll("from 'three'", "from './three.module.js'")
      .replaceAll("from '../utils/BufferGeometryUtils.js'", "from './BufferGeometryUtils.js'")
      .replaceAll("from '../utils/SkeletonUtils.js'", "from './SkeletonUtils.js'");
    writeFileSync(resolve(outputDir, "vendor", filename), source);
  }
  copyFileSync(resolve(projectRoot, "node_modules/three/LICENSE"), resolve(outputDir, "vendor/LICENSE.txt"));
  console.log(`Static site ready: ${references.length} local references resolved and public/ generated.`);
}
