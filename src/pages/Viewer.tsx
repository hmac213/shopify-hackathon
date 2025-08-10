import {useEffect, useRef, useState, useMemo} from 'react'
import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import {MODEL_GLB_URL, SPLAT_PLY_URL} from '../config/viewer'
import {Button, Card, CardContent, CardHeader, CardTitle} from '@shopify/shop-minis-react'
import {useLocation} from 'react-router'
import {useCategoryProducts} from '../hooks/useCategoryProducts'

function formatMoneyDisplay(maybeMoney: any): string | null {
  const money = maybeMoney ?? null
  const candidate = money && typeof money === 'object' ? money : null
  const amountStr = candidate?.amount ?? null
  const currency = candidate?.currencyCode ?? candidate?.currency ?? null
  if (amountStr && currency) {
    const amount = Number(amountStr)
    if (!Number.isNaN(amount)) {
      try {
        return new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(amount)
      } catch {
        return `${amountStr} ${currency}`
      }
    }
    return `${amountStr} ${currency}`
  }
  return null
}

function extractProductPrice(product: any): string | null {
  const direct = formatMoneyDisplay(product?.price)
  if (direct) return direct
  const rangeMin = formatMoneyDisplay(product?.priceRange?.minVariantPrice)
  if (rangeMin) return rangeMin
  const firstVariant = formatMoneyDisplay(product?.variants?.[0]?.price)
  if (firstVariant) return firstVariant
  return null
}

function ModelPreview({url}: {url: string}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      2000
    )
    camera.position.set(0.8, 0.8, 1.2)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.5, 0)
    controls.enableDamping = true

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0)
    scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(3, 5, 2)
    dir.castShadow = false
    scene.add(dir)

    const loader = new GLTFLoader()
    let disposed = false

    loader
      .loadAsync(url)
      .then(gltf => {
        if (disposed) return
        const model = gltf.scene
        model.traverse(obj => {
          const mesh = obj as THREE.Mesh
          if ((mesh as any).isMesh) {
            mesh.castShadow = false
            mesh.receiveShadow = true
          }
        })
        model.position.set(0, 0, 0)
        model.scale.setScalar(1)
        scene.add(model)

        const bbox = new THREE.Box3().setFromObject(model)
        if (!bbox.isEmpty()) {
          const center = bbox.getCenter(new THREE.Vector3())
          controls.target.copy(center)
          controls.update()
        }
      })
      .catch(() => {})

    function onResize() {
      if (!container) return
      const {clientWidth, clientHeight} = container
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    }

    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)

    const loop = () => {
      if (disposed) return
      controls.update()
      renderer.render(scene, camera)
      requestAnimationFrame(loop)
    }
    loop()

    return () => {
      disposed = true
      resizeObserver.disconnect()
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [url])

  return <div ref={containerRef} className="w-full h-64 rounded-lg overflow-hidden bg-black/40" />
}

export function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showOverlay, setShowOverlay] = useState(false)

  const location = useLocation() as {state?: {category?: string; surprise?: boolean}}
  const category = location?.state?.category ?? ''
  const surprise = !!location?.state?.surprise
  const {products} = useCategoryProducts({category, surprise, first: 20})
  const firstProduct = useMemo(() => products?.[0], [products])
  const firstPrice = useMemo(() => extractProductPrice(firstProduct), [firstProduct])

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

  return (
    <div className="min-h-dvh w-dvw relative">
      <div ref={containerRef} className="min-h-dvh w-dvw" />

      <div className="absolute inset-x-0 bottom-0 pb-8 pt-6 flex justify-center bg-gradient-to-t from-black/50 to-transparent">
        <Button size="lg" onClick={() => setShowOverlay(true)}>View</Button>
      </div>

      {showOverlay && (
        <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-white text-base font-medium">Product</div>
            <Button variant="secondary" onClick={() => setShowOverlay(false)}>✕</Button>
          </div>

          <div className="px-4 pb-4 space-y-4 overflow-auto">
            <ModelPreview url={MODEL_GLB_URL} />

            <Card>
              <CardHeader>
                <CardTitle>{(firstProduct as any)?.title ?? (firstProduct as any)?.name ?? 'Selected Product'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>ID: {(firstProduct as any)?.id ?? '—'}</div>
                  {Boolean((firstProduct as any)?.vendor) && <div>Vendor: {(firstProduct as any)?.vendor}</div>}
                  {firstPrice && <div>Price: {firstPrice}</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
} 