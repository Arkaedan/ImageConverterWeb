import { CancelledError, ConversionWorker } from '../conversion/client';
import { ConversionError, type FailureReason } from '../conversion/errors';
import {
  fitWithin,
  formatLabel,
  isSvgFile,
  outputFileName,
  sameOutput,
  type ConversionSettings,
  type FormatId,
  type OutputSize,
} from '../conversion/formats';
import { readSvg, renderSvg } from '../conversion/svg';
import { loadSettings, saveSettings } from './settings';

export interface ConversionOutput {
  blob: Blob;
  url: string;
  name: string;
  format: FormatId;
  width: number;
  height: number;
}

export type ItemStatus =
  | { kind: 'idle' }
  | { kind: 'queued' }
  | { kind: 'converting' }
  /** [settings] are the ones used, so the image is converted again if they change. */
  | { kind: 'done'; output: ConversionOutput; settings: ConversionSettings }
  | { kind: 'failed'; reason: FailureReason; message?: string };

export interface ImageItem {
  id: number;
  file: File;
  name: string;
  isSvg: boolean;
  formatLabel: string | null;
  loadState: 'loading' | 'loaded' | 'failed';
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  status: ItemStatus;
}

export type UserMessage =
  | { kind: 'finished'; succeeded: number; failed: number }
  | { kind: 'cancelled' };

export interface Progress {
  completed: number;
  total: number;
}

function needsConversion(item: ImageItem, settings: ConversionSettings): boolean {
  return item.loadState === 'loaded' && !(item.status.kind === 'done' && sameOutput(item.status.settings, settings));
}

/** Files are treated as the same image when they look identical, since browsers don't expose their paths. */
function fileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

/** App state and the conversion queue. The web counterpart of the Android app's ConverterViewModel. */
export class ConverterStore {
  items = $state<ImageItem[]>([]);
  settings = $state<ConversionSettings>(loadSettings());
  /** `null` until the worker has reported which formats this browser can encode. */
  supportedFormats = $state.raw<FormatId[] | null>(null);
  /** Non-null while a conversion is running. */
  progress = $state<Progress | null>(null);
  message = $state.raw<UserMessage | null>(null);

  isConverting = $derived(this.progress !== null);
  isLoading = $derived(this.items.some((item) => item.loadState === 'loading'));
  /** Images that Convert would process: readable, and not already converted with these settings. */
  pendingItems = $derived(this.items.filter((item) => needsConversion(item, this.settings)));
  hasSvg = $derived(this.items.some((item) => item.isSvg));
  outputs = $derived(
    this.items.flatMap((item) => (item.status.kind === 'done' ? [item.status.output] : [])),
  );

  // Probing gets its own worker so cancelling a conversion doesn't interrupt images still being added.
  private readonly probeWorker = new ConversionWorker();
  private readonly convertWorker = new ConversionWorker();
  private probeQueue = Promise.resolve();
  private nextId = 0;
  private cancelled = false;

  constructor() {
    this.detectFormats();
  }

  private async detectFormats() {
    try {
      const supported = await this.convertWorker.request({ type: 'supportedFormats' });
      this.supportedFormats = supported;
      // Don't save the fallback: the saved format is still right for browsers that can write it.
      if (!supported.includes(this.settings.format)) this.settings.format = 'jpeg';
    } catch {
      // Leave every format enabled; a conversion to an unsupported one fails with a clear message.
    }
  }

  isFormatSupported(format: FormatId): boolean {
    return this.supportedFormats === null || this.supportedFormats.includes(format);
  }

  /**
   * Whether [size] would change at least one image. Raster images are never enlarged, so a limit at or above
   * every photo's longest side does nothing; SVGs are drawn at any size, so they keep all sizes useful.
   * Images still loading count as useful until their dimensions are known.
   */
  isSizeUseful(size: OutputSize): boolean {
    if (size === null) return true;
    return this.items.some(
      (item) =>
        item.isSvg ||
        item.loadState === 'loading' ||
        (item.width !== undefined && item.height !== undefined && Math.max(item.width, item.height) > size),
    );
  }

