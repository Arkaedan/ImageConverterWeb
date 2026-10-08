import { ConversionError } from './errors';
import type { WorkerRequest, WorkerResponse, WorkerResults } from './protocol';

/** Thrown for requests that were still running when the worker was terminated. */
export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

interface Pending {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Promise-based access to a conversion worker. The worker is started on first use, and [terminate] stops it
 * mid-conversion; the next request starts a fresh one.
 */
export class ConversionWorker {
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 0;

  request<T extends WorkerRequest>(request: T, transfer: Transferable[] = []): Promise<WorkerResults[T['type']]> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (result: unknown) => void, reject });
      worker.postMessage({ id, request }, transfer);
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    for (const { reject } of this.pending.values()) reject(new CancelledError());
    this.pending.clear();
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.id);
      if (!pending) return;
      this.pending.delete(response.id);
      if (response.ok) pending.resolve(response.result);
      else pending.reject(new ConversionError(response.reason, response.message));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      const error = new ConversionError('other', event.message || 'The converter stopped unexpectedly');
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
      this.worker?.terminate();
      this.worker = null;
    };
    this.worker = worker;
    return worker;
  }
}
