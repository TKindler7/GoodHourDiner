import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import * as THREE from "three";
import { createFoodScene } from "../food-scene.js";
import { ITEMS } from "../catalog.js";
import { loadFoodLibrary } from "../scripts/model-library.js";

// Exercise the real scene lifecycle and Three.js transforms without a GPU.
// Only rendering, model downloads, DOM sizing, and the animation clock are stubbed.
test("the first ingredient entrance survives control-layout resize and slow first rendering", async () => {
  let now = 0, nextFrame = 0, resize, renderedScene, renderedCamera, readyPose, slowRender = true;
  let height = 400;
  const frames = new Map();
  const media = { matches: false, addEventListener() {}, removeEventListener() {} };
  const handlers = new Map();
  const canvas = { style: {}, setAttribute() {}, setPointerCapture() {},
    addEventListener(name, callback) { handlers.set(name, callback); },
    removeEventListener(name) { handlers.delete(name); }, remove() {} };
  const dispatch = (type, values = {}) => handlers.get(type)({ preventDefault() {}, ...values });
  const container = { dataset: {}, append() {}, setAttribute() {}, getBoundingClientRect: () => ({ width: 500, height }) };
  const renderBoundary = {
    WebGLRenderer: class {
      constructor() { this.domElement = canvas; this.shadowMap = {}; this.capabilities = { getMaxAnisotropy: () => 1 }; }
      setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
      render(scene, camera) { renderedScene = scene; renderedCamera = camera; if (slowRender) now += 1400; }
    },
    PMREMGenerator: class { fromScene() { return { texture: new THREE.Texture(), dispose() {} }; } dispose() {} },
    GLTFLoader: class { async loadAsync() { return { scene: new THREE.Mesh(new THREE.BoxGeometry(1, .2, 1), new THREE.MeshStandardMaterial()) }; } },
    RoomEnvironment: class { dispose() {} },
  };
  const globals = {
    __foodSceneBoundary: renderBoundary,
    document: { baseURI: "https://test.invalid/", addEventListener() {}, removeEventListener() {} }, window: { devicePixelRatio: 1 },
    fetch: async () => ({ ok: true, json: async () => loadFoodLibrary() }),
    matchMedia: () => media, performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} disconnect() {} },
  };
  const saved = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const source = {
    "./vendor/three.module.js": `export * from ${JSON.stringify(import.meta.resolve("three"))}; export const { WebGLRenderer, PMREMGenerator } = globalThis.__foodSceneBoundary;`,
    "./vendor/GLTFLoader.js": "export const { GLTFLoader } = globalThis.__foodSceneBoundary;",
    "./vendor/RoomEnvironment.js": "export const { RoomEnvironment } = globalThis.__foodSceneBoundary;",
  };
  const hooks = registerHooks({ resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/food-scene.js") && source[specifier]) return { url: `data:text/javascript,${encodeURIComponent(source[specifier])}`, shortCircuit: true };
    return next(specifier, context);
  } });
  const tick = time => { now = time; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); };
  const layers = () => renderedScene.children.find(node => node.isGroup).children;
  let scene;
  try {
    scene = await createFoodScene(container, { item: ITEMS[0], onState: state => {
      if (state.ready) readyPose = layers().map(layer => layer.position.y - layer.userData.restPosition.y);
    }, onFallback: error => { throw error; } });
    assert.ok(scene);
    slowRender = false;
    assert.ok(readyPose.every(y => y >= .64), "arrival pose must be rendered before ready handoff");
    assert.equal(layers().filter(layer => layer.visible).length, 1, "only the first ingredient starts visible");
    const initial = layers().map(layer => layer.position.clone());
    tick(10000); // First frame can arrive long after models/shaders were prepared.
    assert.ok(layers().every((layer, i) => layer.position.equals(initial[i])), "slow initial rendering must not consume the entrance");
    tick(10299); // First contact: 65% of the 460 ms slot.
    assert.ok(Math.abs(layers()[0].position.y - layers()[0].userData.restPosition.y) < 1e-9);
    tick(10370); // Small upward rebound after contact.
    assert.ok(layers()[0].position.y > layers()[0].userData.restPosition.y);
    assert.ok(layers().slice(1).every(layer => !layer.visible), "later ingredients wait through the bounce");
    const midway = layers().map(layer => layer.position.clone());
    assert.ok(midway[0].y < initial[0].y && midway[0].y > layers()[0].userData.restPosition.y);
    height = 360; resize(); // Revealing the controls reduces the preview stage.
    assert.equal(frames.size, 1, "layout resize must not cancel the entrance frame");
    assert.ok(layers().every((layer, i) => layer.position.equals(midway[i])), "resize must preserve current ingredient poses");
    tick(10460);
    assert.ok(layers()[0].position.distanceTo(layers()[0].userData.restPosition) < 1e-9);
    assert.equal(layers()[1].visible, true, "the next ingredient appears only after the first settles");
    assert.ok(layers().slice(2).every(layer => !layer.visible));
    tick(10000 + layers().length * 460);
    assert.equal(frames.size, 0);
    assert.ok(layers().every(layer => layer.position.distanceTo(layer.userData.restPosition) < 1e-9));
    const turntable = () => renderedScene.children.find(node => node.isGroup);
    const controls = [
      ["rotate", () => scene.rotate(.3)],
      ["zoom", () => scene.zoom(.4)],
      ["reset", () => scene.reset()],
      ["keyboard", () => dispatch("keydown", { key: "ArrowLeft" })],
      ["wheel", () => dispatch("wheel", { deltaY: -80 })],
      ["drag", () => {
        dispatch("pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
        dispatch("pointermove", { pointerId: 1, clientX: 150, clientY: 110 });
        dispatch("pointerup", { pointerId: 1 });
      }],
      ["pinch", () => {
        dispatch("pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
        dispatch("pointerdown", { pointerId: 2, clientX: 150, clientY: 100 });
        dispatch("pointermove", { pointerId: 2, clientX: 180, clientY: 100 });
        dispatch("pointerup", { pointerId: 1 }); dispatch("pointerup", { pointerId: 2 });
      }],
    ];
    for (const [index, [name, control]] of controls.entries()) {
      const start = 20000 + index * 10000;
      scene.assemble(); tick(start); tick(start + 100);
      const before = layers().map(layer => ({ position: layer.position.clone(), visible: layer.visible }));
      const rotation = turntable().rotation.y, cameraPosition = renderedCamera.position.clone();
      control();
      assert.ok(layers().every((layer, i) => layer.position.equals(before[i].position) && layer.visible === before[i].visible), `${name} must preserve the current assembly pose`);
      tick(start + 200);
      assert.ok(turntable().rotation.y !== rotation || !renderedCamera.position.equals(cameraPosition), `${name} must actually move the view during assembly`);
      assert.ok(layers()[0].position.y < before[0].position.y, `${name} must let the falling ingredient continue`);
      assert.ok(layers().slice(1).every(layer => !layer.visible), `${name} must not expose future ingredients`);
      tick(start + 460);
      assert.equal(layers()[1].visible, true, `${name} must preserve the next arrival time`);
      tick(start + layers().length * 460);
      assert.equal(frames.size, 0);
      assert.ok(layers().every(layer => layer.visible && layer.position.distanceTo(layer.userData.restPosition) < 1e-9));
    }
    scene.assemble(); scene.rotate(.3);
    assert.equal(frames.size, 2, "assembly and camera each keep their own scheduled frame");
    dispatch("pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
    assert.equal(frames.size, 1, "drag interrupts camera easing only");
    scene.zoom(.2);
    scene.dispose(); scene = null;
    assert.equal(frames.size, 0, "closing must cancel the remaining entrance");

    const toast = ITEMS.find(item => item.id === "cinnamon-french-toast");
    scene = await createFoodScene(container, { item: toast, options: { portion: "three", toppings: ["syrup", "whipped-cream", "blueberry"] } });
    const foodLayers = () => layers().filter(layer => layer.userData.restPosition);
    const liquidLayers = () => foodLayers().filter(layer => layer.userData.motion === "pour");
    assert.equal(liquidLayers().length, 3, "each slice has syrup but all pour together");
    const solidCount = foodLayers().length - liquidLayers().length;
    const startPour = 120000 + solidCount * 460;
    tick(120000);
    assert.ok(liquidLayers().every(layer => !layer.visible));
    tick(startPour + 300);
    assert.ok(liquidLayers().every(layer => layer.visible && layer.userData.pourProgress > .2 && layer.userData.pourProgress < .4));
    assert.ok(liquidLayers().every(layer => layer.position.equals(layer.userData.restPosition)), "liquid stays on its receiving surface");
    const progress = liquidLayers()[0].userData.pourProgress;
    scene.rotate(.3); scene.zoom(.2);
    assert.equal(liquidLayers()[0].userData.pourProgress, progress, "view changes cannot finish a pour");
    tick(startPour + 600);
    assert.ok(liquidLayers()[0].userData.pourProgress > progress);
    assert.ok(layers().some(layer => layer.name.endsWith("-pour-stream") && layer.visible), "active pour has a visible stream");
    tick(startPour + 1050);
    assert.equal(frames.size, 0);
    assert.ok(liquidLayers().every(layer => layer.userData.pourProgress === 1));
    assert.ok(layers().filter(layer => layer.name.endsWith("-pour-stream")).every(layer => !layer.visible), "finished liquids have no hovering streams");
    scene.assemble(); tick(140000); tick(140000 + solidCount * 460 + 100);
    await scene.update(toast, { portion: "two", toppings: [] });
    assert.equal(liquidLayers().length, 0, "removal during a pour releases all sauce layers");
    assert.ok(!layers().some(layer => layer.name.endsWith("-pour-stream")));
    scene.dispose(); scene = null;
    assert.equal(frames.size, 0);

    const maple = ITEMS.find(item => item.id === "maple-bacon");
    scene = await createFoodScene(container, { item: maple });
    const mapleLayers = foodLayers();
    const glazeIndex = mapleLayers.findIndex(layer => layer.name === "maple-glaze");
    tick(160000); tick(160000 + glazeIndex * 460 + 400);
    assert.ok(mapleLayers[glazeIndex].userData.pourProgress > 0 && mapleLayers[glazeIndex].userData.pourProgress < 1);
    assert.ok(mapleLayers.slice(glazeIndex + 1).every(layer => !layer.visible), "internal glaze pours before cheese and bun cover it");
    tick(160000 + glazeIndex * 460 + 1050);
    assert.equal(mapleLayers[glazeIndex].userData.pourProgress, 1);
    assert.equal(mapleLayers[glazeIndex + 1].visible, true, "solid assembly resumes after internal pour");
    scene.dispose(); scene = null;
    assert.equal(frames.size, 0);

    media.matches = true;
    scene = await createFoodScene(container, { item: ITEMS[0] });
    assert.ok(scene);
    assert.equal(frames.size, 0, "reduced motion must remain immediate");
    assert.ok(layers().every(layer => layer.position.distanceTo(layer.userData.restPosition) < 1e-9));
  } finally {
    scene?.dispose(); hooks.deregister();
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