  addFiles(files: Iterable<File>) {
    const existing = new Set(this.items.map((item) => fileKey(item.file)));
    for (const file of files) {
      const key = fileKey(file);
      if (existing.has(key)) continue;
      existing.add(key);
      const item: ImageItem = {
        id: this.nextId++,
        file,
        name: file.name || 'image',
        isSvg: isSvgFile(file),
        formatLabel: formatLabel(file.type, file.name),
        loadState: 'loading',
        status: { kind: 'idle' },
      };
      this.items.push(item);
      // Probe one image at a time to bound memory, since each is fully decoded.
      this.probeQueue = this.probeQueue.then(() => this.probe(item.id));
    }
  }

  private async probe(id: number) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    try {
      if (item.isSvg) {
        const { size } = await readSvg(item.file);
        item.width = Math.round(size.width);
        item.height = Math.round(size.height);
        item.thumbnailUrl = URL.createObjectURL(item.file);
      } else {
        const result = await this.probeWorker.request({ type: 'probe', file: item.file });
        item.width = result.width;
        item.height = result.height;
        item.thumbnailUrl = URL.createObjectURL(result.thumbnail);
      }
      item.loadState = 'loaded';
    } catch {
      item.loadState = 'failed';
    }
    // The image may have been removed while it was being probed.
    if (!this.items.some((i) => i.id === id) && item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
  }

  remove(id: number) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0 || this.isConverting) return;
    release(this.items[index]);
    this.items.splice(index, 1);
  }

  clear() {
    if (this.isConverting) return;
    this.items.forEach(release);
    this.items = [];
  }

  updateSettings(changes: Partial<ConversionSettings>) {
    if (this.isConverting) return;
    Object.assign(this.settings, changes);
    saveSettings($state.snapshot(this.settings));
  }

  async convert() {
    if (this.isConverting) return;
    const settings = $state.snapshot(this.settings);
    const queue = this.pendingItems;
    if (queue.length === 0) return;
    queue.forEach((item) => {
      if (item.status.kind === 'done') URL.revokeObjectURL(item.status.output.url);
      item.status = { kind: 'queued' };
    });
    this.cancelled = false;
    this.progress = { completed: 0, total: queue.length };
    let succeeded = 0;
    let failed = 0;

    for (const item of queue) {
      if (this.cancelled) break;
      item.status = { kind: 'converting' };
      try {
        const output = await this.convertItem(item, settings);
        if (item.status.kind !== 'converting') {
          // Cancelled after the worker finished; keep things tidy.
          URL.revokeObjectURL(output.url);
          break;
        }
        item.status = { kind: 'done', output, settings };
        succeeded++;
      } catch (error) {
        if (error instanceof CancelledError) break;
        const reason = error instanceof ConversionError ? error.reason : 'other';
        const message = error instanceof Error ? error.message : String(error);
        item.status = { kind: 'failed', reason, message };
        failed++;
      }
      this.progress.completed++;
    }

    queue.forEach((item) => {
      if (item.status.kind === 'queued' || item.status.kind === 'converting') item.status = { kind: 'idle' };
    });
    this.progress = null;
    this.message = this.cancelled ? { kind: 'cancelled' } : { kind: 'finished', succeeded, failed };
  }

  cancel() {
    if (!this.isConverting) return;
    this.cancelled = true;
    // Stopping the worker abandons the current image straight away instead of waiting for it to finish.
    this.convertWorker.terminate();
    this.items.forEach((item) => {
      if (item.status.kind === 'converting') item.status = { kind: 'idle' };
    });
  }

  private async convertItem(item: ImageItem, settings: ConversionSettings): Promise<ConversionOutput> {
    let source: Blob | ImageBitmap = item.file;
    let longEdge = settings.size;
    if (item.isSvg) {
      // SVGs are drawn at exactly the chosen size, so they can be enlarged as well as shrunk.
      const svg = await readSvg(item.file);
      source = await renderSvg(svg, fitWithin(svg.size, settings.size, true));
      longEdge = null;
    }
    const transfer = source instanceof ImageBitmap ? [source] : [];
    const result = await this.convertWorker.request(
      { type: 'convert', source, format: settings.format, quality: settings.quality, longEdge },
      transfer,
    );
    return {
      blob: result.blob,
      url: URL.createObjectURL(result.blob),
      name: outputFileName(item.name, settings.format),
      format: settings.format,
      width: result.width,
      height: result.height,
    };
  }
}

function release(item: ImageItem) {
  if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
  if (item.status.kind === 'done') URL.revokeObjectURL(item.status.output.url);
}
