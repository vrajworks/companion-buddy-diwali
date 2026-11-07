
const canvas = document.getElementById("crackerCanvas");

if (!canvas) {
  throw new Error('Missing canvas element: #crackerCanvas');
}

const ctx = canvas.getContext("2d");

if (!ctx) {
  throw new Error("Canvas 2D context is unavailable.");
}

// ======================================================
// BUDDY GIF CONTROLLER
// ======================================================

const buddyAnimation = document.getElementById("buddyAnimation");

const BUDDY_GIF_PATH = "assets/buddy/";
const BUDDY_WELCOME_GIF = "buddy-welcome-instruction.gif";
const BUDDY_CELEBRATING_GIF = "buddy-celebrating.gif";
const BUDDY_PARTY_HORN_GIF = "buddy-party-horn.gif";
const BUDDY_ANAR_REACTION_GIF = "buddy-anar-reaction.gif";

const BUDDY_CELEBRATING_DURATION = 2250;
const BUDDY_PARTY_HORN_DURATION = 3150;

let buddyCycleTimer = null;

function setBuddyGif(filename) {
  if (!buddyAnimation) return;

  const nextSource = `${BUDDY_GIF_PATH}${filename}`;
  const currentSource = buddyAnimation.getAttribute("src") || "";

  if (currentSource !== nextSource) {
    buddyAnimation.src = nextSource;
  }
}

function stopBuddyCelebrationCycle() {
  if (buddyCycleTimer !== null) {
    window.clearTimeout(buddyCycleTimer);
    buddyCycleTimer = null;
  }
}

function startBuddyCelebrationCycle() {
  if (!buddyAnimation) return;

  stopBuddyCelebrationCycle();

  let playCelebrating = true;

  function playNextBuddyGif() {
    if (animationFinished || anarLaunched) return;

    if (playCelebrating) {
      setBuddyGif(BUDDY_CELEBRATING_GIF);
      buddyCycleTimer = window.setTimeout(
        playNextBuddyGif,
        BUDDY_CELEBRATING_DURATION
      );
    } else {
      setBuddyGif(BUDDY_PARTY_HORN_GIF);
      buddyCycleTimer = window.setTimeout(
        playNextBuddyGif,
        BUDDY_PARTY_HORN_DURATION
      );
    }

    playCelebrating = !playCelebrating;
  }

  playNextBuddyGif();
}

[
  BUDDY_WELCOME_GIF,
  BUDDY_CELEBRATING_GIF,
  BUDDY_PARTY_HORN_GIF,
  BUDDY_ANAR_REACTION_GIF
].forEach(filename => {
  const image = new Image();
  image.src = `${BUDDY_GIF_PATH}${filename}`;
});

// ======================================================
// 1. CANVAS CONFIGURATION
// ======================================================

const W = 1600;
const H = 650;

const WORD = "DIS-TRACTION";
const LETTER_WIDTH = 100;
const LETTER_HEIGHT = 150;
const LETTER_GAP = 12;
const START_Y = 250;

const CRACKER_LENGTH = 43;
const CRACKER_DIAMETER = 19;
const CRACKER_SPACING = 16.2;

const IGNITION_DURATION = 950;
const CRACKER_DELAY = 48;
const BURST_DURATION = 430;

const wordWidth =
  WORD.length * LETTER_WIDTH +
  (WORD.length - 1) * LETTER_GAP;

const START_X = (W - wordWidth) / 2;

// ======================================================
// 2. LETTER SHAPES
// ======================================================

const letters = {
  D: [
    [[8, 8], [8, 132]],
    [[8, 8], [40, 8], [70, 20], [88, 48],
      [96, 70], [88, 100], [70, 125], [40, 132], [8, 132]]
  ],

  I: [
    [[15, 8], [85, 8]],
    [[50, 8], [50, 132]],
    [[15, 132], [85, 132]]
  ],

  S: [
    [[88, 17], [70, 8], [38, 8], [15, 25],
      [12, 45], [30, 62], [68, 75], [88, 92],
      [85, 116], [65, 132], [30, 132], [10, 118]]
  ],

  "-": [
    [[12, 70], [88, 70]]
  ],

  T: [
    [[5, 8], [95, 8]],
    [[50, 8], [50, 132]]
  ],

  R: [
    [[10, 132], [10, 8], [48, 8], [78, 18],
      [88, 40], [78, 60], [48, 68], [10, 68]],
    [[48, 68], [90, 132]]
  ],

  A: [
    [[8, 132], [35, 8], [65, 8], [92, 132]],
    [[20, 90], [80, 90]]
  ],

  C: [
    [[88, 20], [68, 8], [35, 8], [12, 30],
      [8, 70], [12, 110], [35, 132], [68, 132], [88, 120]]
  ],

  O: [
    [[50, 8], [25, 12], [10, 38], [8, 100],
      [25, 128], [50, 132], [75, 128], [92, 100],
      [90, 38], [75, 12], [50, 8]]
  ],

  N: [
    [[10, 132], [10, 8], [90, 132], [90, 8]]
  ]
};

