declare module 'three/examples/jsm/controls/OrbitControls.js' {
  import {Camera} from 'three'
  import {EventDispatcher} from 'three'
  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement)
    enableDamping: boolean
    target: import('three').Vector3
    update(): void
    maxDistance: number
  }
}

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import {Loader} from 'three'
  export interface GLTF { scene: import('three').Group }
  export class GLTFLoader extends Loader {
    loadAsync(url: string, onProgress?: (e: ProgressEvent<EventTarget>) => void): Promise<GLTF>
  }
}

declare module '@mkkellogg/gaussian-splats-3d' {
  export class Viewer {
    constructor(options: any)
    addSplatScene(url: string, options?: any): Promise<void>
    update(): void
    render(): void
  }
} 