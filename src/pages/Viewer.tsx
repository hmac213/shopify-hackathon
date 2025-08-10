import {useEffect, useRef} from 'react'
import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import {MODEL_GLB_URL, SPLAT_PLY_URL} from '../config/viewer'

export function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const missingUrls = !SPLAT_PLY_URL || !MODEL_GLB_URL

  useEffect(() => {
    if (!containerRef.current) return
    if (missingUrls) return

    const container = containerRef.current
    const renderer = new THREE.WebGLRenderer({antialias: true})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0c0c0c)

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      5000
    )
    camera.position.set(1.5, 1.0, 2.0)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.6, 0)
    controls.enableDamping = true

    const gsViewer = new GaussianSplats3D.Viewer({
      selfDrivenMode: false,
      threeScene: scene,
      renderer,
      camera,
      useBuiltInControls: false,
      dynamicScene: true,
    })

    let disposed = false

    async function loadAssets() {
      try {
        await gsViewer.addSplatScene(SPLAT_PLY_URL, {
          opacity: 1.0,
          gamma: 1.0,
          maxGaussians: 2_000_000,
          rotation: [1, 0, 0, 0],
        })
      } catch (e) {
        console.warn('Splat asset load failed:', e)
      }

      try {
        const gltfLoader = new GLTFLoader()
        const gltf = await gltfLoader.loadAsync(MODEL_GLB_URL)
        const meshRoot = gltf.scene
        meshRoot.traverse((obj: THREE.Object3D) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            mesh.castShadow = false
            mesh.receiveShadow = true
          }
        })
        meshRoot.position.set(0, 0, 0)
        meshRoot.scale.setScalar(1)
        scene.add(meshRoot)

        const bbox = new THREE.Box3().setFromObject(meshRoot)
        if (bbox.isEmpty() === false) {
          const size = bbox.getSize(new THREE.Vector3()).length()
          const center = bbox.getCenter(new THREE.Vector3())
          const fitOffset = 1.6
          const distance = (size / (2 * Math.tan((Math.PI * camera.fov) / 360))) * fitOffset
          const dir = controls.target.clone().sub(camera.position).normalize().multiplyScalar(-1)
          camera.position.copy(dir.multiplyScalar(distance).add(center))
          controls.maxDistance = distance * 10
          controls.target.copy(center)
          controls.update()
        }
      } catch (e) {
        console.warn('GLB asset load failed:', e)
      }
    }

    loadAssets()

    function onResize() {
      if (!container) return
      const {clientWidth, clientHeight} = container
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)

    renderer.setAnimationLoop(() => {
      if (disposed) return
      controls.update()
      gsViewer.update()
      gsViewer.render()
    })

    return () => {
      disposed = true
      resizeObserver.disconnect()
      renderer.setAnimationLoop(null as any)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [missingUrls])

  if (missingUrls) {
    return (
      <div className="min-h-dvh w-dvw flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-lg font-semibold">Set your CDN asset URLs</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Update <code>src/config/viewer.ts</code> with <code>SPLAT_PLY_URL</code> and <code>MODEL_GLB_URL</code>.
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className="min-h-dvh w-dvw" />
} 