import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { boneName, type Language, type Region } from "../data/anatomy";
import { entityById, systems, type System } from "../data/systems";

export type View = "anterior" | "posterior" | "lateral";
export type ViewerHandle = {
  reset: () => void;
  zoom: (direction: number) => void;
  focus: () => void;
  view: (view: View) => void;
};
type Props = {
  system: System;
  selected: string;
  region: Region | "all";
  isolate: boolean;
  hidden: string[];
  labels: boolean;
  ghost: boolean;
  connective: boolean;
  rotate: boolean;
  language: Language;
  quiz: boolean;
  onSelect: (id: string) => void;
  onReady: (count: number) => void;
  onInteract: () => void;
};
type Runtime = {
  scene: THREE.Scene;
  root: THREE.Group;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  meshes: THREE.Mesh[];
  target: { position: THREE.Vector3; lookAt: THREE.Vector3 } | null;
  bounds: THREE.Box3;
  update: () => void;
};

export default forwardRef<ViewerHandle, Props>(
  function SkeletonViewer(props, ref) {
    const host = useRef<HTMLDivElement>(null);
    const runtime = useRef<Runtime | null>(null);
    const latest = useRef(props);
    latest.current = props;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [hover, setHover] = useState<{
      name: string;
      x: number;
      y: number;
    } | null>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const regionRef = useRef<string>(props.region);

    const moveToBone = () => {
      const rt = runtime.current;
      if (!rt) return;
      const mesh = rt.meshes.find(
        (m) => m.userData.boneId === latest.current.selected,
      );
      if (!mesh) return;
      const box = new THREE.Box3().setFromObject(mesh),
        center = box.getCenter(new THREE.Vector3());
      const size = Math.max(
        box.getSize(new THREE.Vector3()).length() * 1.45,
        0.12,
      );
      const direction = rt.camera.position
        .clone()
        .sub(rt.controls.target)
        .normalize();
      rt.target = {
        lookAt: center,
        position: center
          .clone()
          .add(
            direction.multiplyScalar(
              size / Math.tan(THREE.MathUtils.degToRad(rt.camera.fov / 2)),
            ),
          ),
      };
    };
    const reset = (view: View = "anterior") => {
      const rt = runtime.current;
      if (!rt) return;
      const box = latest.current.isolate
        ? new THREE.Box3().setFromObject(
            rt.meshes.find(
              (m) => m.userData.boneId === latest.current.selected,
            )!,
          )
        : rt.bounds;
      const center = box.getCenter(new THREE.Vector3());
      const height = box.getSize(new THREE.Vector3()).y;
      const distance =
        (Math.max(height, 0.4) /
          (2 * Math.tan(THREE.MathUtils.degToRad(rt.camera.fov / 2)))) *
        1.12;
      const vector =
        view === "posterior"
          ? new THREE.Vector3(0, 0, -distance)
          : view === "lateral"
            ? new THREE.Vector3(distance, 0, 0)
            : new THREE.Vector3(0.06 * distance, 0.015 * distance, distance);
      rt.target = { lookAt: center, position: center.clone().add(vector) };
    };
    useImperativeHandle(ref, () => ({
      reset: () => reset(),
      focus: moveToBone,
      view: reset,
      zoom: (direction) => {
        const rt = runtime.current;
        if (rt)
          rt.target = {
            lookAt: rt.controls.target.clone(),
            position: rt.controls.target.clone().add(
              rt.camera.position
                .clone()
                .sub(rt.controls.target)
                .multiplyScalar(direction > 0 ? 0.76 : 1.3),
            ),
          };
      },
    }));

    useEffect(() => {
      const element = host.current!;
      setLoading(true);
      setError("");
      setHover(null);
      latest.current.onReady(0);
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        setError(
          "Este dispositivo no ha podido iniciar WebGL. Puedes seguir estudiando con el catálogo y el diccionario.",
        );
        setLoading(false);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      element.appendChild(renderer.domElement);
      renderer.domElement.setAttribute(
        "aria-label",
        `Modelo 3D interactivo: ${systems.find((s) => s.id === props.system)!.name}. Arrastra para girar y usa la rueda para acercar.`,
      );
      renderer.domElement.setAttribute("role", "img");
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.002, 100);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.06;
      controls.maxDistance = 8;
      controls.autoRotateSpeed = 0.8;
      controls.maxPolarAngle = Math.PI * 0.96;
      controls.minPolarAngle = 0.04;
      controls.target.set(0, 0.8, 0);
      camera.position.set(0.2, 0.85, 3.5);
      scene.add(new THREE.HemisphereLight(0xeaf4f6, 0x464936, 2.6));
      const key = new THREE.DirectionalLight(0xfff3db, 3.6);
      key.position.set(-3, 4, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xc0d7c5, 2.2);
      fill.position.set(3, 1, -3);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xe1efff, 1.8);
      rim.position.set(-2, 2, -2);
      scene.add(rim);
      const root = new THREE.Group();
      scene.add(root);
      const rt: Runtime = {
        scene,
        root,
        camera,
        controls,
        renderer,
        meshes: [],
        target: null,
        bounds: new THREE.Box3(),
        update: () => {},
      };
      runtime.current = rt;
      let disposed = false;
      const base = new THREE.MeshStandardMaterial({
        color: 0xd3c6a5,
        roughness: 0.65,
        metalness: 0.03,
      });
      const selected = new THREE.MeshStandardMaterial({
        color: 0xa3d3a1,
        emissive: 0x365c31,
        emissiveIntensity: 0.35,
        roughness: 0.45,
        metalness: 0.08,
      });
      const ghost = new THREE.MeshStandardMaterial({
        color: 0x9eafa5,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        roughness: 0.8,
      });
      const dim = new THREE.MeshStandardMaterial({
        color: 0x687872,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        roughness: 0.8,
      });
      const originalMaterials = new Set<THREE.Material>();
      rt.update = () => {
        const p = latest.current;
        for (const mesh of rt.meshes) {
          const id = mesh.userData.boneId;
          const isSelected = id === p.selected;
          const inRegion =
            p.region === "all" || mesh.userData.region === p.region;
          const coveringTissue =
            p.system === "muscular" &&
            /fascia|bursa|tendon sheath|septum/i.test(
              entityById[id]?.english || "",
            );
          mesh.visible =
            !p.hidden.includes(id) &&
            (!p.isolate || isSelected) &&
            (!coveringTissue || p.connective || isSelected);
          mesh.material = isSelected
            ? selected
            : !inRegion
              ? dim
              : p.ghost
                ? ghost
                : p.system === "skeletal"
                  ? base
                  : mesh.userData.originalMaterial;
          mesh.renderOrder = isSelected ? 2 : !inRegion || p.ghost ? 1 : 0;
        }
        controls.autoRotate = p.rotate;
      };
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(
        `/models/${systems.find((s) => s.id === props.system)!.file}.glb`,
        (gltf) => {
          if (disposed) {
            gltf.scene.traverse((o) => {
              if (o instanceof THREE.Mesh) o.geometry.dispose();
            });
            return;
          }
          root.add(gltf.scene);
          const rawBox = new THREE.Box3().setFromObject(root);
          const rawCenter = rawBox.getCenter(new THREE.Vector3()),
            rawSize = rawBox.getSize(new THREE.Vector3());
          const scale = 1.8 / rawSize.y;
          root.scale.setScalar(scale);
          root.position.set(
            -rawCenter.x * scale,
            -rawBox.min.y * scale,
            -rawCenter.z * scale,
          );
          root.updateMatrixWorld(true);
          root.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              // glTF extras can belong to a mesh's parent node when Blender splits primitives.
              let node: THREE.Object3D | null = obj;
              while (
                node &&
                !node.userData.boneId &&
                !node.userData.entityId &&
                !node.userData.decorative
              )
                node = node.parent;
              if (node) Object.assign(obj.userData, node.userData);
              obj.userData.boneId ||= obj.userData.entityId;
              obj.userData.originalMaterial = obj.material;
              for (const mat of Array.isArray(obj.material)
                ? obj.material
                : [obj.material])
                originalMaterials.add(mat);
              // glTF already supplies smooth normals. Recomputing into quantized
              // integer attributes can overflow and turn correctly lit surfaces black.
              if (!obj.geometry.hasAttribute("normal"))
                obj.geometry.computeVertexNormals();
              obj.material = base;
              rt.meshes.push(obj);
            }
          });
          rt.bounds.setFromObject(root);
          rt.update();
          setLoading(false);
          latest.current.onReady(
            new Set(rt.meshes.map((m) => m.userData.boneId).filter(Boolean))
              .size,
          );
          reset();
        },
        undefined,
        () => {
          if (!disposed) {
            setError(
              "No se ha podido cargar el modelo. Comprueba la conexión y vuelve a intentarlo.",
            );
            setLoading(false);
          }
        },
      );

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDown = { x: 0, y: 0 };
      const hitAt = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(
          rt.meshes.filter(
            (m) =>
              m.visible &&
              m.userData.boneId &&
              (latest.current.region === "all" ||
                m.userData.region === latest.current.region),
          ),
          false,
        )[0];
      };
      const onDown = (e: PointerEvent) => {
        pointerDown = { x: e.clientX, y: e.clientY };
        rt.target = null;
        latest.current.onInteract();
      };
      const onUp = (e: PointerEvent) => {
        if (
          Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) < 5
        ) {
          const hit = hitAt(e);
          if (hit) latest.current.onSelect(hit.object.userData.boneId);
        }
      };
      const onMove = (e: PointerEvent) => {
        if (e.buttons) {
          setHover(null);
          return;
        }
        const hit = hitAt(e);
        const rect = element.getBoundingClientRect();
        const bone = hit && entityById[hit.object.userData.boneId];
        element.style.cursor = bone ? "pointer" : "grab";
        setHover(
          bone && !latest.current.quiz
            ? {
                name: boneName(bone, latest.current.language),
                x: Math.min(e.clientX - rect.left + 16, rect.width - 200),
                y: e.clientY - rect.top - 35,
              }
            : null,
        );
      };
      const onLeave = () => setHover(null);
      const onWheel = () => {
        rt.target = null;
        latest.current.onInteract();
      };
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointerup", onUp);
      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("pointerleave", onLeave);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
      const observer = new ResizeObserver(() => {
        const w = element.clientWidth,
          h = element.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      observer.observe(element);
      let frame = 0;
      const render = () => {
        frame = requestAnimationFrame(render);
        if (rt.target) {
          camera.position.lerp(rt.target.position, 0.12);
          controls.target.lerp(rt.target.lookAt, 0.12);
          if (
            camera.position.distanceTo(rt.target.position) < 0.0005 &&
            controls.target.distanceTo(rt.target.lookAt) < 0.0005
          )
            rt.target = null;
        }
        controls.update();
        const label = labelRef.current;
        if (label) {
          const mesh = rt.meshes.find(
            (m) => m.userData.boneId === latest.current.selected,
          );
          if (mesh) {
            const point = new THREE.Box3()
              .setFromObject(mesh)
              .getCenter(new THREE.Vector3())
              .project(camera);
            label.style.left = `${((point.x + 1) / 2) * element.clientWidth}px`;
            label.style.top = `${((-point.y + 1) / 2) * element.clientHeight}px`;
            label.style.visibility =
              mesh.visible &&
              Math.abs(point.x) < 0.78 &&
              Math.abs(point.y) < 0.9 &&
              point.z < 1
                ? "visible"
                : "hidden";
          }
        }
        renderer.render(scene, camera);
      };
      render();
      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("pointerup", onUp);
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerleave", onLeave);
        renderer.domElement.removeEventListener("wheel", onWheel);
        root.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        });
        for (const mat of originalMaterials) mat.dispose();
        base.dispose();
        selected.dispose();
        ghost.dispose();
        dim.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        runtime.current = null;
      };
    }, [props.system]);

    useEffect(() => {
      runtime.current?.update();
      if (props.isolate) moveToBone();
      else if (regionRef.current !== props.region) {
        regionRef.current = props.region;
        reset();
      }
    }, [
      props.selected,
      props.region,
      props.isolate,
      props.hidden,
      props.ghost,
      props.rotate,
      props.connective,
    ]);
    return (
      <div className="skeleton-canvas" ref={host} data-testid="skeleton-viewer">
        {loading && (
          <div className="viewer-message">
            <span className="loading-orbit" />
            <strong>Preparando tu atlas</strong>
            <span>
              Cargando{" "}
              {systems.find((s) => s.id === props.system)!.name.toLowerCase()}…
            </span>
          </div>
        )}
        {error && (
          <div className="viewer-message error">
            <strong>Vista 3D no disponible</strong>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        )}
        {!loading && !error && props.labels && !props.quiz && (
          <div className="bone-label" ref={labelRef}>
            <span className="label-line" />
            <div>
              <span>ESTRUCTURA SELECCIONADA</span>
              <strong>
                {boneName(entityById[props.selected], props.language)}
              </strong>
            </div>
          </div>
        )}
        {hover && (
          <div className="bone-tooltip" style={{ left: hover.x, top: hover.y }}>
            {hover.name}
          </div>
        )}
      </div>
    );
  },
);