// ======================================================
// 3. BUILD AND SMOOTH LETTER PATHS
// ======================================================

function buildWordStrokes() {
  const strokes = [];
  let x = START_X;

  for (const character of WORD) {
    const characterStrokes = letters[character] || [];

    for (const stroke of characterStrokes) {
      strokes.push({
        character,
        points: stroke.map(([px, py]) => ({
          x: x + px * LETTER_WIDTH / 100,
          y: START_Y + py * LETTER_HEIGHT / 140
        }))
      });
    }

    x += LETTER_WIDTH + LETTER_GAP;
  }

  return strokes;
}

function smoothPolyline(points, steps = 6) {
  if (points.length <= 2) return points;

  const result = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      const t2 = t * t;
      const t3 = t2 * t;

      result.push({
        x: 0.5 * (
          2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        ),

        y: 0.5 * (
          2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        )
      });
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

function preparePath(points) {
  const smoothPoints = smoothPolyline(points);
  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < smoothPoints.length - 1; i++) {
    const a = smoothPoints[i];
    const b = smoothPoints[i + 1];

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);

    if (length < 0.001) continue;

    segments.push({
      a, b, dx, dy, length,
      start: totalLength
    });

    totalLength += length;
  }

  return { segments, totalLength };
}

function getPathPoint(path, distance) {
  distance = Math.max(0, Math.min(distance, path.totalLength));

  let segment = path.segments[path.segments.length - 1];

  for (const current of path.segments) {
    if (distance <= current.start + current.length) {
      segment = current;
      break;
    }
  }

  if (!segment) {
    return { x: 0, y: 0, tx: 1, ty: 0, nx: 0, ny: 1 };
  }

  const t = Math.max(
    0,
    Math.min(1, (distance - segment.start) / segment.length)
  );

  return {
    x: segment.a.x + segment.dx * t,
    y: segment.a.y + segment.dy * t,
    tx: segment.dx / segment.length,
    ty: segment.dy / segment.length,
    nx: -segment.dy / segment.length,
    ny: segment.dx / segment.length
  };
}

const preparedPaths = buildWordStrokes().map(item => ({
  character: item.character,
  path: preparePath(item.points)
}));

// ======================================================
// 4. CRACKER SEQUENCE
// ======================================================

let crackerSequence = [];

function buildCrackerSequence() {
  crackerSequence = [];

  preparedPaths.forEach((item, pathIndex) => {
    const path = item.path;
    const reverse = pathIndex === 0 && item.character === "D";

    for (let distance = 0; distance <= path.totalLength; distance += CRACKER_SPACING) {
      const actualDistance = reverse
        ? path.totalLength - distance
        : distance;

      const p = getPathPoint(path, actualDistance);

      crackerSequence.push({
        x: p.x,
        y: p.y,
        angle: Math.atan2(p.ty, p.tx) + Math.PI / 2,
        path,
        distance: actualDistance,
        reverse,
        index: crackerSequence.length,
        ignitionAt: IGNITION_DURATION + crackerSequence.length * CRACKER_DELAY,
        soundPlayed: false
      });
    }
  });
}

buildCrackerSequence();

// ======================================================
// 5. DRAW INDIVIDUAL CRACKERS
// ======================================================

