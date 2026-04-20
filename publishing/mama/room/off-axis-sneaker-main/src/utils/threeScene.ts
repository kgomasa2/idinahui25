import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HeadPose } from './headPose';
import { OffAxisCamera } from './offAxisCamera';
import { calibrationManager, CalibrationData } from './calibration';

export interface ThreeSceneOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
}

export class ThreeSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private offAxisCamera: OffAxisCamera;
  private model: THREE.Object3D | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private currentHeadPose: HeadPose = { x: 0.5, y: 0.5, z: 1 };
  private debugMode: boolean = false;
  private debugHelpers: THREE.Object3D[] = [];
  private roomObjects: THREE.Object3D[] = [];

  constructor(options: ThreeSceneOptions) {
    const width = options.width || options.container.clientWidth;
    const height = options.height || options.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    const calibration = calibrationManager.getCalibration();
    calibration.pixelWidth = width;
    calibration.pixelHeight = height;
    calibrationManager.updatePixelDimensions(width, height);

    this.offAxisCamera = new OffAxisCamera(this.camera, calibration);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- НАЛАШТУВАННЯ КОЛЬОРУ ТА СЕРЕДОВИЩА ---
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.65;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Студійне оточення — для натуральних відблисків на матеріалах
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTexture;
    // -----------------------------------------

    options.container.appendChild(this.renderer.domElement);

    this.loadShoeModel();
    this.createDebugHelpers();
  }

  private loadShoeModel(): void {
    // --- РЕАЛІСТИЧНЕ ОСВІТЛЕННЯ ---

    // Ambient — м'яке заповнення
    const ambientLight = new THREE.AmbientLight(0xf0ebe5, 0.1);
    this.scene.add(ambientLight);

    // Hemisphere light — натуральний градієнт неба/землі
    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x8a7a6a, 0.1);
    this.scene.add(hemiLight);

    // Основне направлене світло (тепле) — ключове джерело з тінями
    const keyLight = new THREE.DirectionalLight(0xfff4e6, 0.7);
    keyLight.position.set(3, 8, 4);
    keyLight.castShadow = true;

    // Широкий frustum щоб покрити всю кімнату
    keyLight.shadow.camera.top = 12;
    keyLight.shadow.camera.bottom = -12;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 30;

    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.radius = 4; // М'якість тіней для PCFSoft

    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;

    this.scene.add(keyLight);

    // Fill light — протилежне від key, м'яке холодне заповнення
    const fillLight = new THREE.DirectionalLight(0xc8d8f0, 0.2);
    fillLight.position.set(-4, 3, -2);
    fillLight.castShadow = false;
    this.scene.add(fillLight);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      '/models/room.glb',
      (gltf) => {
        this.model = gltf.scene;
        this.model.position.set(0, 0, 0);
        this.model.rotation.set(0, 0, 0);
        this.model.scale.set(1, 1, 1);

        this.model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Налаштовуємо envMapIntensity залежно від наявності текстури
            if (child.material instanceof THREE.MeshStandardMaterial) {
              if (child.material.map) {
                // Меші з текстурою — вимикаємо env щоб текстура (checkerboard) була видна
                child.material.envMapIntensity = 0.0;
              } else {
                // Меші без текстури (штори, меблі) — помірний env для відблисків
                child.material.envMapIntensity = 0.4;
              }
              child.material.needsUpdate = true;
            }
          }
        });

        this.scene.add(this.model);
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
      }
    );
  }

  private createWireframeRoom(): void {
  }

  private removeWireframeRoom(): void {
    this.roomObjects.forEach(obj => {
      this.scene.remove(obj);
      if (obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });
    this.roomObjects = [];
  }

  private createDebugHelpers(): void {
    const axesHelper = new THREE.AxesHelper(0.1);
    axesHelper.visible = false;
    this.debugHelpers.push(axesHelper);
    this.scene.add(axesHelper);

    const headPositionMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );
    headPositionMarker.visible = false;
    this.debugHelpers.push(headPositionMarker);
    this.scene.add(headPositionMarker);
  }

  updateHeadPose(headPose: HeadPose): void {
    this.currentHeadPose = headPose;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.debugHelpers.forEach(helper => {
      helper.visible = enabled;
    });
  }

  updateCalibration(calibration: CalibrationData): void {
    this.offAxisCamera.updateCalibration(calibration);
  }

  updateModelPosition(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.position.set(x, y, z);
    }
  }

  updateModelScale(scale: number): void {
    if (this.model) {
      this.model.scale.set(scale, scale, scale);
    }
  }

  getModelPosition(): { x: number; y: number; z: number } {
    if (this.model) {
      return {
        x: this.model.position.x,
        y: this.model.position.y,
        z: this.model.position.z
      };
    }
    return { x: 0, y: -0.09, z: -0.03 };
  }

  getModelScale(): number {
    if (this.model) {
      return this.model.scale.x;
    }
    return 0.071;
  }

  updateModelRotation(x: number, y: number, z: number): void {
    if (this.model) {
      this.model.rotation.set(x, y, z);
    }
  }

  getModelRotation(): { x: number; y: number; z: number } {
    if (this.model) {
      return {
        x: this.model.rotation.x,
        y: this.model.rotation.y,
        z: this.model.rotation.z
      };
    }
    return { x: 0, y: -0.628, z: 0 };
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    this.offAxisCamera.updateFromHeadPose(this.currentHeadPose);

    if (this.debugMode && this.debugHelpers.length > 1) {
      const worldPos = this.offAxisCamera.headPoseToWorldPosition(this.currentHeadPose);
      this.debugHelpers[1].position.set(worldPos.x, worldPos.y, worldPos.z);
    }

    this.renderer.render(this.scene, this.camera);
  };

  start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.animate();
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose(): void {
    this.stop();

    if (this.model) {
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }

    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}