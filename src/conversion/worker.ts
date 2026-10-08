// Decodes, resizes and encodes images off the main thread, using only built-in browser codecs.
import { ConversionError } from './errors';
import { FORMATS, fitWithin, getFormat, type Dimensions, type FormatId } from './formats';
import type { ConvertResult, ProbeResult, WorkerRequest, WorkerResponse } from './protocol';

const THUMBNAIL_SIZE = 160;

/** iOS Safari's canvas area limit, the strictest of the major browsers. Used to explain canvas failures. */
const SAFE_CANVAS_PIXELS = 4096 * 4096;

async function decode(source: Blob | ImageBitmap): Promise<ImageBitmap> {
  if (source instanceof ImageBitmap) return source;
  try {
    // EXIF orientation is applied by default.
    return await createImageBitmap(source);
  } catch {
    throw new ConversionError('unreadable');
  }
}

function newContext(width: number, height: number): OffscreenCanvasRenderingContext2D {
  const context = new OffscreenCanvas(width, height).getContext('2d');
  if (!context) throw new ConversionError('too-large');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return context;
}

/**
 * Draws [bitmap] at [target] size. Large reductions are done in halving steps, because a single bilinear
 * draw skips most source pixels and looks jagged in browsers that ignore `imageSmoothingQuality`.
 */
function draw(bitmap: ImageBitmap, target: Dimensions, background?: string): OffscreenCanvas {
  let source: CanvasImageSource = bitmap;
  let { width, height } = bitmap;
  while (width / 2 >= target.width && height / 2 >= target.height) {
    width = Math.round(width / 2);
    height = Math.round(height / 2);
    const step = newContext(width, height);
    step.drawImage(source, 0, 0, width, height);
    source = step.canvas;
  }
  const context = newContext(target.width, target.height);
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, target.width, target.height);
  }
  context.drawImage(source, 0, 0, target.width, target.height);
  return context.canvas;
}

async function encode(canvas: OffscreenCanvas, format: FormatId, quality?: number): Promise<Blob> {
  const { mimeType, isLossy } = getFormat(format);
  let blob: Blob;
  try {
    blob = await canvas.convertToBlob({ type: mimeType, quality: isLossy ? quality : undefined });
  } catch (error) {
    if (canvas.width * canvas.height > SAFE_CANVAS_PIXELS) throw new ConversionError('too-large');
    throw error;
  }
  // Browsers silently fall back to PNG for types they can't encode.
  if (blob.type !== mimeType) throw new ConversionError('unsupported-format');
  return blob;
}

async function supportedFormats(): Promise<FormatId[]> {
  const canvas = new OffscreenCanvas(1, 1);
  canvas.getContext('2d');
  const supported: FormatId[] = [];
  for (const format of FORMATS) {
    const blob = await canvas.convertToBlob({ type: format.mimeType }).catch(() => null);
    if (blob?.type === format.mimeType) supported.push(format.id);
  }
  return supported;
}

async function probe(file: Blob): Promise<ProbeResult> {
  const bitmap = await decode(file);
  try {
    const canvas = draw(bitmap, fitWithin(bitmap, THUMBNAIL_SIZE));
    return { width: bitmap.width, height: bitmap.height, thumbnail: await canvas.convertToBlob() };
  } finally {
    bitmap.close();
  }
}

async function convert(request: Extract<WorkerRequest, { type: 'convert' }>): Promise<ConvertResult> {
  const bitmap = await decode(request.source);
  try {
    const target = fitWithin(bitmap, request.longEdge);
    // Formats without transparency are flattened onto white rather than the canvas default of black.
    const background = getFormat(request.format).supportsTransparency ? undefined : '#ffffff';
    const canvas = draw(bitmap, target, background);
    const blob = await encode(canvas, request.format, request.quality / 100);
    return { blob, ...target };
  } finally {
    bitmap.close();
  }
}

function handle(request: WorkerRequest): Promise<unknown> {
  switch (request.type) {
    case 'supportedFormats':
      return supportedFormats();
    case 'probe':
      return probe(request.file);
    case 'convert':
      return convert(request);
  }
}

self.onmessage = async (event: MessageEvent<{ id: number; request: WorkerRequest }>) => {
  const { id, request } = event.data;
  let response: WorkerResponse;
  try {
    response = { id, ok: true, result: await handle(request) };
  } catch (error) {
    response =
      error instanceof ConversionError
        ? { id, ok: false, reason: error.reason }
        : { id, ok: false, reason: 'other', message: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