function drawCracker(x, y, angle, index) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const variation = Math.sin(index * 2.37) * 0.025;
  const length = CRACKER_LENGTH * (1 + variation);
  const diameter = CRACKER_DIAMETER * (1 + variation * 0.5);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(2, 3, length * 0.55, diameter * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createLinearGradient(0, -diameter / 2, 0, diameter / 2);
  body.addColorStop(0, "#ff8374");
  body.addColorStop(0.16, "#f83b30");
  body.addColorStop(0.42, "#ed251e");
  body.addColorStop(0.72, "#c5161c");
  body.addColorStop(1, "#790b13");

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-length / 2, -diameter / 2, length, diameter, diameter / 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,210,190,0.55)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    const rx = -length * 0.32 + i * length * 0.16;
    ctx.beginPath();
    ctx.moveTo(rx, -diameter * 0.32);
    ctx.lineTo(rx, diameter * 0.32);
    ctx.stroke();
  }

  ctx.restore();
}

// ======================================================
// 6. FIRE AND EXPLOSION EFFECTS
// ======================================================

function drawIgnitionFlame(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 25);
  glow.addColorStop(0, "rgba(255,255,210,.95)");
  glow.addColorStop(0.25, "rgba(255,190,55,.75)");
  glow.addColorStop(1, "rgba(255,90,0,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff8a18";
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.bezierCurveTo(-12, 4, -5, -8, 1, -19);
  ctx.bezierCurveTo(4, -10, 12, -2, 0, 13);
  ctx.fill();

  ctx.restore();
}

