import { normalizeLandmarks, toFeatureVector } from "./gestureMatcher.js";

const STORAGE_KEY = "hand-ability-gesture-data-v1";

function emptyData() {
  return {
    aka: [],
    ao: [],
    murasaki: [],
    domain: [],
  };
}

export class GestureTrainer {
  constructor(ui) {
    this.ui = ui;
    this.gestureData = this.load();
    this.isCapturing = false;
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    try {
      const parsed = JSON.parse(raw);
      return { ...emptyData(), ...parsed };
    } catch {
      return emptyData();
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.gestureData));
  }

  clear() {
    this.gestureData = emptyData();
    this.save();
  }

  async train(gestureName, getLandmarks) {
    if (this.isCapturing) return false;
    this.isCapturing = true;

    for (let i = 3; i > 0; i -= 1) {
      this.ui.setStatus(`${gestureName} 학습 시작까지 ${i}...`);
      await wait(1000);
    }

    this.ui.setStatus(`${gestureName} 캡쳐 중...`);
    const frames = [];
    const start = performance.now();
    const captureMs = 2600;

    while (performance.now() - start < captureMs || frames.length < 40) {
      const lm = getLandmarks();
      if (lm) {
        const normalized = normalizeLandmarks(lm);
        const feature = toFeatureVector(normalized);
        if (feature) frames.push(Array.from(feature));
      }
      await wait(1000 / 60);
    }

    this.gestureData[gestureName] = frames;
    this.save();
    this.isCapturing = false;
    this.ui.setStatus(`${gestureName} 학습 완료 (${frames.length} 프레임)`);
    return true;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
