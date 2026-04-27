import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const MAX_PARTICLES = 2400;

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.3, 0.6, 0.2);
    this.composer.addPass(this.bloom);

    this.pointer = new THREE.Vector3(0, 0, 0);
    this.target = new THREE.Vector3(0, 0, 0);

    this.setupParticles();
    window.addEventListener("resize", () => this.onResize());
  }

  setupParticles() {
    this.particles = [];
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      this.particles.push({
        pos: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02),
        vel: new THREE.Vector3(),
        acc: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
        color: new THREE.Color(0x66ddff),
        size: 0.03,
      });
      sizes[i] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {},
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (280.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, mat);
    this.scene.add(this.points);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.23, 64),
      new THREE.MeshBasicMaterial({ color: 0xff5566, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    );
    this.ring.rotation.x = Math.PI * 0.5;
    this.scene.add(this.ring);

    this.domainFog = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 8),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 }),
    );
    this.domainFog.position.z = -2;
    this.scene.add(this.domainFog);
  }

  updateHandPosition(normX, normY) {
    this.target.set((normX - 0.5) * 5, -(normY - 0.5) * 3, 0);
    this.pointer.lerp(this.target, 0.15);
  }

  spawn(style) {
    let spawnCount = style === "domain" ? 45 : 28;
    for (let i = 0; i < MAX_PARTICLES && i < spawnCount * 12; i += 1) {
      const p = this.particles[i];
      if (p.active) continue;
      this.activateParticle(p, style);
      if (--spawnCount <= 0) break;
    }
  }

  activateParticle(p, style) {
    p.active = true;
    p.life = 1;
    p.maxLife = 0.6 + Math.random() * 0.8;
    p.pos.copy(this.pointer).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2));
    p.vel.set(0, 0, 0);
    p.acc.set(0, 0, 0);

    switch (style) {
      case "aka": {
        p.color.setRGB(0.25, 0.65, 1.0);
        p.size = 0.04 + Math.random() * 0.05;
        break;
      }
      case "ao": {
        p.color.setRGB(1.0, 0.3, 0.22);
        p.size = 0.05 + Math.random() * 0.06;
        const dir = p.pos.clone().sub(this.pointer).normalize().multiplyScalar(1.4 + Math.random() * 2.4);
        p.vel.add(dir);
        break;
      }
      case "murasaki": {
        p.color.setRGB(0.82, 0.36, 1.0);
        p.size = 0.06 + Math.random() * 0.05;
        p.vel.set(2.5 + Math.random() * 2.5, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2);
        break;
      }
      case "domain":
      default: {
        p.color.setRGB(0.8, 0.8, 1.0);
        p.size = 0.03 + Math.random() * 0.03;
        p.pos.z = -1.5 - Math.random() * 1.2;
        p.vel.set((Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16, 0.03 + Math.random() * 0.04);
      }
    }
  }

  update(dt, ability) {
    this.domainFog.material.opacity = THREE.MathUtils.lerp(
      this.domainFog.material.opacity,
      ability === "domain" ? 0.52 : 0,
      0.08,
    );

    if (ability === "ao") {
      this.ring.material.opacity = Math.min(1, this.ring.material.opacity + 0.08);
      this.ring.scale.multiplyScalar(1.04);
      if (this.ring.scale.x > 10) {
        this.ring.scale.set(1, 1, 1);
        this.ring.material.opacity = 0;
      }
      this.ring.position.copy(this.pointer);
    } else {
      this.ring.material.opacity *= 0.9;
      this.ring.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
    }

    const posAttr = this.geometry.getAttribute("position");
    const colAttr = this.geometry.getAttribute("color");
    const sizeAttr = this.geometry.getAttribute("size");

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (!p.active) {
        sizeAttr.array[i] = 0;
        continue;
      }

      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        p.active = false;
        sizeAttr.array[i] = 0;
        continue;
      }

      applyForces(p, this.pointer, ability, dt);
      p.vel.addScaledVector(p.acc, dt);
      p.vel.multiplyScalar(0.92);
      p.pos.addScaledVector(p.vel, dt);

      const alpha = p.life;
      posAttr.array[i * 3] = p.pos.x;
      posAttr.array[i * 3 + 1] = p.pos.y;
      posAttr.array[i * 3 + 2] = p.pos.z;
      colAttr.array[i * 3] = p.color.r * alpha;
      colAttr.array[i * 3 + 1] = p.color.g * alpha;
      colAttr.array[i * 3 + 2] = p.color.b * alpha;
      sizeAttr.array[i] = p.size * (0.5 + alpha);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    this.composer.render();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}

function applyForces(p, center, ability, dt) {
  p.acc.set(0, 0, 0);
  const toCenter = center.clone().sub(p.pos);

  if (ability === "aka") {
    const swirl = new THREE.Vector3(-toCenter.y, toCenter.x, 0).normalize().multiplyScalar(2.2);
    p.acc.add(toCenter.normalize().multiplyScalar(4.8)).add(swirl);
  } else if (ability === "ao") {
    p.acc.add(p.pos.clone().sub(center).normalize().multiplyScalar(5.2));
  } else if (ability === "murasaki") {
    p.acc.add(new THREE.Vector3(4.2, 0, 0));
    p.acc.y += Math.sin((p.pos.x + p.pos.y) * 8 + dt) * 0.3;
  } else if (ability === "domain") {
    p.acc.add(new THREE.Vector3(0, 0, 0.12));
    p.acc.x += Math.sin(p.pos.y * 2) * 0.18;
    p.acc.y += Math.cos(p.pos.x * 2) * 0.18;
  } else {
    p.acc.add(toCenter.normalize().multiplyScalar(1.5));
  }
}