function drawExplosion(x, y, progress, seed) {
  ctx.save();
  ctx.translate(x, y);

  const particles = 14;

  for (let i = 0; i < particles; i++) {
    const angle = (Math.PI * 2 * i) / particles + seed * 0.71;
    const distance = 12 + progress * (35 + (i % 4) * 9);
    const px = Math.cos(angle) * distance;
    const py = Math.sin(angle) * distance;

    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = i % 3 === 0 ? "#fff4bd" : i % 3 === 1 ? "#ffb347" : "#ff5c28";
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.7, 3.2 * (1 - progress)), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = Math.max(0, 1 - progress);
  const flash = ctx.createRadialGradient(0, 0, 1, 0, 0, 38);
  flash.addColorStop(0, "rgba(255,255,230,.9)");
  flash.addColorStop(0.25, "rgba(255,200,90,.6)");
  flash.addColorStop(1, "rgba(255,100,20,0)");

  ctx.fillStyle = flash;
  ctx.beginPath();
  ctx.arc(0, 0, 38, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCrackerBurst(x, y, progress, seed) {
  drawExplosion(x, y, progress, seed);
}

// ======================================================
// 7. AUDIO ENGINE
// ======================================================

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

let crackerNoiseBuffer = null;

function getCrackerNoiseBuffer(audio) {
  if (crackerNoiseBuffer) return crackerNoiseBuffer;

  const length = Math.floor(audio.sampleRate * 0.2);
  crackerNoiseBuffer = audio.createBuffer(1, length, audio.sampleRate);
  const samples = crackerNoiseBuffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }

  return crackerNoiseBuffer;
}

function playPop(volume = 0.12) {
  const audio = getAudioContext();
  if (!audio) return;

  const now = audio.currentTime;
  const duration = 0.085;

  // Sharp broadband crack. High-pass filtering removes the bass thump.
  const source = audio.createBufferSource();
  source.buffer = getCrackerNoiseBuffer(audio);

  const highPass = audio.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.setValueAtTime(950, now);
  highPass.Q.value = 0.7;

  const snapFilter = audio.createBiquadFilter();
  snapFilter.type = "peaking";
  snapFilter.frequency.setValueAtTime(3100, now);
  snapFilter.Q.value = 0.9;
  snapFilter.gain.value = 5;

  const gain = audio.createGain();
  gain.gain.setValueAtTime(Math.min(volume * 1.25, 0.2), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(highPass);
  highPass.connect(snapFilter);
  snapFilter.connect(gain);
  gain.connect(audio.destination);

  source.start(now);
  source.stop(now + duration);
}

// ======================================================
// 8. FUSE AND CROSS BINDINGS
// ======================================================

function getPathBurnState(path, elapsed) {
  if (elapsed < 0) {
    return {
      burned: 0,
      hasBurned: false,
      reverse: false
    };
  }

  const first = crackerSequence.find(item => item.path === path);

  if (!first) {
    return {
      burned: 0,
      hasBurned: false,
      reverse: false
    };
  }

  const localElapsed = elapsed - first.ignitionAt;
  const distance = Math.max(0, localElapsed / CRACKER_DELAY * CRACKER_SPACING);

  return {
    burned: Math.min(path.totalLength, distance),
    hasBurned: localElapsed >= 0,
    reverse: first.reverse
  };
}

function drawCrossBindings(path, state) {
  if (!path || !path.segments.length) return;

  let tieIndex = 0;

  for (let d = 0; d <= path.totalLength; d += CRACKER_SPACING * 4) {
    const burned = state.hasBurned &&
      (state.reverse ? d >= state.burned : d <= state.burned);

    if (burned) {
      tieIndex++;
      continue;
    }

    const p = getPathPoint(path, d);
    const half = CRACKER_LENGTH * 0.37;

    ctx.save();
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(p.x - p.nx * half, p.y - p.ny * half);
    ctx.quadraticCurveTo(p.x + p.tx * 2, p.y + p.ty * 2,
      p.x + p.nx * half, p.y + p.ny * half);

    ctx.strokeStyle = "rgba(52,31,20,.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = "#d8c3a2";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
    tieIndex++;
  }
}

function drawCottonFuse(path, state) {
  if (!path || !path.segments.length) return;

  for (let d = 0; d <= path.totalLength; d += CRACKER_SPACING * 4) {
    const burned = state.hasBurned &&
      (state.reverse ? d >= state.burned : d <= state.burned);

    if (burned) continue;

    const p = getPathPoint(path, d);
    const half = CRACKER_LENGTH * 0.37;

    ctx.save();
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(p.x - p.nx * half, p.y - p.ny * half);
    ctx.quadraticCurveTo(
      p.x + p.tx * 2,
      p.y + p.ty * 2,
      p.x + p.nx * half,
      p.y + p.ny * half
    );

    ctx.strokeStyle = "rgba(52,31,20,.8)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = "#d8c3a2";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
  }
}

// ======================================================
// 9. IGNITION CORD AND SWITCH
// ======================================================

const firstDPath = preparedPaths.find(item => item.character === "D")?.path;

const ignitionCordStart = firstDPath
  ? getPathPoint(firstDPath, firstDPath.totalLength)
  : { x: 0, y: 0 };

function drawIgnitionCord(progress = 0) {
  const sx = ignitionCordStart.x;
  const sy = ignitionCordStart.y;
  const ex = W * 0.445;
  const ey = H * 0.875;

  const remaining = 1 - Math.max(0, Math.min(1, progress));
  if (remaining <= 0.002) return;

  function pointAt(t) {
    const mt = 1 - t;

    return {
      x: mt ** 3 * sx +
        3 * mt ** 2 * t * (sx - 80) +
        3 * mt * t ** 2 * 260 +
        t ** 3 * ex,

      y: mt ** 3 * sy +
        3 * mt ** 2 * t * (sy + 115) +
        3 * mt * t ** 2 * 560 +
        t ** 3 * ey
    };
  }

  ctx.save();
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(sx, sy);

  for (let i = 1; i <= 60; i++) {
    const p = pointAt(remaining * i / 60);
    ctx.lineTo(p.x, p.y);
  }

  ctx.strokeStyle = "rgba(35,20,12,.8)";
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.strokeStyle = "#b49a76";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.strokeStyle = "#e5d0ad";
  ctx.lineWidth = 3.4;
  ctx.stroke();

  const flame = pointAt(remaining);
  drawIgnitionFlame(flame.x, flame.y, 1.15);

  ctx.restore();
}

function drawIgnitionSwitch() {
  const x = W * 0.5;
  const y = H * 0.875;

  ctx.save();

  const glow = ctx.createRadialGradient(x, y, 2, x, y, 75);
  glow.addColorStop(0, "rgba(255,160,40,.28)");
  glow.addColorStop(1, "rgba(255,100,10,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 75, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b160e";
  ctx.beginPath();
  ctx.roundRect(x - 48, y - 20, 96, 40, 9);
  ctx.fill();

  ctx.strokeStyle = "#d49a48";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#ffc45b";
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ======================================================
// 10. DRAW LETTER ANIMATION
// ======================================================

let animationStartTime = null;
let animationFrame = null;
let animationFinished = false;
let anarLaunched = false;

function drawAnimatedCrackers(now) {
  const elapsed = animationStartTime === null
    ? -1
    : now - animationStartTime;

  let active = null;

  crackerSequence.forEach(cracker => {
    const localTime = elapsed - cracker.ignitionAt;

    if (elapsed < 0 || localTime < 0) {
      drawCracker(cracker.x, cracker.y, cracker.angle, cracker.index);
      return;
    }

    if (localTime < BURST_DURATION) {
      drawCrackerBurst(
        cracker.x,
        cracker.y,
        localTime / BURST_DURATION,
        cracker.index
      );

      if (!cracker.soundPlayed) {
        cracker.soundPlayed = true;
        playPop(0.115, 108 + (cracker.index % 7) * 15);
      }

      if (!active || cracker.ignitionAt > active.ignitionAt) {
        active = cracker;
      }
    }
  });

  if (active) drawIgnitionFlame(active.x, active.y, 1.05);
}

function drawWord() {
  const now = performance.now();
  const elapsed = animationStartTime === null ? -1 : now - animationStartTime;

  drawAnimatedCrackers(now);

  preparedPaths.forEach(item => {
    drawCrossBindings(item.path, getPathBurnState(item.path, elapsed));
  });

  preparedPaths.forEach(item => {
    drawCottonFuse(item.path, getPathBurnState(item.path, elapsed));
  });

  const cordProgress = animationStartTime === null
    ? 0
    : Math.min(1, elapsed / IGNITION_DURATION);

  drawIgnitionCord(cordProgress);
  drawIgnitionSwitch();
}

// ======================================================
// 11. SILENT DIWALI GREETING
// ======================================================

let finaleTimers = [];

function createGreetingSparkles() {
  const layer = document.getElementById("sparkleLayer");
  if (!layer || layer.dataset.created === "true") return;

  layer.dataset.created = "true";

  for (let i = 0; i < 38; i++) {
    const sparkle = document.createElement("i");
    sparkle.className = "sparkle";

    sparkle.style.left = `${8 + Math.random() * 84}%`;
    sparkle.style.top = `${17 + Math.random() * 66}%`;
    sparkle.style.setProperty("--size", `${2 + Math.random() * 4}px`);
    sparkle.style.setProperty("--duration", `${1.5 + Math.random() * 2.5}s`);
    sparkle.style.setProperty("--delay", `${Math.random() * 3}s`);

    layer.appendChild(sparkle);
  }
}

function showDiwaliFinale() {
  const finale = document.querySelector(".diwali-finale");
  if (!finale) return;

  finale.classList.add("finale-visible");
  finale.setAttribute("aria-hidden", "false");

  createGreetingSparkles();

  // Prevent duplicate promotion screens.
  if (finale.querySelector(".companion-promo")) return;

  // Keep the Diwali greeting visible for four seconds before the app promotion.
  window.setTimeout(() => {
    const promo = document.createElement("section");
    promo.className = "companion-promo";
    promo.setAttribute("aria-label", "Companion Buddy app promotion");

    const content = document.createElement("div");
    content.className = "promo-content";

    const eyebrow = document.createElement("p");
    eyebrow.className = "promo-eyebrow";
    eyebrow.textContent = "A LITTLE BUDDY FOR A BIGGER GOAL";

    const title = document.createElement("h2");
    title.className = "promo-title";
    title.textContent = "Companion Buddy";

    const message = document.createElement("p");
    message.className = "promo-message";
    message.textContent =
      "Your phone should be a tool, not a trap. Take back control of your screen time.";

    const playBadge = document.createElement("a");
    playBadge.className = "promo-play-badge";
    playBadge.href =
      "https://play.google.com/store/apps/details?id=com.chottu.app";
    playBadge.target = "_self";
    playBadge.rel = "noopener noreferrer";
    playBadge.setAttribute(
      "aria-label",
      "Get Companion Buddy on Google Play"
    );

    const playIcon = document.createElement("span");
    playIcon.className = "promo-play-icon";
    playIcon.setAttribute("aria-hidden", "true");
    playIcon.textContent = "▶";

    const badgeCopy = document.createElement("span");
    badgeCopy.className = "promo-play-copy";

    const badgeEyebrow = document.createElement("span");
    badgeEyebrow.className = "promo-play-small";
    badgeEyebrow.textContent = "GET IT ON";

    const badgeStore = document.createElement("strong");
    badgeStore.textContent = "Google Play";

    badgeCopy.append(badgeEyebrow, badgeStore);
    playBadge.append(playIcon, badgeCopy);

    content.append(eyebrow, title, message, playBadge);
    promo.appendChild(content);
    finale.appendChild(promo);

    finale.classList.add("promo-mode");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        promo.classList.add("promo-visible");
      });
    });
  }, 4000);
}

