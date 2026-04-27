const EPSILON = 1e-6;

export function normalizeLandmarks(landmarks) {
  if (!landmarks || landmarks.length !== 21) return null;

  const wrist = landmarks[0];
  const centered = landmarks.map((p) => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
    z: p.z - wrist.z,
  }));

  const middleTip = centered[12];
  const scale = Math.hypot(middleTip.x, middleTip.y, middleTip.z) || EPSILON;

  return centered.map((p) => ({
    x: p.x / scale,
    y: p.y / scale,
    z: p.z / scale,
  }));
}

export function toFeatureVector(normalized) {
  if (!normalized) return null;
  const vec = new Float32Array(63);
  normalized.forEach((lm, idx) => {
    vec[idx * 3] = lm.x;
    vec[idx * 3 + 1] = lm.y;
    vec[idx * 3 + 2] = lm.z;
  });
  return vec;
}

export function averageDistance(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  const points = vecA.length / 3;
  for (let i = 0; i < vecA.length; i += 3) {
    const dx = vecA[i] - vecB[i];
    const dy = vecA[i + 1] - vecB[i + 1];
    const dz = vecA[i + 2] - vecB[i + 2];
    sum += Math.hypot(dx, dy, dz);
  }
  return sum / points;
}

function templateFromFrames(frames = []) {
  if (!frames.length) return null;
  const acc = new Float32Array(63);
  for (const frame of frames) {
    for (let i = 0; i < 63; i += 1) acc[i] += frame[i];
  }
  for (let i = 0; i < 63; i += 1) acc[i] /= frames.length;
  return acc;
}

export class GestureMatcher {
  constructor(gestureData, options = {}) {
    this.gestureData = gestureData;
    this.threshold = options.threshold ?? 0.16;
    this.historySize = options.historySize ?? 10;
    this.history = [];
  }

  getTemplates() {
    const templates = {};
    for (const [name, frames] of Object.entries(this.gestureData)) {
      const tpl = templateFromFrames(frames);
      if (tpl) templates[name] = tpl;
    }
    return templates;
  }

  match(landmarks) {
    const normalized = normalizeLandmarks(landmarks);
    const feature = toFeatureVector(normalized);
    if (!feature) return { gesture: null, confidence: 0, score: Infinity };

    const templates = this.getTemplates();
    let bestName = null;
    let bestScore = Infinity;

    for (const [name, tpl] of Object.entries(templates)) {
      const score = averageDistance(feature, tpl);
      if (score < bestScore) {
        bestScore = score;
        bestName = name;
      }
    }

    const instantGesture = bestName && bestScore < this.threshold ? bestName : null;
    this.history.push(instantGesture);
    if (this.history.length > this.historySize) this.history.shift();

    const stable = this.majorityVote();
    const confidence = bestScore === Infinity ? 0 : Math.max(0, 1 - bestScore / this.threshold);

    return {
      gesture: stable,
      instantGesture,
      confidence,
      score: bestScore,
      normalized,
      feature,
    };
  }

  majorityVote() {
    const count = new Map();
    for (const item of this.history) {
      if (!item) continue;
      count.set(item, (count.get(item) ?? 0) + 1);
    }
    let best = null;
    let max = 0;
    for (const [name, n] of count.entries()) {
      if (n > max) {
        max = n;
        best = name;
      }
    }
    return max >= Math.ceil(this.historySize * 0.4) ? best : null;
  }
}
