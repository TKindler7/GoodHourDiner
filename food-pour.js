// Surface-aware finishing effects. Original GLB geometry stays in place: only
// the deposited portion is revealed, so liquids never fall or rebound as slabs.
export function createPourEffect(THREE, layer) {
  layer.updateWorldMatrix(true, true);
  const inverse = layer.matrixWorld.clone().invert();
  const points = [], materials = [];
  let firstMaterial;
  const plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  layer.traverse(node => {
    if (!node.isMesh) return;
    const source = Array.isArray(node.material) ? node.material : [node.material];
    const copies = source.map(material => {
      firstMaterial ??= material;
      const copy = material.clone();
      copy.clippingPlanes = [plane];
      copy.clipShadows = true;
      materials.push(copy);
      return copy;
    });
    node.material = Array.isArray(node.material) ? copies : copies[0];
    const vertices = node.geometry.getAttribute('position');
    const transform = inverse.clone().multiply(node.matrixWorld);
    // Include the full surface: contact sampling is performed once at creation.
    for (let i = 0; i < vertices.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(transform));
  });
  const bounds = new THREE.Box3().setFromPoints(points);
  const width = Math.max(.01, bounds.max.x - bounds.min.x);
  const depth = Math.max(.01, bounds.max.z - bounds.min.z);
  const path = Array.from({ length: 101 }, (_, i) => {
    const p = i / 100;
    const x = bounds.min.x + width * p;
    const z = bounds.min.z + depth * (.5 + .36 * Math.sin(p * Math.PI * 4));
    let contact = points[0], nearest = Infinity;
    for (const point of points) {
      // Follow the actual sauce mesh, favoring its upper surface at intersections.
      const score = (point.x - x) ** 2 * 3 + (point.z - z) ** 2 + Math.max(0, bounds.max.y - point.y) * .012;
      if (score < nearest) { nearest = score; contact = point; }
    }
    return contact?.clone() ?? new THREE.Vector3(x, bounds.max.y, z);
  });
  const effect = new THREE.Group();
  effect.name = `${layer.name}-pour-stream`;
  effect.position.copy(layer.position); effect.rotation.copy(layer.rotation); effect.scale.copy(layer.scale);
  const material = new THREE.MeshPhysicalMaterial({
    color: firstMaterial?.color?.clone() ?? 0x5b2513,
    roughness: .23, metalness: 0, clearcoat: .35,
    transparent: firstMaterial?.transparent ?? false,
    opacity: firstMaterial?.opacity ?? 1,
  });
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.012, .019, 1, 10), material);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(.027, 12, 8), material);
  stream.castShadow = false; bead.castShadow = false;
  effect.add(stream, bead);
  const localPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const contact = new THREE.Vector3();
  function update(progress) {
    const p = Math.max(0, Math.min(1, progress));
    layer.updateWorldMatrix(true, false);
    localPlane.constant = bounds.min.x + width * p + (p === 1 ? .001 : 0);
    plane.copy(localPlane).applyMatrix4(layer.matrixWorld);
    for (const material of materials) material.clippingPlanes = p === 1 ? [] : [plane];
    effect.visible = p > 0 && p < .985 && layer.visible;
    const sample = p * 100, index = Math.min(99, Math.floor(sample));
    contact.lerpVectors(path[index], path[index + 1], sample - index);
    // Keep the stream's contact at the reveal edge rather than ahead of the pour.
    contact.x = Math.min(contact.x, localPlane.constant);
    const length = .62 * Math.min(1, p / .08, (1 - p) / .06);
    stream.position.copy(contact); stream.position.y += length / 2;
    stream.scale.y = Math.max(.001, length);
    bead.position.copy(contact);
    bead.scale.set(1.4, .35, 1.2);
    layer.userData.pourProgress = p;
  }
  function dispose() {
    effect.removeFromParent();
    stream.geometry.dispose(); bead.geometry.dispose(); material.dispose();
    for (const material of materials) material.dispose();
  }
  update(1);
  return { effect, update, dispose };
}