// ======================================================
// 12. ANAR IGNITION SEQUENCE
// ======================================================

// ======================================================
// 12A. REALISTIC ANAR FOUNTAIN - CANVAS PARTICLES
// ======================================================

let anarParticleCanvas = null;
let anarParticleCtx = null;
let anarParticleFrame = null;
let anarParticleLastTime = 0;
let anarParticleAccumulator = 0;
let anarParticles = [];
let anarParticleRunning = false;
let anarParticleWidth = 0;
let anarParticleHeight = 0;

const DEVICE_CORES = navigator.hardwareConcurrency || 4;
const ANAR_MAX_PARTICLES = Math.min(1500, Math.max(850, DEVICE_CORES * 180));
const ANAR_EMISSION_RATE = Math.min(720, Math.max(480, DEVICE_CORES * 90));
const ANAR_GRAVITY = 720;

function prepareAnarParticleCanvas(layer) {
  if (!layer) return false;

  if (!anarParticleCanvas) {
    anarParticleCanvas = document.createElement("canvas");
    anarParticleCanvas.className = "anar-particle-canvas";
    anarParticleCanvas.setAttribute("aria-hidden", "true");
    layer.replaceChildren(anarParticleCanvas);
    anarParticleCtx = anarParticleCanvas.getContext("2d", { alpha: true });
  } else if (anarParticleCanvas.parentElement !== layer) {
    layer.replaceChildren(anarParticleCanvas);
  }

  const rect = layer.getBoundingClientRect();
  anarParticleWidth = Math.max(1, rect.width);
  anarParticleHeight = Math.max(1, rect.height);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  anarParticleCanvas.width = Math.round(anarParticleWidth * dpr);
  anarParticleCanvas.height = Math.round(anarParticleHeight * dpr);
  anarParticleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return true;
}

