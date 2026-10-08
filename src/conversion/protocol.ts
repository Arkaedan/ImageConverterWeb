import type { FailureReason } from './errors';
import type { FormatId, OutputSize } from './formats';

/** Messages the page sends to the conversion worker. */
export type WorkerRequest =
  | { type: 'supportedFormats' }
  | { type: 'probe'; file: Blob }
  | {
      type: 'convert';
      /** A raster file to decode, or an SVG already rendered at its output size. */
      source: Blob | ImageBitmap;
      format: FormatId;
      quality: number;
      longEdge: OutputSize;
    };

export interface ProbeResult {
  width: number;
  height: number;
  thumbnail: Blob;
}

export interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
}

export interface WorkerResults {
  supportedFormats: FormatId[];
  probe: ProbeResult;
  convert: ConvertResult;
}

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; reason: FailureReason; message?: string };
