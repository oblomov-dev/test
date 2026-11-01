// Rueda 3D – Gliederpuppen mit inverser Kinematik, gesteuert von den Fuß- und Handpositionen der 2D-Simulation.
// Koordinaten: 2D-Szene in Pixeln (x rechts, y unten), M = Pixel pro Meter. 3D: X = (x - CX) / M, Z = (y - CY) / M, Y = oben.
import * as THREE from './three.module.min.js';
import { OrbitControls } from './addons/controls/OrbitControls.js';

const COL = { L: 0x5b9bff, F: 0xff6fa5 };
const DIM = { thigh: .44, shin: .42, ankle: .075, hipW: .095, spine: .5, neck: .08, head: .105, shW: .17, upper: .29, fore: .27 };
const LEG = DIM.thigh + DIM.shin;

let renderer, scene, camera, controls, glc, ready = false, active = false;
let floorDyn = null, lastGeoKey = '';
const figs = new Map();
const tmpV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

function init() {
  glc = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e0f14); scene.fog = new THREE.Fog(0x0e0f14, 10, 26);
  camera = new THREE.PerspectiveCamera(38, 1, .05, 100);
  controls = new OrbitControls(camera, glc);
  controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .495; controls.minDistance = 1.5; controls.maxDistance = 18;
  preset('schraeg');

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2420, .85));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7); sun.position.set(3.5, 8, 4.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 22 }); sun.shadow.bias = -.0004;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8fb4ff, .45); rim.position.set(-5, 4, -6); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0x262a33, roughness: .85 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // Auswahl per Antippen (ohne Ziehen)
  let down = null;
  glc.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  glc.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const r = glc.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hits = ray.intersectObjects([...figs.values()].flatMap(f => f.pick), false);
    window.__ruedaSelect && window.__ruedaSelect(hits.length ? hits[0].object.userData.id : null);
  });
  ready = true;
}

function preset(name) {
  const t = { schraeg: [[0, 5.0, 6.6], [0, .7, 0]], oben: [[0, 10.5, .01], [0, 0, 0]], seite: [[0, 1.55, 6.8], [0, 1.0, 0]], tief: [[4.6, .9, 4.6], [0, 1.0, 0]] }[name];
  if (!t) return;
  camera.position.set(...t[0]); controls.target.set(...t[1]); controls.update();
}