function createAnarParticle() {
  const center = anarParticleWidth * 0.5;
  const colors = [
    "#fff9d5",
    "#ffe9a0",
    "#ffd05a",
    "#ffad36",
    "#fff0c2"
  ];

  const launchAngle =
    -Math.PI / 2 + (Math.random() - 0.5) * 0.82;

  const launchSpeed = 390 + Math.random() * 300;

  return {
    x: center + (Math.random() - 0.5) * 5,
    y: anarParticleHeight - 7 - Math.random() * 5,

    vx:
      Math.cos(launchAngle) * launchSpeed +
      (Math.random() - 0.5) * 35,

    vy: Math.sin(launchAngle) * launchSpeed,

    life: 0,
    maxLife: 1.05 + Math.random() * 0.65,

    size: 0.8 + Math.random() * 1.25,
    alpha: 0.65 + Math.random() * 0.35,

    color: colors[(Math.random() * colors.length) | 0],
    twinkle: Math.random() * Math.PI * 2,
    drag: 0.992 + Math.random() * 0.006
  };
}

function drawAnarParticleFrame(time) {
  if (!anarParticleRunning || !anarParticleCtx) return;

  const dt = Math.min(
    0.033,
    Math.max(0.001, (time - anarParticleLastTime) / 1000 || 0.016)
  );

  anarParticleLastTime = time;
  anarParticleAccumulator += ANAR_EMISSION_RATE * dt;

  const toSpawn = Math.floor(anarParticleAccumulator);
  anarParticleAccumulator -= toSpawn;

  for (
    let i = 0;
    i < toSpawn && anarParticles.length < ANAR_MAX_PARTICLES;
    i++
  ) {
    anarParticles.push(createAnarParticle());
  }

  const c = anarParticleCtx;

  c.clearRect(0, 0, anarParticleWidth, anarParticleHeight);

  const nozzleGlow = c.createRadialGradient(
    anarParticleWidth * 0.5,
    anarParticleHeight - 8,
    0,
    anarParticleWidth * 0.5,
    anarParticleHeight - 8,
    20
  );

  nozzleGlow.addColorStop(0, "rgba(255,220,130,0.16)");
  nozzleGlow.addColorStop(1, "rgba(255,150,35,0)");

  c.fillStyle = nozzleGlow;
  c.fillRect(
    anarParticleWidth * 0.5 - 20,
    anarParticleHeight - 28,
    40,
    28
  );

  for (let i = anarParticles.length - 1; i >= 0; i--) {
    const p = anarParticles[i];

    p.life += dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += ANAR_GRAVITY * dt;
    p.vx *= p.drag;

    if (
      p.life >= p.maxLife ||
      p.y > anarParticleHeight + 12 ||
      p.x < -18 ||
      p.x > anarParticleWidth + 18
    ) {
      anarParticles[i] = anarParticles[anarParticles.length - 1];
      anarParticles.pop();
      continue;
    }

    const lifeProgress = p.life / p.maxLife;
    const fadeIn = Math.min(1, p.life * 12);
    const fadeOut = Math.min(1, (1 - lifeProgress) * 5);
    const flicker =
      0.82 + 0.18 * Math.sin(time * 0.025 + p.twinkle);

    c.globalAlpha = Math.max(
      0,
      p.alpha * fadeIn * fadeOut * flicker
    );

    c.fillStyle = p.color;
    c.shadowColor = p.color;
    c.shadowBlur = 2.5 + p.size * 2;

    c.beginPath();
    c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    c.fill();

    c.globalAlpha *= 0.42;
    c.strokeStyle = p.color;
    c.lineWidth = Math.max(0.6, p.size * 0.65);

    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(
      p.x - p.vx * 0.012,
      p.y - p.vy * 0.012
    );
    c.stroke();
  }

  c.globalAlpha = 1;
  c.shadowBlur = 0;

  anarParticleFrame = requestAnimationFrame(drawAnarParticleFrame);
}

