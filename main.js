import { HandTracker } from "./handTracker.js";
import { GestureTrainer } from "./gestureTrainer.js";
import { GestureMatcher } from "./gestureMatcher.js";
import { ParticleSystem } from "./particleSystem.js";
import { UIController } from "./ui.js";
import { resolveAbility } from "./abilities.js";

const videoEl = document.getElementById("webcam");
const overlayEl = document.getElementById("overlay");
const threeCanvas = document.getElementById("three-canvas");

const ui = new UIController();
const trainer = new GestureTrainer(ui);
const matcher = new GestureMatcher(trainer.gestureData, { threshold: 0.19, historySize: 10 });
const particles = new ParticleSystem(threeCanvas);
const handTracker = new HandTracker({ videoEl, overlayEl });

let lastLandmarks = null;
let currentAbility = null;

handTracker.onLandmarks = (landmarks) => {
  lastLandmarks = landmarks;

  if (!landmarks || trainer.isCapturing) return;
  const result = matcher.match(landmarks);
  currentAbility = resolveAbility(result.gesture);
  ui.setAbility(currentAbility);

  const palm = landmarks[9] ?? landmarks[0];
  particles.updateHandPosition(palm.x, palm.y);
};

async function init() {
  setupTrainingUI();
  await handTracker.start();
  ui.setStatus("웹캠 시작 완료. 손 제스처를 학습하세요.");
  requestAnimationFrame(loop);
}

function setupTrainingUI() {
  ui.trainButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const gesture = btn.dataset.gesture;
      ui.setTrainingDisabled(true);
      await trainer.train(gesture, () => lastLandmarks);
      matcher.gestureData = trainer.gestureData;
      ui.setTrainingDisabled(false);
    });
  });

  ui.clearBtn.addEventListener("click", () => {
    trainer.clear();
    matcher.gestureData = trainer.gestureData;
    matcher.history = [];
    ui.setStatus("학습 데이터 초기화 완료");
  });
}

let prev = performance.now();
function loop(now) {
  const dt = Math.min((now - prev) / 1000, 0.033);
  prev = now;

  if (currentAbility) {
    particles.spawn(currentAbility);
  } else if (lastLandmarks) {
    particles.spawn("aka");
  }

  particles.update(dt, currentAbility);
  requestAnimationFrame(loop);
}

init();