// ---------- Figur ----------
function mat(color, rough = .55) { return new THREE.MeshStandardMaterial({ color, roughness: rough, transparent: true, opacity: 1 }); }
function makeFigure(role, num) {
  const g = new THREE.Group(); scene.add(g);
  const m = {
    skin: mat(0xcf9f7a, .6), top: mat(COL[role], .5), bottom: mat(role === 'L' ? 0x3c4f78 : 0xb85a86, .7),
    shoe: mat(role === 'L' ? 0xd8d2c4 : 0xe0b45a, .35), hair: mat(role === 'L' ? 0x2a1d14 : 0x3b2216, .8), joint: mat(role === 'L' ? 0x3d5f99 : 0x9c3f66, .5),
  };
  const pick = [];
  const add = (geo, material, parent = g) => { const o = new THREE.Mesh(geo, material); o.castShadow = true; o.userData.id = null; parent.add(o); pick.push(o); return o; };
  const cyl = (r1, r2, material) => add(new THREE.CylinderGeometry(r1, r2, 1, 14), material);
  const sph = (r, material, parent) => add(new THREE.SphereGeometry(r, 18, 12), material, parent);
  const f = { g, m, pick, role };
  // Beine
  f.thigh = [cyl(.068, .052, m.bottom), cyl(.068, .052, m.bottom)];
  f.shin = [cyl(.05, .038, m.bottom), cyl(.05, .038, m.bottom)];
  f.knee = [sph(.052, m.joint), sph(.052, m.joint)];
  f.hip = [sph(.07, m.bottom), sph(.07, m.bottom)];
  // Schuhe: Ferse hinten, Spitze vorne
  f.shoe = [0, 1].map(() => { const s = new THREE.Group(); g.add(s); const body = add(new THREE.BoxGeometry(.25, .06, .095), m.shoe, s); body.position.set(.03, .03, 0);
    const toe = add(new THREE.CylinderGeometry(.048, .048, .06, 14), m.shoe, s); toe.rotation.x = Math.PI / 2; toe.position.set(.15, .03, 0); toe.scale.set(1, 1, 1); return s; });
  // Rumpf als Gruppe (Gierwinkel = Blickrichtung, lokales +X = vorne, +Z = rechts)
  f.torso = new THREE.Group(); g.add(f.torso);
  const pelvis = add(new THREE.SphereGeometry(1, 20, 14), m.bottom, f.torso); pelvis.scale.set(.12, .1, .17); f.pelvisMesh = pelvis;
  const chest = add(new THREE.CylinderGeometry(1, .78, 1, 20), m.top, f.torso); chest.scale.set(.12, DIM.spine * .82, .19); chest.position.y = DIM.spine * .55; f.chest = chest;
  if (role === 'F') { const skirt = add(new THREE.CylinderGeometry(.13, .21, .3, 22, 1, true), mat(0xff8cb8, .6), f.torso); skirt.material.side = THREE.DoubleSide; skirt.position.y = -.1; f.skirt = skirt; }
  const neck = add(new THREE.CylinderGeometry(.045, .05, DIM.neck + .04, 10), m.skin, f.torso); neck.position.y = DIM.spine + .02;
  const head = sph(DIM.head, m.skin, f.torso); head.position.y = DIM.spine + DIM.neck + DIM.head * .9; f.head = head;
  const hair = add(new THREE.SphereGeometry(DIM.head * 1.04, 18, 12, 0, Math.PI * 2, 0, Math.PI * .55), m.hair, f.torso);
  hair.position.copy(head.position).add(new THREE.Vector3(-.018, .01, 0)); hair.rotation.z = .5;   // Haare hinten/oben → vorne sieht man das Gesicht
  const nose = add(new THREE.ConeGeometry(.02, .05, 8), m.skin, f.torso); nose.rotation.z = -Math.PI / 2; nose.position.copy(head.position).add(new THREE.Vector3(DIM.head + .012, -.01, 0));
  for (const s of [-1, 1]) { const eye = add(new THREE.SphereGeometry(.012, 8, 6), mat(0x111111), f.torso); eye.position.copy(head.position).add(new THREE.Vector3(DIM.head * .88, .025, s * .035)); }
  // Arme
  f.upper = [cyl(.042, .036, m.top), cyl(.042, .036, m.top)];
  f.fore = [cyl(.034, .028, m.skin), cyl(.034, .028, m.skin)];
  f.elbow = [sph(.036, m.skin), sph(.036, m.skin)];
  f.hand = [sph(.042, m.skin), sph(.042, m.skin)];
  f.shoulder = [sph(.05, m.top), sph(.05, m.top)];
  // Nummer über dem Kopf
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(14,15,20,.85)'; c.beginPath(); c.arc(32, 32, 28, 0, Math.PI * 2); c.fill(); c.lineWidth = 4; c.strokeStyle = role === 'L' ? '#5b9bff' : '#ff6fa5'; c.stroke();
  c.fillStyle = c.strokeStyle; c.font = 'bold 34px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(num), 32, 34);
  f.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })); f.label.scale.set(.22, .22, 1); f.label.renderOrder = 10; g.add(f.label);
  f.mats = Object.values(m).concat(f.skirt ? [f.skirt.material] : []);
  return f;
}

// Zylinder zwischen zwei Punkten
function limb(mesh, a, b) {
  tmpV.subVectors(b, a); const len = tmpV.length();
  mesh.position.addVectors(a, b).multiplyScalar(.5); mesh.scale.set(1, Math.max(len, .001), 1);
  mesh.quaternion.setFromUnitVectors(UP, tmpV.normalize());
}
// Zwei-Gelenk-IK: Wurzel A, Ziel T, Längen l1/l2, Biegerichtung hint → Mittelgelenk (Knie/Ellbogen) und erreichtes Ende
function ik2(A, T, l1, l2, hint) {
  const d = new THREE.Vector3().subVectors(T, A); let dist = d.length();
  const maxD = (l1 + l2) * .999, minD = Math.abs(l1 - l2) + .01;
  const end = dist > maxD ? A.clone().add(d.clone().multiplyScalar(maxD / dist)) : T.clone();
  dist = Math.min(Math.max(dist, minD), maxD); const dir = d.normalize();
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const perp = hint.clone().sub(dir.clone().multiplyScalar(hint.dot(dir))); if (perp.lengthSq() < 1e-6) perp.set(0, 0, 1); perp.normalize();
  return { mid: A.clone().add(dir.clone().multiplyScalar(along)).add(perp.multiplyScalar(h)), end };
}