function startAnarParticles() {
  const layer = document.getElementById("anarParticles");

  if (!prepareAnarParticleCanvas(layer)) return;

  stopAnarParticles();

  anarParticles = [];
  anarParticleAccumulator = 0;
  anarParticleLastTime = performance.now();
  anarParticleRunning = true;

  anarParticleFrame = requestAnimationFrame(drawAnarParticleFrame);
}

function stopAnarParticles() {
  anarParticleRunning = false;

  if (anarParticleFrame !== null) {
    cancelAnimationFrame(anarParticleFrame);
    anarParticleFrame = null;
  }

  if (anarParticleCtx && anarParticleCanvas) {
    anarParticleCtx.clearRect(
      0,
      0,
      anarParticleWidth,
      anarParticleHeight
    );
  }

  anarParticles = [];
}

// ======================================================
// 12B. ANAR SOUND
// ======================================================

let anarSoundInterval = null;
let anarSoundNodes = [];

function startAnarSound() {
  const audio = getAudioContext();
  if (!audio) return;

  stopAnarSound();

  const now = audio.currentTime;
  const source = audio.createBufferSource();

  source.buffer = getCrackerNoiseBuffer(audio);
  source.loop = true;

  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(700, now);

  const hissGain = audio.createGain();
  hissGain.gain.setValueAtTime(0.001, now);
  hissGain.gain.linearRampToValueAtTime(0.075, now + 0.35);

  source.connect(filter);
  filter.connect(hissGain);
  hissGain.connect(audio.destination);

  source.start(now);

  anarSoundNodes.push({
    source,
    gain: hissGain
  });

  anarSoundInterval = window.setInterval(() => {
    const currentAudio = getAudioContext();
    if (!currentAudio) return;

    const crackle = currentAudio.createBufferSource();
    crackle.buffer = getCrackerNoiseBuffer(currentAudio);

    const band = currentAudio.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1500 + Math.random() * 3500;
    band.Q.value = 0.8;

    const gain = currentAudio.createGain();
    const start = currentAudio.currentTime;
    const volume = 0.025 + Math.random() * 0.045;
    const duration = 0.045 + Math.random() * 0.07;

    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      start + duration
    );

    crackle.connect(band);
    band.connect(gain);
    gain.connect(currentAudio.destination);

    crackle.start(start);
    crackle.stop(start + duration + 0.01);
  }, 95);
}

