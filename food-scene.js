import { foodRecipe, foodPlacements, validateFoodManifest } from "./food-model.js";
import { createPourEffect } from "./food-pour.js";

export async function createFoodScene(container, settings = {}) {
  if (!container || !settings.item || settings.signal?.aborted) return null;
  try { return await createTexturedScene(container, settings); }
  catch (error) {
    if (!settings.signal?.aborted) {
      settings.onState?.({ ready: false, loading: false });
      settings.onFallback?.(error);
    }
    return null;
  }
}

async function createTexturedScene(container, { item, options = {}, reducedMotion = false, onState = () => {}, onFallback = () => {}, signal, manifestUrl = "./assets/models/menu.json" } = {}) {
  const manifestAddress = new URL(manifestUrl, document.baseURI);
  const response = await fetch(manifestAddress, { cache: "no-cache", signal });
  if (!response.ok) throw new Error("The new ingredient models are not available yet.");
  const manifest = validateFoodManifest(await response.json());
  const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
    import("./vendor/three.module.js"), import("./vendor/GLTFLoader.js"), import("./vendor/RoomEnvironment.js"),
  ]);
  if (signal?.aborted) return null;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  const cleanups = [() => renderer.forceContextLoss(), () => renderer.dispose()];
  function cleanup() {
    for (const release of cleanups.splice(0).reverse()) {
      try { release(); } catch { /* Keep releasing the remaining resources. */ }
    }
  }
  try {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.className = "food-scene-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `${item.name} in 3D. Drag to rotate. Arrow keys rotate and zoom. Home resets the view.`);
  Object.assign(canvas.style, { width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" });
  container.append(canvas);
  cleanups.push(() => canvas.remove());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .05, 100);
  const turntable = new THREE.Group();
  scene.add(turntable);
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 6, bottom: -4, near: .5, far: 20 });
  key.shadow.bias = -.0003;
  key.shadow.normalBias = .015;
  cleanups.push(() => key.shadow.dispose());
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xaaa6a0, .35));
  const fill = new THREE.DirectionalLight(0xf2f6ff, .45);
  fill.position.set(4, 2, -2);
  scene.add(fill);
  const room = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let environment;
  try { environment = pmrem.fromScene(room, .04); }
  finally { room.dispose(); pmrem.dispose(); }
  cleanups.push(() => environment.dispose());
  scene.environment = environment.texture;
  scene.environmentIntensity = .75;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.025;
  ground.receiveShadow = true;
  cleanups.push(() => { ground.geometry.dispose(); ground.material.dispose(); });
  scene.add(ground);

  const loader = new GLTFLoader();
  const templates = new Map();
  const allocated = new Set();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = reducedMotion || motion.matches;
  let disposed = false, failed = false, request = 0, frame = 0, viewFrame = 0;
  let viewTarget = null;
  let pours = new Map();
  let layers = [], targetHeight = 1, distance = 7, homeDistance = 7, elevation = .42, homeElevation = .42, currentItemId = null;
  const pointers = new Map();
  let pinchDistance = 0;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  cleanups.push(() => {
    disposed = true; request++; cancelAnimationFrame(frame); stopView();
    for (const pour of pours.values()) pour.dispose();
    pours.clear();
    for (const object of allocated) disposeModel(object);
    allocated.clear(); templates.clear(); pointers.clear();
  });

  function disposeModel(object) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    object.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    const images = new Set();
    for (const texture of textures) { if (texture.source?.data) images.add(texture.source.data); texture.dispose(); }
    for (const image of images) image.close?.();
  }

  function render() {
    if (disposed || failed) return;
    camera.position.set(0, targetHeight + distance * Math.sin(elevation), distance * Math.cos(elevation));
    camera.lookAt(0, targetHeight, 0);
    for (const [layer, pour] of pours) pour.update(layer.userData.pourProgress ?? 1);
    renderer.render(scene, camera);
  }
  function stopView() {
    cancelAnimationFrame(viewFrame); viewFrame = 0;
    viewTarget = null;
  }
  function settle(draw = true) {
    cancelAnimationFrame(frame); frame = 0;
    stopView();
    for (const layer of layers) {
      layer.position.copy(layer.userData.restPosition);
      layer.scale.copy(layer.userData.restScale);
      layer.visible = true;
      pours.get(layer)?.update(1);
    }
    if (draw) render();
  }
  function assemble(incremental = false) {
    settle(false);
    if (reduce || !layers.length) { render(); return; }
    // Render the arrival pose before revealing the 3D stage. Expensive first
    // texture uploads must not consume the animation's clock or flash the rest pose.
    let start;
    const solids = layers.filter(layer => layer.userData.motion !== "pour");
    const positions = new Map(solids.map((layer, index) => [layer, incremental ? layer.userData.arrivalPosition : layer.userData.restPosition.clone().add(new THREE.Vector3(0, .65 + Math.min(index, 8) * .16, 0))]));
    const slots = new Map();
    let clock = 0;
    for (const layer of layers) {
      if (layer.userData.motion === "pour" && layer.userData.pourStage !== "inline") continue;
      slots.set(layer, clock);
      clock += layer.userData.motion === "pour" ? 1050 : 460;
    }
    const finishAt = incremental ? 400 : clock;
    layers.forEach(layer => {
      if (pours.has(layer)) {
        layer.position.copy(layer.userData.restPosition);
        const retained = incremental && (!layer.userData.newPour || layer.userData.pourStage === "inline");
        layer.visible = retained;
        pours.get(layer).update(retained ? 1 : 0);
      } else {
        layer.position.copy(positions.get(layer));
        layer.visible = incremental || layer === solids[0];
        if (incremental) layer.scale.copy(layer.userData.arrivalScale);
      }
    });
    render();
    function tick(now) {
      if (disposed || failed) return;
      start ??= now;
      let active = false;
      solids.forEach((layer, index) => {
        const elapsed = now - start - (incremental ? 0 : slots.get(layer));
        const progress = clamp(elapsed / (incremental ? 400 : 460), 0, 1);
        layer.visible = incremental || elapsed >= 0;
        if (incremental) {
          const eased = 1 - (1 - progress) ** 3;
          layer.position.lerpVectors(positions.get(layer), layer.userData.restPosition, eased);
          layer.scale.lerpVectors(layer.userData.arrivalScale, layer.userData.restScale, eased);
        } else {
          const drop = clamp(progress / .65, 0, 1);
          const rebound = clamp((progress - .65) / .35, 0, 1);
          layer.position.copy(layer.userData.restPosition);
          layer.position.y += progress < .65
            ? (positions.get(layer).y - layer.userData.restPosition.y) * (1 - drop * drop)
            : (layer.userData.motion === "scatter" ? 0 : .09 * Math.sin(Math.PI * rebound));
        }
        if (progress < 1) active = true;
      });
      // All liquid pieces finish together, even on a three-slice plate. Camera
      // movement updates their clipping planes without changing this clock.
      for (const [layer, pour] of pours) {
        if (incremental && (!layer.userData.newPour || layer.userData.pourStage === "inline")) { pour.update(1); continue; }
        const elapsed = now - start - (layer.userData.pourStage === "inline" ? slots.get(layer) : finishAt);
        const progress = clamp(elapsed / 1050, 0, 1);
        layer.visible = elapsed >= 0;
        pour.update(progress);
        if (progress < 1) active = true;
      }
      render();
      frame = active ? requestAnimationFrame(tick) : 0;
    }
    frame = requestAnimationFrame(tick);
  }
  function fitView(preserveZoom = true, stableFrame = false) {
    const zoomRatio = preserveZoom ? distance / homeDistance : 1;
    // Measure the finished dish without cancelling or reframing its entrance.
    const poses = layers.map(layer => ({ position: layer.position.clone(), scale: layer.scale.clone() }));
    layers.forEach(layer => {
      layer.position.copy(layer.userData.restPosition);
      layer.scale.copy(layer.userData.restScale);
    });
    turntable.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const layer of layers) box.union(new THREE.Box3().setFromObject(layer));
    layers.forEach((layer, index) => {
      layer.position.copy(poses[index].position);
      layer.scale.copy(poses[index].scale);
    });
    const size = box.getSize(new THREE.Vector3());
    targetHeight = (box.min.y + box.max.y) / 2;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    // Fit actual depth as well as width/height, with a small margin for the food.
    const radius = Math.max(size.x, size.z) / 2;
    const halfHeight = size.y / 2;
    let fit = 0;
    for (const y of [-halfHeight, halfHeight]) for (const z of [-radius, radius]) {
      const viewY = y * Math.cos(elevation) - z * Math.sin(elevation);
      const viewZ = y * Math.sin(elevation) + z * Math.cos(elevation);
      fit = Math.max(fit, Math.abs(viewY) / tanHalfFov + viewZ, radius / (tanHalfFov * camera.aspect) + viewZ);
    }
    // Leave room for larger servings. Keep the camera steady while options
    // change so a larger portion does not get scaled back to the same apparent size.
    homeDistance = stableFrame ? Math.max(homeDistance, fit * 1.02) : Math.max(3, fit * 1.20);
    distance = homeDistance * clamp(zoomRatio, .55, 1.8);
  }
  async function template(key) {
    if (templates.has(key)) return templates.get(key);
    const config = manifest.ingredients[key];
    if (!config) throw new Error(`The ${key.replaceAll("-", " ")} model is not ready yet.`);
    let loadedObject;
    const promise = loader.loadAsync(new URL(config.url, manifestAddress).href).then(gltf => {
      const object = gltf.scene;
      loadedObject = object;
      if (disposed) { disposeModel(object); throw new Error("Preview closed."); }
      allocated.add(object);
      // GLB uses Y-up. Preserve its exported root transform; optional calibration
      // rotates an outer group instead of overwriting the imported transform.
      const basis = new THREE.Group();
      basis.add(object);
      basis.rotation.fromArray(config.rotation || [0, 0, 0]);
      basis.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(basis);
      const size = box.getSize(new THREE.Vector3());
      const width = Math.max(size.x, size.z);
      if (!Number.isFinite(width) || width < .00001) throw new Error(`The ${key} model has no usable geometry.`);
      const wrapper = new THREE.Group();
      wrapper.add(basis);
      const factor = config.width / width;
      basis.scale.setScalar(factor);
      const adjusted = new THREE.Box3().setFromObject(basis);
      const center = adjusted.getCenter(new THREE.Vector3());
      basis.position.set(-center.x, -adjusted.min.y, -center.z);
      wrapper.userData.height = (adjusted.max.y - adjusted.min.y);
      wrapper.traverse(node => {
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        // Shadow maps cannot refract light through a glass shell. Let the food
        // inside supply its contact shadow instead of casting an opaque glass silhouette.
        const glass = materials.every(material => material?.transmission > .5);
        node.castShadow = !glass; node.receiveShadow = !glass;
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value?.isTexture) value.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
          }
        }
      });
      return wrapper;
    }).catch(error => {
      if (templates.get(key) === promise) templates.delete(key);
      if (allocated.delete(loadedObject)) disposeModel(loadedObject);
      throw error;
    });
    templates.set(key, promise);
    return promise;
  }
  async function update(nextItem, nextOptions = {}) {
    if (disposed || failed) return;
    const token = ++request;
    settle();
    canvas.style.visibility = "hidden";
    canvas.tabIndex = -1;
    container.setAttribute("aria-busy", "true");
    onState({ ready: false, loading: true });
    try {
      const recipe = foodRecipe(nextItem, nextOptions);
      const placements = foodPlacements(recipe, manifest);
      const objects = await Promise.all(recipe.map(layer => template(layer.asset)));
      if (disposed || failed || token !== request) return;
      settle();
      const previous = new Map(layers.map(layer => [layer.name, { asset: layer.userData.asset, position: layer.position.clone(), scale: layer.scale.clone() }]));
      for (const pour of pours.values()) pour.dispose();
      pours.clear();
      turntable.clear();
      const firstRecipe = currentItemId !== nextItem.id;
      if (firstRecipe) {
        homeElevation = nextItem.model === "burger" || nextItem.category === "drinks" ? .35 : .58;
        elevation = homeElevation;
        currentItemId = nextItem.id;
      }
      layers = objects.map((object, index) => {
        const instance = object.clone(true);
        instance.name = recipe[index].id;
        instance.position.fromArray(placements[index].position);
        instance.rotation.fromArray(placements[index].rotation);
        instance.scale.fromArray(placements[index].scale);
        instance.userData.asset = recipe[index].asset;
        instance.userData.motion = recipe[index].motion || "solid";
        instance.userData.pourStage = recipe[index].pourStage || "finish";
        instance.userData.restPosition = instance.position.clone();
        instance.userData.restScale = instance.scale.clone();
        const before = previous.get(instance.name);
        const sameIngredient = !firstRecipe && before?.asset === recipe[index].asset;
        instance.userData.newPour = !sameIngredient || !before.position.equals(instance.position) || !before.scale.equals(instance.scale);
        instance.userData.arrivalPosition = sameIngredient ? before.position : instance.position.clone().add(new THREE.Vector3(0, .35, 0));
        instance.userData.arrivalScale = sameIngredient ? before.scale : instance.scale.clone();
        turntable.add(instance);
        return instance;
      });
      for (const layer of layers) {
        if (layer.userData.motion !== "pour") continue;
        const pour = createPourEffect(THREE, layer);
        pours.set(layer, pour);
        turntable.add(pour.effect);
      }
      container.dataset.ingredients = recipe.map(layer => layer.id).join(",");
      container.dataset.item = nextItem.id;
      canvas.setAttribute("aria-label", `${nextItem.name} in 3D, showing your selected ingredients. Drag to rotate. Arrow keys rotate and zoom. Home resets the view.`);
      canvas.tabIndex = 0;
      container.setAttribute("aria-busy", "false");
      const used = new Set(recipe.map(layer => layer.asset));
      for (const [key, pending] of templates) {
        if (used.has(key)) continue;
        templates.delete(key);
        pending.then(template => {
          const object = template.children[0]?.children[0];
          if (allocated.delete(object)) disposeModel(object);
        }).catch(() => {});
      }
      fitView(!firstRecipe, !firstRecipe);
      assemble(!firstRecipe);
      canvas.style.visibility = "visible";
      onState({ ready: true, loading: false });
    } catch (error) {
      if (disposed || failed || token !== request) return;
      container.setAttribute("aria-busy", "false");
      onState({ ready: false, loading: false });
    }
  }
  function moveView(next, duration = 280) {
    const target = { rotation: turntable.rotation.y, distance, elevation, ...viewTarget, ...next };
    stopView();
    const from = { rotation: turntable.rotation.y, distance, elevation };
    const apply = progress => {
      const eased = 1 - (1 - progress) ** 3;
      turntable.rotation.y = from.rotation + (target.rotation - from.rotation) * eased;
      distance = from.distance + (target.distance - from.distance) * eased;
      elevation = from.elevation + (target.elevation - from.elevation) * eased;
      render();
    };
    if (reduce) { apply(1); return; }
    viewTarget = target;
    const start = performance.now();
    function tick(now) {
      if (disposed || failed) return;
      const progress = clamp((now - start) / duration, 0, 1);
      apply(progress);
      if (progress < 1) viewFrame = requestAnimationFrame(tick);
      else { viewFrame = 0; viewTarget = null; }
    }
    // Camera easing and ingredient assembly have independent lifetimes.
    viewFrame = requestAnimationFrame(tick);
  }
  function rotate(delta) { moveView({ rotation: (viewTarget?.rotation ?? turntable.rotation.y) + (Number(delta) || 0) }); }
  function zoom(delta) { moveView({ distance: clamp((viewTarget?.distance ?? distance) - (Number(delta) || 0), homeDistance * .55, homeDistance * 1.8) }); }
  function reset() { moveView({ rotation: -.22, elevation: homeElevation, distance: homeDistance }, 440); }
  function resize() {
    if (disposed) return;
    const bounds = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
    camera.aspect = Math.max(1, bounds.width) / Math.max(1, bounds.height);
    camera.updateProjectionMatrix();
    if (layers.length) fitView();
    render();
  }
  function pointerDown(event) {
    stopView(); canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.style.cursor = "grabbing";
    if (pointers.size === 2) { const p = [...pointers.values()]; pinchDistance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
  }
  function pointerMove(event) {
    const before = pointers.get(event.pointerId); if (!before) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) { turntable.rotation.y += (event.clientX - before.x) * .009; elevation = clamp(elevation + (event.clientY - before.y) * .004, -.12, 1.25); }
    else if (pointers.size === 2) {
      const p = [...pointers.values()], next = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      distance = clamp(distance - (next - pinchDistance) * .018, homeDistance * .55, homeDistance * 1.8); pinchDistance = next;
    }
    render();
  }
  function pointerUp(event) { pointers.delete(event.pointerId); if (!pointers.size) canvas.style.cursor = "grab"; }
  function keyboard(event) {
    const actions = { ArrowLeft: () => rotate(-.25), ArrowRight: () => rotate(.25), ArrowUp: () => zoom(.35), ArrowDown: () => zoom(-.35), Home: reset };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  }
  function wheel(event) { event.preventDefault(); zoom(-event.deltaY * .004); }
  function contextLost(event) { event.preventDefault(); failed = true; request++; cancelAnimationFrame(frame); stopView(); canvas.style.visibility = "hidden"; canvas.tabIndex = -1; container.setAttribute("aria-busy", "false"); onState({ ready: false, loading: false }); onFallback(); }
  function motionChanged(event) { reduce = reducedMotion || event.matches; if (reduce) settle(); }
  function visibilityChanged() { if (document.hidden) settle(false); }
  document.addEventListener("visibilitychange", visibilityChanged);
  cleanups.push(() => document.removeEventListener("visibilitychange", visibilityChanged));
  const events = [["pointerdown", pointerDown], ["pointermove", pointerMove], ["pointerup", pointerUp], ["pointercancel", pointerUp], ["lostpointercapture", pointerUp], ["keydown", keyboard], ["webglcontextlost", contextLost]];
  for (const [name, handler] of events) canvas.addEventListener(name, handler);
  cleanups.push(() => { for (const [name, handler] of events) canvas.removeEventListener(name, handler); });
  canvas.addEventListener("wheel", wheel, { passive: false });
  cleanups.push(() => canvas.removeEventListener("wheel", wheel));
  motion.addEventListener("change", motionChanged);
  cleanups.push(() => motion.removeEventListener("change", motionChanged));
  const observer = new ResizeObserver(resize); observer.observe(container);
  cleanups.push(() => observer.disconnect());
  signal?.addEventListener("abort", cleanup, { once: true });
  cleanups.push(() => signal?.removeEventListener("abort", cleanup));
  if (signal?.aborted) { cleanup(); return null; }
  turntable.rotation.y = -.22;
  resize();
  await update(item, options);
  if (disposed) return null;
  return {
    update, rotate, zoom, reset, assemble,
    dispose() {
      if (disposed) return;
      cleanup();
    },
  };
  } catch (error) { cleanup(); throw error; }
}
