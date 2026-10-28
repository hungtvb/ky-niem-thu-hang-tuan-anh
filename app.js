"use strict";
/* GALAXY — Thu Hằng × Tuấn Anh · 01.11
   Approved script: bare starfield + one pulsing pink star -> tap ignites it
   into a neon streak that handwrites the couple's names -> star dust gathers
   into a beating 3D heart -> FINALE in 4 beats: compress (silence) ->
   supernova -> fireworks volleys -> embers regroup into "01.11" -> word + photo rain
   -> rain gathers into the hero wedding photo -> letter in the calm zone.
   All timing absolute (headless-safe). */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), glCv = $("gl"), flashEl = $("flash");
  var letterEl = $("letter"), heroEl = $("hero"), muteBtn = $("mute"), music = $("music");

  function perfNow() { return performance.now() / 1000; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
  function easeOut(v) { v = clamp01(v); return 1 - Math.pow(1 - v, 3); }

  /* ================= timeline ================= */
  var IGNITE = 0.75;
  var T_WRITE_END = IGNITE + 6.2;          // write clock 6.2s (v17: faster, reveals scaled x0.85)
  var T_GATHER_END = T_WRITE_END + 3.4;
  var T_BEAT_END = T_GATHER_END + 4.6;     // auto-finale if nobody taps the heart (4 x 1.15s beats = 4 beat photos)
  // finale beats, seconds from finale start:
  var F_COMPRESS = 1.25;                    // [0, 1.25)
  var F_NOVA_END = F_COMPRESS + 1.25;       // [1.25, 2.5)
  var F_FIRE_START = 2.1, F_FIRE_END = 5.9; // volleys inside
  var F_REGROUP = 4.8;                      // embers start regrouping (v17: faster; formation needs 2.42s, rain at 7.6 leaves 2.8s)
  var F_RAIN = 7.6;                         // word rain + date dissolves
  var VOLLEYS = [2.1, 2.65, 3.2, 3.8, 4.4, 5.0];
  var PHASE_START = { ignite: 0, write: IGNITE, gather: T_WRITE_END, beat: T_GATHER_END };

  /* ================= three setup ================= */
  var renderer = new THREE.WebGLRenderer({ canvas: glCv, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x01020a, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  camera.position.set(0, 0, 58);
  var composer = null, bloomPass = null;
  try {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.55, 0.12);
    composer.addPass(bloomPass);
  } catch (e) { composer = null; }
  var world = new THREE.Group(); scene.add(world);
  var worldBase = 1, worldBoost = 1;

  function glowTexture(inner, outer) {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner); grad.addColorStop(0.35, outer); grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var dotTex = glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,.4)");

  /* ================= starfield + milky way ================= */
  var starLayers = [], starDim = 1;
  (function buildStars() {
    var defs = [
      { n: 900, size: 0.55, op: 0.75, sp: 0.9 },
      { n: 650, size: 0.85, op: 0.9, sp: 1.4 },
      { n: 260, size: 1.35, op: 1.0, sp: 2.1 }
    ];
    defs.forEach(function (d, li) {
      var pos = new Float32Array(d.n * 3), col = new Float32Array(d.n * 3);
      for (var i = 0; i < d.n; i++) {
        pos[i * 3] = (Math.random() * 2 - 1) * 95;
        pos[i * 3 + 1] = (Math.random() * 2 - 1) * 72;
        pos[i * 3 + 2] = -120 + Math.random() * 140;
        var t = Math.random();
        var c = t < 0.82 ? [1, 1, 1] : (t < 0.92 ? [0.78, 0.84, 1] : [1, 0.85, 0.92]);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      var mat = new THREE.PointsMaterial({
        size: d.size, map: dotTex, vertexColors: true, transparent: true, opacity: d.op,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      var pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      scene.add(pts);
      starLayers.push({ pts: pts, mat: mat, baseOp: d.op, sp: d.sp, ph: li * 2.1 });
    });
    // milky way: a soft diagonal band of faint dust far behind everything
    var n = 750, pos2 = new Float32Array(n * 3);
    for (var j = 0; j < n; j++) {
      var s = (Math.random() * 2 - 1) * 105;
      var spread = (Math.random() + Math.random() + Math.random() - 1.5) * 9;
      pos2[j * 3] = s;
      pos2[j * 3 + 1] = 0.32 * s + 10 + spread;
      pos2[j * 3 + 2] = -95 + Math.random() * 30;
    }
    var geo2 = new THREE.BufferGeometry();
    geo2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
    var mat2 = new THREE.PointsMaterial({
      size: 1.5, map: dotTex, color: 0x8fa8ff, transparent: true, opacity: 0.13,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var mw = new THREE.Points(geo2, mat2);
    mw.frustumCulled = false;
    scene.add(mw);
    starLayers.push({ pts: mw, mat: mat2, baseOp: 0.13, sp: 0.4, ph: 4.2 });
  })();

  /* ================= opening star (in-world tap indicator) ================= */
  var starSprite = null, starRings = [];
  (function buildStar() {
    var tex = glowTexture("rgba(255,255,255,1)", "rgba(255,111,165,.55)");
    starSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xffd7ea, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    starSprite.position.set(0, 1.2, 1);
    starSprite.scale.set(6, 6, 1);
    world.add(starSprite);
    var rc = document.createElement("canvas"); rc.width = rc.height = 256;
    var rg = rc.getContext("2d");
    rg.strokeStyle = "rgba(255,158,196,.95)"; rg.lineWidth = 4;
    rg.shadowColor = "rgba(255,111,165,.9)"; rg.shadowBlur = 10;
    rg.beginPath(); rg.arc(128, 128, 112, 0, Math.PI * 2); rg.stroke();
    var ringTex = new THREE.CanvasTexture(rc);
    for (var i = 0; i < 2; i++) {
      var rm = new THREE.SpriteMaterial({ map: ringTex, color: 0xff9ec4, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      var rs = new THREE.Sprite(rm);
      rs.position.copy(starSprite.position);
      world.add(rs); starRings.push(rs);
    }
  })();

  /* ================= neon handwriting ================= */
  var LINES = ["Thu Hằng", "&", "Tuấn Anh"];
  var LINE_Y = [11.4, 0.8, -10.0];
  var LINE_W = [27, 8, 27.5];
  var LINE_START = [0.25, 2.17, 3.70];
  var LINE_DUR = [1.70, 0.64, 1.74];
  var textPts = null, textUniforms = null, textPositions = [], textReveals = [];
  var comet = null, cometTrail1 = null, cometTrail2 = null, lastReveal = 0;
  function buildText() {
    var CW = 1200, CH = 300;
    var allPos = [], allRev = [], allSize = [];
    textPositions = []; textReveals = [];
    LINES.forEach(function (line, li) {
      var cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
      var g = cv.getContext("2d");
      g.font = "132px 'Great Vibes', cursive";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "#fff"; g.fillText(line, CW / 2, CH / 2);
      g.strokeStyle = "#fff"; g.lineWidth = 2.5;
      g.strokeText(line, CW / 2, CH / 2);
      var data = g.getImageData(0, 0, CW, CH).data;
      var raw = [];
      for (var y = 0; y < CH; y += 2) {
        for (var x = 0; x < CW; x += 2) {
          if (data[(y * CW + x) * 4 + 3] > 100) raw.push([x, y]);
        }
      }
      if (!raw.length) return;
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      raw.forEach(function (p) {
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
      });
      raw.sort(function (a, b) {
        var ca = Math.floor(a[0] / 6), cb = Math.floor(b[0] / 6);
        return ca !== cb ? ca - cb : a[1] - b[1];
      });
      var K = LINE_W[li] / Math.max(1, (maxX - minX));
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      raw.forEach(function (p, i) {
        var wx = (p[0] - cx) * K, wy = (cy - p[1]) * K + LINE_Y[li];
        allPos.push(wx, wy, 0);
        allRev.push(LINE_START[li] + (i / Math.max(1, raw.length)) * LINE_DUR[li]);
        allSize.push(0.21 + Math.random() * 0.12);
        textPositions.push(wx, wy, 0);
        textReveals.push(LINE_START[li] + (i / Math.max(1, raw.length)) * LINE_DUR[li]);
      });
    });
    lastReveal = 0;
    textReveals.forEach(function (r) { if (r > lastReveal) lastReveal = r; });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(allPos, 3));
    geo.setAttribute("aReveal", new THREE.Float32BufferAttribute(allRev, 1));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(allSize, 1));
    textUniforms = { uT: { value: -10 }, uFade: { value: 1 }, uScale: { value: 1000 }, uGroup: { value: 1 } };
    var mat = new THREE.ShaderMaterial({
      uniforms: textUniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: [
        "attribute float aReveal; attribute float aSize;",
        "uniform float uT; uniform float uScale; uniform float uGroup;",
        "varying float vOn; varying float vAge;",
        "void main(){",
        "  vOn = smoothstep(aReveal, aReveal + 0.28, uT);",
        "  vAge = clamp(uT - aReveal, 0.0, 10.0);",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  gl_PointSize = aSize * uGroup * uScale * (0.55 + 0.45 * vOn) / max(1.0, -mv.z);",
        "  gl_Position = projectionMatrix * mv;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uFade; uniform float uT;",
        "varying float vOn; varying float vAge;",
        "void main(){",
        "  float d = length(gl_PointCoord - vec2(0.5));",
        "  float m = smoothstep(0.5, 0.1, d);",
        "  vec3 hot = vec3(1.0, 0.97, 1.0);",
        "  vec3 pink = vec3(1.0, 0.38, 0.64);",
        "  vec3 col = mix(hot, pink, clamp(vAge / 1.15, 0.0, 1.0));",
        "  col *= 0.92 + 0.13 * sin(uT * 2.2 + vAge * 2.0);",
        "  gl_FragColor = vec4(col, m * vOn * uFade);",
        "}"
      ].join("\n")
    });
    textPts = new THREE.Points(geo, mat);
    textPts.frustumCulled = false; textPts.visible = false;
    world.add(textPts);
    var cometTex = glowTexture("rgba(255,255,255,1)", "rgba(255,111,165,.55)");
    function mkComet(scale, op) {
      var sm = new THREE.SpriteMaterial({ map: cometTex, color: 0xffe3f0, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
      var s = new THREE.Sprite(sm); s.scale.set(scale, scale, 1); s.visible = false; world.add(s); return s;
    }
    comet = mkComet(6.8, 0.95); cometTrail1 = mkComet(4.6, 0.5); cometTrail2 = mkComet(3.1, 0.3);
    buildRainTextures();
    fitWorld();
  }
  if (document.fonts && document.fonts.load) {
    var raced = Promise.race([
      document.fonts.load("132px 'Great Vibes'"),
      new Promise(function (r) { setTimeout(r, 2000); })
    ]);
    raced.then(function () { buildText(); });
    setTimeout(function () { if (!textPts) buildText(); }, 2600);
  } else buildText();
  function frontierIndex(t) {
    var lo = 0, hi = textReveals.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (textReveals[mid] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }

  /* ================= heart — classic curve, puffy volume ================= */
  var heartPts = null, heartHome = null, heartStart = null, heartStag = null;
  var heartBurstVel = null, heartColHome = null;
  (function buildHeart() {
    var SEG = 240, poly = [];
    for (var si = 0; si < SEG; si++) {
      var t = si / SEG * Math.PI * 2, s3 = Math.sin(t);
      poly.push([
        16 * s3 * s3 * s3,
        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      ]);
    }
    function inPoly(x, y) {
      var inside = false;
      for (var i = 0, j = SEG - 1; i < SEG; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    }
    function distEdge(x, y) {
      var best = 1e9;
      for (var i = 0, j = SEG - 1; i < SEG; j = i++) {
        var ax = poly[j][0], ay = poly[j][1], bx = poly[i][0], by = poly[i][1];
        var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
        var u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
        var ex = ax + u * dx - x, ey = ay + u * dy - y, d2 = ex * ex + ey * ey;
        if (d2 < best) best = d2;
      }
      return Math.sqrt(best);
    }
    var HS = 0.8, YOFF = 2.55;
    var pos = [], col = [];
    var pink = new THREE.Color("#ff5c9e"), light = new THREE.Color("#ffc4dd"), white = new THREE.Color("#fff0f6");
    var guard = 0;
    while (pos.length / 3 < 2400 && guard < 300000) {
      guard++;
      var x = (Math.random() * 2 - 1) * 16.5, y = -17.5 + Math.random() * 30;
      if (!inPoly(x, y)) continue;
      var d = distEdge(x, y);
      if (d > 0.85 && Math.random() < 0.45) continue;
      var zHalf = 2.7 * Math.sqrt(Math.min(1, d / 6.0));
      var z = (Math.random() * 2 - 1) * zHalf;
      pos.push(x * HS, (y + YOFF) * HS, z);
      var c = Math.random() < 0.12 ? white : (Math.random() < 0.55 ? pink : light);
      col.push(c.r, c.g, c.b);
    }
    var n = pos.length / 3;
    heartHome = new Float32Array(pos);
    heartColHome = new Float32Array(col);
    heartStart = new Float32Array(n * 3);
    heartStag = new Float32Array(n);
    heartBurstVel = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), R = 75 + Math.random() * 85;
      heartStart[i * 3] = R * Math.sin(ph) * Math.cos(th);
      heartStart[i * 3 + 1] = R * Math.cos(ph) * 0.8;
      heartStart[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th) - 55;
      heartStag[i] = Math.random() * 0.9;
      // supernova velocities: radial from heart centre, z damped
      var vx = heartHome[i * 3], vy = heartHome[i * 3 + 1], vz = heartHome[i * 3 + 2];
      var len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1, sp = 30 + Math.random() * 30;
      heartBurstVel[i * 3] = vx / len * sp;
      heartBurstVel[i * 3 + 1] = vy / len * sp;
      heartBurstVel[i * 3 + 2] = vz / len * sp * 0.35 + 5;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos.slice(), 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.8, map: dotTex, vertexColors: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    heartPts = new THREE.Points(geo, mat);
    heartPts.frustumCulled = false; heartPts.visible = false;
    world.add(heartPts);
  })();
  function beatPulse(t) {
    var cyc = t % 1.15, p = 0;
    if (cyc < 0.14) p = Math.sin(cyc / 0.14 * Math.PI);
    else if (cyc > 0.24 && cyc < 0.36) p = 0.65 * Math.sin((cyc - 0.24) / 0.12 * Math.PI);
    return p;
  }
  function setHeartPos(fn) {
    var arr = heartPts.geometry.attributes.position.array;
    for (var i = 0; i < arr.length; i += 3) fn(i, arr);
    heartPts.geometry.attributes.position.needsUpdate = true;
  }
  /* ================= beat photos: one portrait per heartbeat =================
     4 portrait photos Tony sent 2026-10-28 (second batch, in his order).
     During the beat phase a large portrait sits behind the particle heart
     and changes on every 1.15s heartbeat cycle, so all 4 are seen across
     the 4.6s beat phase. Same framed-canvas texture + bloom-darkened colour
     as the rain photos, so bright backgrounds do not blow out. */
  var BEAT_PHOTOS = [
    { src: "assets/photos/beat-01.jpg", ar: 0.72 },
    { src: "assets/photos/beat-02.jpg", ar: 0.72 },
    { src: "assets/photos/beat-03.jpg", ar: 0.72 },
    { src: "assets/photos/beat-04.jpg", ar: 0.72 }
  ];
  var beatPhoto = null, beatPhotoTex = [], beatPhotoIdx = -1, beatPhotoLoadedFlags = [];
  (function buildBeatPhoto() {
    BEAT_PHOTOS.forEach(function (p, pi) {
      var cw = Math.round(720 * p.ar), ch = 720;
      var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
      var tex = new THREE.CanvasTexture(cv);
      beatPhotoTex.push(tex);
      beatPhotoLoadedFlags.push(false);
      var img = new Image();
      img.onload = function () {
        beatPhotoLoadedFlags[pi] = true;
        var g = cv.getContext("2d");
        var r = Math.round(Math.min(cw, ch) * 0.04);
        g.save(); roundRectPath(g, 0, 0, cw, ch, r); g.clip();
        g.drawImage(img, 0, 0, cw, ch);
        g.lineWidth = Math.max(8, Math.round(Math.min(cw, ch) * 0.02));
        g.strokeStyle = "rgba(255,158,196,0.95)"; g.stroke(); g.restore();
        tex.needsUpdate = true;
      };
      img.src = p.src;
    });
    var m = new THREE.SpriteMaterial({ map: beatPhotoTex[0], color: 0x8f8f8f, transparent: true, opacity: 0, depthWrite: false });
    beatPhoto = new THREE.Sprite(m);
    beatPhoto.position.set(0, 0, -8);
    beatPhoto.scale.set(30 * 0.72, 30, 1);
    beatPhoto.visible = false;
    world.add(beatPhoto);
  })();
  function setHeartColors(k) { // k: 0 = home colours, 1 = white-hot
    var arr = heartPts.geometry.attributes.color.array;
    for (var i = 0; i < arr.length; i++) {
      arr[i] = heartColHome[i] + (1 - heartColHome[i]) * k;
    }
    heartPts.geometry.attributes.color.needsUpdate = true;
  }

  /* ================= shockwave ring ================= */
  var ring = null;
  (function buildRing() {
    var geo = new THREE.RingGeometry(0.94, 1.0, 72);
    var mat = new THREE.MeshBasicMaterial({
      color: 0xffd7ea, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    ring = new THREE.Mesh(geo, mat);
    ring.position.set(0, 0, 3);
    ring.visible = false;
    world.add(ring);
  })();

  /* ================= fireworks volleys ================= */
  var volleys = []; // {pts, vel, age, life}
  var FW_COLORS = [0xff5c9e, 0xffd166, 0xffffff, 0xffc4dd, 0xc39bff, 0xff9ec4];
  var FW_POS = [
    [-13, 9, -10], [12, 13, -14], [-4, 17, -8], [16, 4, -16], [-17, 2, -12], [3, 11, -6]
  ];
  function spawnVolley(idx) {
    var p = FW_POS[idx % FW_POS.length];
    var n = 240, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      var th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
      var sp = 8 + Math.pow(Math.random(), 0.6) * 19;
      vel[i * 3] = sp * Math.sin(ph) * Math.cos(th);
      vel[i * 3 + 1] = sp * Math.cos(ph);
      vel[i * 3 + 2] = sp * Math.sin(ph) * Math.sin(th) * 0.4;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.85, map: dotTex, color: FW_COLORS[idx % FW_COLORS.length], transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    world.add(pts);
    volleys.push({ pts: pts, vel: vel, age: 0, life: 2.6 });
    if (idx === 0 || idx === 2) { if (navigator.vibrate) navigator.vibrate(idx === 0 ? 35 : 20); }
  }
  function updateVolleys(dt) {
    for (var vi = volleys.length - 1; vi >= 0; vi--) {
      var v = volleys[vi];
      v.age += dt;
      var arr = v.pts.geometry.attributes.position.array;
      var drag = Math.max(0, 1 - 0.55 * dt);
      for (var i = 0; i < arr.length; i += 3) {
        v.vel[i] *= drag; v.vel[i + 2] *= drag;
        v.vel[i + 1] = v.vel[i + 1] * drag - 3.2 * dt;
        arr[i] += v.vel[i] * dt;
        arr[i + 1] += v.vel[i + 1] * dt;
        arr[i + 2] += v.vel[i + 2] * dt;
      }
      v.pts.geometry.attributes.position.needsUpdate = true;
      v.pts.material.opacity = clamp01(1 - v.age / v.life);
      if (v.age >= v.life) {
        world.remove(v.pts);
        v.pts.geometry.dispose(); v.pts.material.dispose();
        volleys.splice(vi, 1);
      }
    }
  }

  /* ================= "01.11" formed from embers ================= */
  var datePts = null, dateTarget = null, dateStart = null, dateStag = null;
  (function buildDate() {
    var cv = document.createElement("canvas"); cv.width = 1000; cv.height = 260;
    var g = cv.getContext("2d");
    g.font = "900 205px Arial, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#fff"; g.fillText("01.11", 500, 138);
    var data = g.getImageData(0, 0, 1000, 260).data;
    var raw = [];
    for (var y = 0; y < 260; y += 3) {
      for (var x = 0; x < 1000; x += 3) {
        if (data[(y * 1000 + x) * 4 + 3] > 100) raw.push([x, y]);
      }
    }
    var n = raw.length;
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    dateTarget = new Float32Array(n * 3);
    dateStart = new Float32Array(n * 3);
    dateStag = new Float32Array(n);
    var gold = new THREE.Color("#ffd166"), white = new THREE.Color("#fff6ec"), pink = new THREE.Color("#ff9ec4");
    var W2 = 31; // world width of the date
    var K = W2 / 1000;
    for (var i = 0; i < n; i++) {
      dateTarget[i * 3] = (raw[i][0] - 500) * K;
      dateTarget[i * 3 + 1] = (130 - raw[i][1]) * K + 1.5;
      dateTarget[i * 3 + 2] = (Math.random() * 2 - 1) * 0.7;
      var th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), R = 26 + Math.random() * 38;
      dateStart[i * 3] = R * Math.sin(ph) * Math.cos(th);
      dateStart[i * 3 + 1] = R * Math.cos(ph) * 0.75;
      dateStart[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th) * 0.5 - 8;
      dateStag[i] = Math.random() * 0.9;
      var c = Math.random() < 0.55 ? gold : (Math.random() < 0.6 ? white : pink);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      pos[i * 3] = dateStart[i * 3]; pos[i * 3 + 1] = dateStart[i * 3 + 1]; pos[i * 3 + 2] = dateStart[i * 3 + 2];
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.72, map: dotTex, vertexColors: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    datePts = new THREE.Points(geo, mat);
    datePts.frustumCulled = false; datePts.visible = false;
    world.add(datePts);
  })();

  /* ================= pink dust ================= */
  var dustPts = null;
  (function buildDust() {
    var n = 320, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * 30;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * 30;
      pos[i * 3 + 2] = -30 + Math.random() * 40;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.5, map: dotTex, color: 0xff9ec4, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    dustPts = new THREE.Points(geo, mat);
    dustPts.frustumCulled = false; dustPts.visible = false;
    world.add(dustPts);
  })();

  /* ================= word + photo rain 3D (finale) ================= */
  var PHRASES = ["Thu Hằng × Tuấn Anh", "Giữa triệu người", "Tìm thấy nhau là duyên",
    "Giữ nhau là phúc", "Bên nhau là nhà", "Mãi bên nhau", "Ngọt ngào như năm đầu tiên",
    "Mừng kỷ niệm ngày cưới", "01.11", "Happy Anniversary"];
  /* 11 rain photos in the order Tony sent them. Aspect ratios measured
     from the files on disk (not guessed): landscape ~1.4-1.5, portrait
     0.56-0.75. Sprites keep their own ratio, never stretched.
     photo-01..09: first batch 2026-10-28. photo-10..11: the 2 landscape
     photos from the second batch 2026-10-28 (the 4 portraits from that
     batch became the beat photos instead). */
  var PHOTOS = [
    { src: "assets/photos/photo-01.jpg", ar: 1.40 },
    { src: "assets/photos/photo-02.jpg", ar: 1.40 },
    { src: "assets/photos/photo-03.jpg", ar: 1.40 },
    { src: "assets/photos/photo-04.jpg", ar: 1.40 },
    { src: "assets/photos/photo-05.jpg", ar: 1.50 },
    { src: "assets/photos/photo-06.jpg", ar: 0.56 },
    { src: "assets/photos/photo-07.jpg", ar: 0.75 },
    { src: "assets/photos/photo-08.jpg", ar: 0.75 },
    { src: "assets/photos/photo-09.jpg", ar: 0.75 },
    { src: "assets/photos/photo-10.jpg", ar: 1.38 },
    { src: "assets/photos/photo-11.jpg", ar: 1.38 }
  ];
  function roundRectPath(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  /* Draw a photo into a framed canvas texture once it loads. The canvas
     starts transparent, so a not-yet-loaded photo is invisible (not a white
     quad) and simply fades in with the rain once its texture uploads. */
  function loadPhotoFrame(s, src) {
    var img = new Image();
    img.onload = function () {
      var cv = s.material.map.image, g = cv.getContext("2d");
      var W = cv.width, H = cv.height, r = Math.round(Math.min(W, H) * 0.055);
      g.save();
      roundRectPath(g, 0, 0, W, H, r);
      g.clip();
      g.drawImage(img, 0, 0, W, H);
      g.lineWidth = Math.max(10, Math.round(Math.min(W, H) * 0.022));
      g.strokeStyle = "rgba(255,158,196,0.95)";
      g.stroke();
      g.restore();
      s.material.map.needsUpdate = true;
      s.userData.loaded = true;
    };
    img.src = src;
  }
  var TINTS = [0xffffff, 0xffd7ea, 0xff9ec4, 0xffc4dd, 0xffe3f0];
  var rainSprites = [], rainBuilt = false;
  function buildRainTextures() {
    if (rainBuilt) return;
    rainBuilt = true;
    var wordTextures = PHRASES.map(function (p) {
      var cv = document.createElement("canvas"); cv.width = 900; cv.height = 200;
      var g = cv.getContext("2d");
      var fs = 96; g.font = fs + "px 'Great Vibes', cursive";
      while (g.measureText(p).width > 850 && fs > 40) { fs -= 6; g.font = fs + "px 'Great Vibes', cursive"; }
      g.textAlign = "center"; g.textBaseline = "middle";
      g.shadowColor = "rgba(255,77,141,.95)"; g.shadowBlur = 18;
      g.fillStyle = "#fff0f6";
      g.fillText(p, 450, 104); g.fillText(p, 450, 104);
      return new THREE.CanvasTexture(cv);
    });
    for (var i = 0; i < 30; i++) {
      var ti = Math.floor(Math.random() * PHRASES.length);
      var m = new THREE.SpriteMaterial({
        map: wordTextures[ti], color: TINTS[Math.floor(Math.random() * TINTS.length)],
        transparent: true, opacity: 0, depthWrite: false
      });
      var s = new THREE.Sprite(m);
      var wdt = 6.5 + PHRASES[ti].length * 0.42;
      s.scale.set(wdt, wdt * 0.222, 1);
      s.userData = { speed: 0, swayPh: Math.random() * Math.PI * 2, baseOp: 0.8, ti: ti,
        baseSx: wdt, baseSy: wdt * 0.222 };
      respawnWord(s, true);
      s.visible = false;
      world.add(s); rainSprites.push(s);
    }
    /* Photo sprites share the same fall / sway / anti-overlap loop as the
       words, so photos and words rain together instead of in two layers.
       One sprite per photo (9 total, no repeats in a single rain pass). */
    PHOTOS.forEach(function (p) {
      var cw = p.ar >= 1 ? 720 : Math.round(720 * p.ar);
      var ch = p.ar >= 1 ? Math.round(720 / p.ar) : 720;
      var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
      var tex = new THREE.CanvasTexture(cv);
      /* Bloom threshold is 0.12, so a full-bright photo blows out white.
         Darken the sprite colour so photos sit under the bloom and keep
         their own colours instead of glowing to white. */
      var m = new THREE.SpriteMaterial({
        map: tex, color: 0x8f8f8f, transparent: true, opacity: 0, depthWrite: false
      });
      var s = new THREE.Sprite(m);
      var hgt = p.ar >= 1 ? 9.2 : 12.0; // v17: rain photos ~35% larger, per Tony
      s.scale.set(hgt * p.ar, hgt, 1);
      s.userData = { speed: 0, swayPh: Math.random() * Math.PI * 2, baseOp: 0.95,
        kind: "photo", loaded: false, baseSx: hgt * p.ar, baseSy: hgt };
      loadPhotoFrame(s, p.src);
      respawnWord(s, true);
      s.visible = false;
      world.add(s); rainSprites.push(s);
    });
  }
  function respawnWord(s, anywhere) {
    var best = null;
    for (var a = 0; a < 7; a++) {
      var z = -36 + Math.pow(Math.random(), 1.35) * 44;
      var cand = {
        x: (Math.random() * 2 - 1) * 18,
        y: anywhere ? -28 + Math.random() * 58 : 33,
        z: z, d: (z + 36) / 44
      };
      var ok = true;
      for (var j = 0; j < rainSprites.length; j++) {
        var o = rainSprites[j];
        if (o === s) continue;
        if (Math.abs(o.position.x - cand.x) < 7.5 && Math.abs(o.position.y - cand.y) < 6) { ok = false; break; }
      }
      best = cand;
      if (ok) break;
    }
    s.position.set(best.x, best.y, best.z);
    s.userData.speed = 2.0 + best.d * 4.2;
    s.userData.baseOp = 0.45 + best.d * 0.55;
  }

  /* ================= sizing / fit ================= */
  function fitWorld() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    var visH = 2 * 58 * tanH, visW = visH * camera.aspect;
    worldBase = Math.min(1.12, visW * 0.95 / 33.5, visH * 0.94 / 31);
    world.scale.setScalar(worldBase * worldBoost);
    if (textUniforms) {
      textUniforms.uGroup.value = worldBase;
      textUniforms.uScale.value = renderer.domElement.height / (2 * tanH);
    }
  }
  window.addEventListener("resize", fitWorld);

  /* ================= flow ================= */
  var started = false, filmStart = 0, finaleStart = -1, letterShown = false, heroShown = false;
  /* Rain runs this long, then every word + photo is pulled to the centre
     and shrinks away while the hero wedding photo scales in. */
  var HERO_AT = 12, GATHER_DUR = 1.8;
  var burstPos = null, burstVel = null, burstLive = false;
  var volleySpawned = VOLLEYS.map(function () { return false; });
  var dateFormK = 0;
  function currentPhase(now) {
    if (!started) return "intro";
    if (finaleStart > 0) {
      var f = now - finaleStart;
      if (f < F_COMPRESS) return "compress";
      if (f < F_NOVA_END) return "nova";
      if (f < F_REGROUP) return "fire";
      if (f < F_RAIN) return "regroup";
      return "rain";
    }
    var ft = now - filmStart;
    if (ft < IGNITE) return "ignite";
    if (ft < T_WRITE_END) return "write";
    if (ft < T_GATHER_END) return "gather";
    return "beat";
  }
  function start() {
    if (started) return;
    started = true; filmStart = perfNow();
    music.volume = 0.85;
    var pr = music.play(); if (pr && pr.catch) pr.catch(function () {});
    muteBtn.classList.remove("hidden");
    if (navigator.vibrate) navigator.vibrate(30);
  }
  function startFinale() {
    if (!started || finaleStart > 0) return;
    finaleStart = perfNow();
    // snapshot: the compressed heart becomes the burst source
    var n = heartHome.length;
    burstPos = new Float32Array(n); burstVel = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      burstPos[i] = heartHome[i] * 0.58;
      burstVel[i] = heartBurstVel[i];
    }
    burstLive = true;
    heartPts.rotation.y = 0;
    if (navigator.vibrate) navigator.vibrate(25);
  }
  /* tap = start / trigger finale; drag on the heart = rotate it */
  var pDown = null, dragRotY = 0;
  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest("#mute") || e.target.closest("#letter")) return;
    if (!started) { start(); return; }
    if (finaleStart < 0 && currentPhase(perfNow()) === "beat") {
      pDown = { x: e.clientX, y: e.clientY, t: perfNow(), moved: false };
    }
  });
  window.addEventListener("pointermove", function (e) {
    if (!pDown) return;
    var dx = e.clientX - pDown.x;
    if (Math.abs(dx) + Math.abs(e.clientY - pDown.y) > 10) pDown.moved = true;
    if (pDown.moved) { dragRotY += dx * 0.008; pDown.x = e.clientX; pDown.y = e.clientY; }
  });
  window.addEventListener("pointerup", function () {
    if (!pDown) return;
    if (!pDown.moved && perfNow() - pDown.t < 0.4) startFinale();
    pDown = null;
  });
  $("replay").addEventListener("click", function () { location.reload(); });
  muteBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    music.muted = !music.muted;
    muteBtn.classList.toggle("off", music.muted);
  });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  /* ================= main loop ================= */
  var lastFrame = perfNow();
  function loop() {
    requestAnimationFrame(loop);
    var now = perfNow(), dt = Math.min(0.05, now - lastFrame); lastFrame = now;
    var phase = currentPhase(now);
    var ft = started ? now - filmStart : -1;
    var f = finaleStart > 0 ? now - finaleStart : -1;

    if (started && finaleStart < 0 && ft >= T_BEAT_END) startFinale();

    // star twinkle + slow drift; global dim for the silence beat
    var dimTarget = phase === "compress" ? 0.35 : 1;
    starDim += (dimTarget - starDim) * Math.min(1, dt * 3);
    starLayers.forEach(function (L, i) {
      L.mat.opacity = L.baseOp * starDim * (0.78 + 0.22 * Math.sin(now * L.sp + L.ph));
      L.pts.rotation.y = now * 0.004 * (i + 1);
    });
    camera.position.x = Math.sin(now * 0.07) * 1.5;
    camera.position.y = Math.cos(now * 0.09) * 1.0;
    camera.lookAt(0, 0, 0);
    /* Rain photos burn out under full bloom (threshold 0.12, strength 0.9):
       pale backgrounds glow to white. Drop bloom during rain so photos
       keep their colours; words still read from their own canvas glow. */
    if (bloomPass) bloomPass.strength = phase === "compress" ? 0.55 : (phase === "rain" || phase === "beat" ? 0.3 : 0.9);
    var boostTarget = phase === "compress" ? 1.07 : 1;
    worldBoost += (boostTarget - worldBoost) * Math.min(1, dt * 2.5);
    world.scale.setScalar(worldBase * worldBoost);

    // ---- opening star ----
    if (!started) {
      starSprite.visible = true;
      var bs = 5.8 + 1.0 * Math.sin(now * 3.0);
      starSprite.scale.set(bs, bs, 1);
      starRings.forEach(function (rs, ri) {
        var cyc = ((now * 0.55 + ri * 0.5) % 1);
        var sc = 6 + cyc * 13;
        rs.visible = true; rs.scale.set(sc, sc, 1);
        rs.material.opacity = 0.8 * (1 - cyc);
      });
    } else if (phase === "ignite") {
      var k = smooth(ft / IGNITE);
      var tx = textPositions.length ? textPositions[0] : -10;
      var ty = textPositions.length ? textPositions[1] : LINE_Y[0];
      starSprite.visible = true;
      starSprite.position.set(0 + (tx - 0) * k, 1.2 + (ty - 1.2) * k, 1 - 0.5 * k);
      var ss = 6 + 2.2 * k;
      starSprite.scale.set(ss, ss, 1);
      starRings.forEach(function (rs) { rs.visible = false; });
    } else {
      starSprite.visible = false;
      starRings.forEach(function (rs) { rs.visible = false; });
    }

    // ---- handwriting + comet ----
    if (textPts) {
      textPts.visible = started && (phase === "write" || phase === "gather");
      if (started) {
        var wt = ft - IGNITE;
        textUniforms.uT.value = wt;
        var fade = 1;
        if (phase === "gather") fade = 1 - clamp01((ft - T_WRITE_END) / 0.8);
        textUniforms.uFade.value = fade;
        var fi = (phase === "write") ? frontierIndex(wt) : -1;
        [[comet, fi], [cometTrail1, fi - 90], [cometTrail2, fi - 200]].forEach(function (pair) {
          var spr = pair[0], idx = pair[1];
          if (!spr) return;
          if (idx >= 0 && wt < lastReveal + 0.05) {
            spr.visible = true;
            spr.position.set(textPositions[idx * 3], textPositions[idx * 3 + 1], 0.5);
          } else spr.visible = false;
        });
        if (comet) comet.material.opacity = 0.85 + 0.15 * Math.sin(now * 22);
      }
    }

    // ---- heart: gather / beat / compress / burst ----
    var inFinale = finaleStart > 0;
    var hVis = started && !inFinale && (phase === "gather" || phase === "beat");
    if (beatPhoto && phase !== "beat") beatPhoto.visible = false;
    var burstVis = inFinale && (phase === "compress" || phase === "nova" || phase === "fire");
    heartPts.visible = hVis || burstVis;
    if (phase === "gather") {
      var gt = ft - T_WRITE_END, gg = smooth(gt / 3.4);
      setHeartPos(function (i, arr) {
        var p = i / 3, k2 = smooth((gt - heartStag[p]) / 2.5);
        arr[i] = heartStart[i] + (heartHome[i] - heartStart[i]) * k2;
        arr[i + 1] = heartStart[i + 1] + (heartHome[i + 1] - heartStart[i + 1]) * k2;
        arr[i + 2] = heartStart[i + 2] + (heartHome[i + 2] - heartStart[i + 2]) * k2;
      });
      heartPts.material.opacity = clamp01(gt * 1.6);
      heartPts.material.size = 0.8;
      heartPts.position.z = -16 * (1 - gg);
      heartPts.scale.setScalar(0.82 + 0.18 * gg);
      heartPts.rotation.y = 0.12 * Math.sin(gt * 0.8);
    } else if (phase === "beat") {
      var bt = ft - T_GATHER_END;
      setHeartPos(function (i, arr) { arr[i] = heartHome[i]; arr[i + 1] = heartHome[i + 1]; arr[i + 2] = heartHome[i + 2]; });
      heartPts.material.opacity = 1;
      heartPts.position.z = 0;
      heartPts.scale.setScalar(1 + 0.085 * beatPulse(bt));
      heartPts.rotation.y = dragRotY + (pDown ? 0 : 0.15 * Math.sin(bt * 0.7));
      if (beatPhoto) {
        var bi = Math.floor(bt / 1.15) % BEAT_PHOTOS.length;
        if (bi !== beatPhotoIdx) { beatPhotoIdx = bi; beatPhoto.material.map = beatPhotoTex[bi]; beatPhoto.material.map.needsUpdate = true; }
        beatPhoto.visible = true;
        beatPhoto.material.opacity = 0.95 * clamp01(bt / 0.4);
        var bp = 1 + 0.04 * beatPulse(bt);
        beatPhoto.scale.set(30 * 0.72 * bp, 30 * bp, 1);
      }
    } else if (phase === "compress") {
      var ck = smooth(f / F_COMPRESS);
      var amp = 0.5 * ck * ck;
      setHeartPos(function (i, arr) {
        arr[i] = heartHome[i] + (Math.random() * 2 - 1) * amp;
        arr[i + 1] = heartHome[i + 1] + (Math.random() * 2 - 1) * amp;
        arr[i + 2] = heartHome[i + 2] + (Math.random() * 2 - 1) * amp;
      });
      setHeartColors(ck * 0.8);
      heartPts.material.opacity = 1;
      heartPts.scale.setScalar(1 - 0.42 * ck);
      heartPts.position.z = 0;
    } else if (phase === "nova" || phase === "fire") {
      if (burstLive) {
        var arr2 = heartPts.geometry.attributes.position.array;
        for (var bi = 0; bi < arr2.length; bi += 3) {
          burstVel[bi] *= (1 - 0.7 * dt); burstVel[bi + 2] *= (1 - 0.7 * dt);
          burstVel[bi + 1] = burstVel[bi + 1] * (1 - 0.7 * dt) - 1.1 * dt;
          burstPos[bi] += burstVel[bi] * dt;
          burstPos[bi + 1] += burstVel[bi + 1] * dt;
          burstPos[bi + 2] += burstVel[bi + 2] * dt;
          arr2[bi] = burstPos[bi]; arr2[bi + 1] = burstPos[bi + 1]; arr2[bi + 2] = burstPos[bi + 2];
        }
        heartPts.geometry.attributes.position.needsUpdate = true;
      }
      heartPts.scale.setScalar(1);
      if (phase === "nova") {
        var nk = clamp01((f - F_COMPRESS) / (F_NOVA_END - F_COMPRESS));
        heartPts.material.size = 0.8 + 0.45 * easeOut(nk);
        heartPts.material.opacity = 1;
      } else {
        heartPts.material.size = 0.8;
        heartPts.material.opacity = 1 - smooth((f - F_FIRE_START) / (F_REGROUP - F_FIRE_START));
      }
    }

    // ---- flash + shockwave ----
    if (phase === "nova") {
      var nk2 = clamp01((f - F_COMPRESS) / (F_NOVA_END - F_COMPRESS));
      flashEl.style.opacity = String(0.95 * Math.pow(1 - nk2, 1.5));
    } else if (phase === "fire" && f < F_FIRE_START + 0.4) {
      flashEl.style.opacity = String(0.3 * (1 - (f - F_FIRE_START) / 0.4));
    } else flashEl.style.opacity = "0";
    if (inFinale && f >= F_COMPRESS && f < F_COMPRESS + 2.0) {
      var rk = clamp01((f - F_COMPRESS) / 2.0);
      ring.visible = true;
      var rs2 = 2 + easeOut(rk) * 95;
      ring.scale.set(rs2, rs2, 1);
      ring.material.opacity = 0.85 * Math.pow(1 - rk, 2);
    } else ring.visible = false;

    // ---- fireworks ----
    if (inFinale) {
      for (var vi2 = 0; vi2 < VOLLEYS.length; vi2++) {
        if (!volleySpawned[vi2] && f >= VOLLEYS[vi2]) { volleySpawned[vi2] = true; spawnVolley(vi2); }
      }
    }
    if (volleys.length) updateVolleys(dt);

    // ---- date regroup / dissolve ----
    if (inFinale && f >= F_REGROUP - 0.4) {
      datePts.visible = true;
      var rt2 = f - F_REGROUP;
      var arr3 = datePts.geometry.attributes.position.array;
      var formed = 0;
      for (var di = 0; di < arr3.length; di += 3) {
        var p3 = di / 3;
        var kk = smooth((rt2 - dateStag[p3] * 0.8) / 1.7);
        if (kk >= 1) formed++;
        var yOff = 0;
        if (phase === "rain") yOff = -Math.max(0, f - F_RAIN) * 2.4;
        arr3[di] = dateStart[di] + (dateTarget[di] - dateStart[di]) * kk;
        arr3[di + 1] = dateStart[di + 1] + (dateTarget[di + 1] - dateStart[di + 1]) * kk + yOff;
        arr3[di + 2] = dateStart[di + 2] + (dateTarget[di + 2] - dateStart[di + 2]) * kk;
      }
      datePts.geometry.attributes.position.needsUpdate = true;
      dateFormK = formed / (arr3.length / 3);
      datePts.scale.setScalar(1 + 0.02 * Math.sin(now * 2));
      if (phase === "rain") {
        datePts.material.opacity = 0.95 * (1 - clamp01((f - F_RAIN) / 1.6));
        if (f - F_RAIN > 1.7) datePts.visible = false;
      } else {
        datePts.material.opacity = 0.95 * clamp01(rt2 / 0.8);
      }
    } else datePts.visible = false;

    // ---- dust + word/photo rain -> gather into hero -> letter ----
    var rainOn = phase === "rain";
    dustPts.visible = rainOn;
    if (rainOn) {
      var rt = f - F_RAIN;
      dustPts.rotation.y = now * 0.02;
      var ramp = clamp01(rt / 1.6);
      if (rt < HERO_AT) {
        dustPts.material.opacity = 0.5 * ramp;
        rainSprites.forEach(function (s) {
          s.visible = true;
          s.scale.set(s.userData.baseSx, s.userData.baseSy, 1);
          s.position.y -= s.userData.speed * dt * (0.4 + 0.6 * ramp);
          s.position.x += Math.sin(now * 0.7 + s.userData.swayPh) * dt * 0.7;
          if (s.position.y < -32) respawnWord(s, false);
          s.material.opacity = s.userData.baseOp * ramp;
        });
        for (var a = 0; a < rainSprites.length; a++) {
          for (var b = a + 1; b < rainSprites.length; b++) {
            var A = rainSprites[a], B = rainSprites[b];
            var dx = Math.abs(A.position.x - B.position.x);
            var dy = A.position.y - B.position.y;
            var needX = (A.scale.x + B.scale.x) * 0.36;
            if (dx < needX && Math.abs(dy) < 2.7) {
              var push = (2.7 - Math.abs(dy)) * 0.9 * Math.min(1, dt * 10) * (dy >= 0 ? 1 : -1);
              A.position.y += push; B.position.y -= push;
            }
          }
        }
      } else {
        /* Gather: words + photos fly to the centre and shrink away while
           the hero wedding photo scales in. The letter waits until the
           hero is fully in place, then the hero settles up out of its way. */
        var gk = clamp01((rt - HERO_AT) / GATHER_DUR);
        if (!heroShown) { heroShown = true; heroEl.classList.add("show"); }
        dustPts.material.opacity = 0.5 * (1 - gk);
        var pull = Math.min(1, dt * 3);
        rainSprites.forEach(function (s) {
          s.visible = gk < 1;
          s.position.x += (0 - s.position.x) * pull;
          s.position.y += (0 - s.position.y) * pull;
          var sc = 1 - gk;
          s.scale.set(s.userData.baseSx * sc, s.userData.baseSy * sc, 1);
          s.material.opacity = s.userData.baseOp * sc;
        });
        if (rt > HERO_AT + GATHER_DUR + 1.0 && !letterShown) {
          letterShown = true;
          letterEl.classList.add("show");
        }
      }
    } else {
      rainSprites.forEach(function (s) { s.visible = false; });
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  fitWorld();
  requestAnimationFrame(loop);

  window.__galaxy = {
    get phase() { return currentPhase(perfNow()); },
    start: start,
    startFinale: startFinale,
    skipTo: function (name) {
      if (!started) start();
      if (name === "compress" || name === "nova" || name === "fire" || name === "regroup" || name === "rain") {
        if (finaleStart < 0) startFinale();
        var off = { compress: 0.15, nova: F_COMPRESS + 0.25, fire: F_FIRE_START + 0.9, regroup: F_REGROUP + 2.4, rain: F_RAIN + 1.2 }[name];
        finaleStart = perfNow() - off;
        if (name === "regroup" || name === "rain") {
          for (var i = 0; i < VOLLEYS.length; i++) volleySpawned[i] = true;
        }
        return;
      }
      filmStart = perfNow() - (PHASE_START[name] || 0) - 0.05;
    },
    textRevealed: function () {
      var wt = started ? perfNow() - filmStart - IGNITE : 0, n = 0;
      for (var i = 0; i < textReveals.length; i++) if (textReveals[i] <= wt) n++;
      return textReveals.length ? n / textReveals.length : 0;
    },
    textTotal: function () { return textReveals.length; },
    rainVisible: function () { var n = 0; rainSprites.forEach(function (s) { if (s.visible && s.material.opacity > 0.25) n++; }); return n; },
    beatPhotoIndex: function () { return beatPhotoIdx; },
    beatPhotoTotal: function () { return BEAT_PHOTOS.length; },
    beatPhotoVisible: function () { return !!(beatPhoto && beatPhoto.visible && beatPhoto.material.opacity > 0.25); },
    beatPhotoLoaded: function () { var n = 0; beatPhotoLoadedFlags.forEach(function (f) { if (f) n++; }); return n; },
    photoRainTotal: function () { var n = 0; rainSprites.forEach(function (s) { if (s.userData.kind === "photo") n++; }); return n; },
    photoRainLoaded: function () { var n = 0; rainSprites.forEach(function (s) { if (s.userData.kind === "photo" && s.userData.loaded) n++; }); return n; },
    photoRainVisible: function () { var n = 0; rainSprites.forEach(function (s) { if (s.userData.kind === "photo" && s.visible && s.material.opacity > 0.25 && s.userData.loaded) n++; }); return n; },
    letterShown: function () { return letterShown; },
    heroShown: function () { return heroShown; },
    dateFormed: function () { return dateFormK; },
    volleysActive: function () { return volleys.length; },
    musicPlaying: function () { return !music.paused; }
  };
})();