function stopAnarSound() {
  if (anarSoundInterval !== null) {
    window.clearInterval(anarSoundInterval);
    anarSoundInterval = null;
  }

  anarSoundNodes.forEach(({ source, gain }) => {
    try {
      const now = audioContext.currentTime;

      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.001, now, 0.12);

      source.stop(now + 0.5);
    } catch (error) {
      // The source may already have stopped.
    }
  });

  anarSoundNodes = [];
}

// ======================================================
// 12C. ANAR LAUNCH SEQUENCE
// ======================================================

function launchAnar() {
  if (anarLaunched) return;

  anarLaunched = true;

  stopBuddyCelebrationCycle();
  setBuddyGif(BUDDY_ANAR_REACTION_GIF);

  const anar = document.querySelector(".anar-fountain");

  if (!anar) {
    showDiwaliFinale();
    return;
  }

  const anarImage = anar.querySelector("#anarImage, .anar-image");

  if (anarImage) {
    anarImage.style.visibility = "visible";
  }

  anar.style.visibility = "visible";

  anar.classList.remove("anar-active", "anar-fading");
  anar.classList.add("anar-igniting");
  anar.setAttribute("aria-hidden", "false");

  finaleTimers.push(window.setTimeout(() => {
    anar.classList.remove("anar-igniting");
    anar.classList.add("anar-active");

    startAnarParticles();
    startAnarSound();
  }, 680));

  finaleTimers.push(window.setTimeout(() => {
    anar.classList.remove("anar-active");
    anar.classList.add("anar-fading");

    stopAnarParticles();
    stopAnarSound();
  }, 4680));

  finaleTimers.push(window.setTimeout(() => {
    stopAnarParticles();
    stopAnarSound();

    anar.classList.remove(
      "anar-igniting",
      "anar-active",
      "anar-fading"
    );

    anar.setAttribute("aria-hidden", "false");
    anar.style.visibility = "visible";

    if (anarImage) {
      anarImage.style.visibility = "visible";
      anarImage.style.filter = "";
    }

    const particleLayer = document.getElementById("anarParticles");

    if (particleLayer) {
      particleLayer.replaceChildren();
    }

    showDiwaliFinale();
  }, 6100));
}

// ======================================================
// 13. MAIN ANIMATION LOOP
// ======================================================

function drawFrame() {
  ctx.clearRect(0, 0, W, H);
  drawWord();

  if (animationStartTime !== null && !animationFinished) {
    const elapsed = performance.now() - animationStartTime;
    const lastCracker = crackerSequence[crackerSequence.length - 1];

    const finishAt = lastCracker
      ? lastCracker.ignitionAt + BURST_DURATION + 420
      : IGNITION_DURATION;

    if (elapsed >= finishAt) {
      animationFinished = true;
      launchAnar();
      return;
    }

    animationFrame = requestAnimationFrame(drawFrame);
  }
}

// ======================================================
// 14. IGNITION SWITCH CLICK
// ======================================================

function startCelebration() {
  if (animationStartTime !== null) return;

  getAudioContext();
  playPop(0.24);

  animationStartTime = performance.now();

  buddyCycleTimer = window.setTimeout(
    startBuddyCelebrationCycle,
    IGNITION_DURATION
  );

  animationFrame = requestAnimationFrame(drawFrame);
}

function handleCanvasClick(event) {
  if (animationStartTime !== null) return;

  const rect = canvas.getBoundingClientRect();

  const scaleX = W / rect.width;
  const scaleY = H / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const switchX = W * 0.5;
  const switchY = H * 0.875;

  const hit =
    Math.abs(x - switchX) <= 58 &&
    Math.abs(y - switchY) <= 45;

  if (hit) startCelebration();
}

canvas.addEventListener("click", handleCanvasClick);
canvas.style.cursor = "pointer";
canvas.style.touchAction = "manipulation";

// ======================================================
// 15. RESPONSIVE CANVAS
// ======================================================

function render() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, W, H);
  drawWord();
}

let resizeFrame = null;

window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);

  resizeFrame = requestAnimationFrame(() => {
    render();

    if (animationStartTime !== null && !animationFinished) {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(drawFrame);
    }
  });
});

// ======================================================
// 16. INITIALIZATION
// ======================================================

setBuddyGif(BUDDY_WELCOME_GIF);
render();