// ---------- Boden: Kreis, Plätze, Paarlinien ----------
function rebuildFloor(st) {
  const key = st.N + ':' + st.M.toFixed(2);
  if (key === lastGeoKey) return; lastGeoKey = key;
  if (floorDyn) scene.remove(floorDyn);
  floorDyn = new THREE.Group(); scene.add(floorDyn);
  const R = st.R / st.M;
  const ring = new THREE.Mesh(new THREE.RingGeometry(R - .012, R + .012, 128), new THREE.MeshBasicMaterial({ color: 0x4a4f5c }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .002; floorDyn.add(ring);
  for (let i = 0; i < st.N; i++) {
    const a = Math.PI / 2 + i / st.N * Math.PI * 2, dot = new THREE.Mesh(new THREE.CircleGeometry(.03, 12), new THREE.MeshBasicMaterial({ color: 0x555a66 }));
    dot.rotation.x = -Math.PI / 2; dot.position.set(R * Math.cos(a), .003, -R * Math.sin(a)); floorDyn.add(dot);
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(st.N * 6), 3));
  floorDyn.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x8a8d96, transparent: true, opacity: .5 })); floorDyn.add(floorDyn.lines);
}

// ---------- Pro Bild ----------
function render(st) {
  if (!ready || !active || !st) return;
  const W = p => new THREE.Vector3((p.x - st.CX) / st.M, 0, (p.y - st.CY) / st.M);
  rebuildFloor(st);
  // Figuren anlegen/entfernen
  for (const [id, f] of figs) if (!st.dancers.find(d => d.id === id && d.role === f.role)) { scene.remove(f.g); figs.delete(id); }
  for (const d of st.dancers) if (!figs.has(d.id)) { const f = makeFigure(d.role, d.num); f.pick.forEach(o => (o.userData.id = d.id)); figs.set(d.id, f); }

  const lines = floorDyn.lines.geometry.attributes.position; let li = 0;
  for (const d of st.dancers) {
    const f = figs.get(d.id), b = st.bodies[d.id]; if (!b) continue;
    const fwd = new THREE.Vector3(Math.cos(b.rot), 0, Math.sin(b.rot)), right = new THREE.Vector3(-Math.sin(b.rot), 0, Math.cos(b.rot));
    const dim = st.selPair && !st.selPair.includes(d.id) ? .28 : 1;
    for (const m of f.mats) m.opacity = dim;
    // Füße (Knöchel über der Ferse, beim Schritt angehoben)
    const ank = [], footDir = [];
    ['l', 'r'].forEach((side, i) => {
      const ft = b.feet && b.feet[side];
      const fp = ft ? W(ft) : W(b).add(right.clone().multiplyScalar(i ? .1 : -.1));
      const a = ft ? ft.a : b.rot, fd = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), lift = ft ? ft.lift : 0;
      const shoe = f.shoe[i]; shoe.position.copy(fp).add(new THREE.Vector3(0, lift * .07, 0)); shoe.rotation.set(0, -a, lift * .25);
      ank.push(fp.clone().add(fd.clone().multiplyScalar(-.05)).add(new THREE.Vector3(0, DIM.ankle + lift * .07, 0))); footDir.push(fd);
    });
    // Becken: horizontal an der Körperposition, Höhe so, dass beide Beine knapp nicht gestreckt sind (Knie immer leicht gebeugt)
    const pel = W(b), ws = d.wsm || 0;
    let hy = .95;
    [-1, 1].forEach((s, i) => { const hipXZ = pel.clone().add(right.clone().multiplyScalar(s * DIM.hipW)); const hz = Math.hypot(ank[i].x - hipXZ.x, ank[i].z - hipXZ.z);
      hy = Math.min(hy, ank[i].y + Math.sqrt(Math.max(.01, (LEG * .975) ** 2 - hz * hz))); });
    hy -= .03 + (st.step ? .018 * Math.sin(Math.PI * st.fr) : 0);   // Cuban: tief, kleines Federn auf Schrittbeats
    pel.y = hy;
    // Cuban Motion: Hüfte kippt zum Gewichtsbein (dort höher) und dreht leicht mit, Schultern gleichen aus
    const roll = ws * .09, twist = ws * .1;
    f.torso.position.copy(pel); f.torso.rotation.set(0, 0, 0); f.torso.rotateY(-b.rot);
    // Drehung um die Vorwärtsachse (+X): positiver Winkel senkt die rechte Seite → Gewicht rechts (ws > 0) braucht −roll
    f.pelvisMesh.rotation.set(-roll, twist, 0);
    f.chest.rotation.set(roll * .6, -twist * .5, 0);
    if (f.skirt) f.skirt.rotation.set(-roll, twist, 0);
    // Hüftgelenke (in Weltkoordinaten, mit Kipp)
    const hips = [-1, 1].map(s => pel.clone().add(right.clone().multiplyScalar(s * DIM.hipW)).add(new THREE.Vector3(0, s * roll * DIM.hipW, 0)));   // Hüfte des Gewichtsbeins höher
    for (let i = 0; i < 2; i++) {
      const hint = footDir[i].clone().multiplyScalar(1).add(right.clone().multiplyScalar((i ? 1 : -1) * .15)).add(new THREE.Vector3(0, .1, 0));
      const s = ik2(hips[i], ank[i], DIM.thigh, DIM.shin, hint);
      limb(f.thigh[i], hips[i], s.mid); limb(f.shin[i], s.mid, s.end);
      f.knee[i].position.copy(s.mid); f.hip[i].position.copy(hips[i]);
    }
    // Schultern (auf Rumpfhöhe, Gegenkipp zum Becken)
    const shY = pel.y + DIM.spine - .02;
    const sh = [-1, 1].map(s => pel.clone().setY(shY - s * roll * .1).add(right.clone().multiplyScalar(s * DIM.shW)));
    // Hände: Ziele aus der 2D-Simulation (Höhe z in Metern), sonst locker hängend
    const hz = st.hands && st.hands[d.id];
    ['l', 'r'].forEach((side, i) => {
      const s = i ? 1 : -1;
      let T = hz && hz[side] ? W(hz[side]).setY(hz[side].z) : sh[i].clone().add(fwd.clone().multiplyScalar(.1)).add(right.clone().multiplyScalar(s * .05)).setY(shY - .55);
      const hint = new THREE.Vector3(0, -1, 0).add(fwd.clone().multiplyScalar(-.35)).add(right.clone().multiplyScalar(s * .45));
      const r = ik2(sh[i], T, DIM.upper, DIM.fore, hint);
      limb(f.upper[i], sh[i], r.mid); limb(f.fore[i], r.mid, r.end);
      f.elbow[i].position.copy(r.mid); f.hand[i].position.copy(r.end); f.shoulder[i].position.copy(sh[i]);
    });
    f.label.visible = !!st.numbersOn; f.label.position.copy(pel).setY(pel.y + DIM.spine + DIM.neck + DIM.head * 2 + .2);
    f.label.material.opacity = dim;
    // Paarlinie auf dem Boden (vom Leader aus)
    if (d.role === 'L') {
      const p2 = st.bodies[d.partner]; if (p2 && li < st.N) { const A = W(b), B = W(p2); lines.setXYZ(li * 2, A.x, .004, A.z); lines.setXYZ(li * 2 + 1, B.x, .004, B.z); li++; }
    }
  }
  for (; li < st.N; li++) { lines.setXYZ(li * 2, 0, -1, 0); lines.setXYZ(li * 2 + 1, 0, -1, 0); }
  lines.needsUpdate = true;
  // Größe an die 2D-Bühne anpassen
  const w = glc.clientWidth, h = glc.clientHeight;
  if (w && h && (glc.width !== Math.round(w * renderer.getPixelRatio()) || glc.height !== Math.round(h * renderer.getPixelRatio()))) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  controls.update();
  renderer.render(scene, camera);
}

init();
window.Rueda3D = { ready: true, render, preset, setActive(v) { active = v; } };
window.dispatchEvent(new Event('rueda3d-ready'));
