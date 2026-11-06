/**
 * The view `Engine.headless` runs with (docs/engine/headless.md): no GPU and no DOM. It keeps what
 * gameplay reads from a view as data, the same as PixelRenderer's: the art resolution and framing
 * of a viewport (`frameView`, the one function both call), the look, mode and filters, and a real
 * `ScreenFx` whose transitions advance with `engine.step()`. It draws nothing: `render`,
 * `precompile` and the animation loop do nothing, `onBeforeRender` keeps its hooks without
 * calling them, and `capture()` rejects (pictures need the browser: `npm run look`, `npm run film`).
 */
import type { Camera } from 'three/webgpu';
import { type AspectMode, type Framing, type Resolution, type Viewport } from '../framing';
import { type Look } from './look';
import { type BackendName, type CapturedFrame, type EdgeSettings, type GpuErrorRecord, type RenderMode } from './PixelRenderer';
import { ScreenFx } from './screenFx';
import type { View } from './view';
/** The viewport a headless view frames by default: the riftlight-replay page's (Riftlight's `fill` gives 480×270). */
export declare const HEADLESS_VIEWPORT: Viewport;
export interface HeadlessViewOptions {
    camera: Camera;
    viewport?: Viewport;
    resolution?: Resolution;
    aspect?: AspectMode;
    mode?: RenderMode;
    edges?: EdgeSettings;
    filters?: readonly string[];
    look?: Look;
}
export declare class HeadlessView implements View {
    readonly container: null;
    readonly backend: BackendName;
    readonly gpuErrors: readonly GpuErrorRecord[];
    readonly recoveries = 0;
    lookVersion: number;
    readonly screen: ScreenFx;
    onRecovered: ((canvas: HTMLCanvasElement) => void) | null;
    onError: ((e: unknown) => void) | null;
    framing: Framing;
    private _viewport;
    private _baseResolution;
    private _resolution;
    private _aspect;
    private _mode;
    private _look;
    private _filters;
    private camera;
    private readonly beforeRender;
    constructor(options: HeadlessViewOptions);
    get viewport(): Viewport;
    /** Frame for another viewport (a recording's: `Recording.view`). */
    setViewport(viewport: Viewport): void;
    layout(): void;
    get resolution(): Resolution;
    get baseResolution(): Resolution;
    setResolution(resolution: Resolution): void;
    get aspect(): AspectMode;
    setAspect(aspect: AspectMode): void;
    get mode(): RenderMode;
    setMode(mode: RenderMode): void;
    toggleMode(): RenderMode;
    get look(): Look;
    setLook(look: Look): void;
    private syncFilters;
    /** The whole-scene filter ids (the same array until they change, as PixelRenderer's). */
    get filters(): readonly string[];
    setFilters(ids: readonly string[]): void;
    get split(): boolean;
    get edges(): EdgeSettings;
    setEdges(edges: Partial<EdgeSettings>): void;
    get activeCamera(): Camera;
    setCamera(camera: Camera): void;
    onBeforeRender(f: () => void): () => void;
    clearBeforeRender(): void;
    precompile(): Promise<void>;
    render(): void;
    capture(): Promise<CapturedFrame>;
    setAnimationLoop(): void;
    dispose(): void;
}
