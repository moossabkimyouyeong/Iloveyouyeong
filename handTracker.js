const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export class HandTracker {
  constructor({ videoEl, overlayEl }) {
    this.videoEl = videoEl;
    this.overlayEl = overlayEl;
    this.ctx = overlayEl.getContext("2d");
    this.latest = null;
    this.onLandmarks = null;

    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.7,
    });

    this.hands.onResults((results) => this.handleResults(results));
  }

  async start() {
    await this.setupCamera();
    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.camera = new Camera(this.videoEl, {
      onFrame: async () => {
        await this.hands.send({ image: this.videoEl });
      },
      width: 1280,
      height: 720,
    });

    await this.camera.start();
  }

  async setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    this.videoEl.srcObject = stream;
    await new Promise((resolve) => {
      this.videoEl.onloadedmetadata = () => resolve();
    });
  }

  resize() {
    const { clientWidth, clientHeight } = this.videoEl;
    this.overlayEl.width = clientWidth;
    this.overlayEl.height = clientHeight;
  }

  handleResults(results) {
    this.ctx.clearRect(0, 0, this.overlayEl.width, this.overlayEl.height);
    const landmarks = results.multiHandLandmarks?.[0] || null;
    this.latest = landmarks;

    if (landmarks) {
      this.drawHandHUD(landmarks);
      this.onLandmarks?.(landmarks);
    } else {
      this.onLandmarks?.(null);
    }
  }

  drawHandHUD(landmarks) {
    const w = this.overlayEl.width;
    const h = this.overlayEl.height;

    this.ctx.save();
    this.ctx.translate(w, 0);
    this.ctx.scale(-1, 1);

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "rgba(46,219,255,0.85)";
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = "#2edbff";

    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      this.ctx.beginPath();
      this.ctx.moveTo(pa.x * w, pa.y * h);
      this.ctx.lineTo(pb.x * w, pb.y * h);
      this.ctx.stroke();
    }

    for (const lm of landmarks) {
      const x = lm.x * w;
      const y = lm.y * h;
      this.ctx.beginPath();
      this.ctx.fillStyle = "#75edff";
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }
}
