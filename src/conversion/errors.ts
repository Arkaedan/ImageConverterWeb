export type FailureReason = 'unreadable' | 'too-large' | 'unsupported-format' | 'other';

/** A conversion failure with a reason the UI can explain. Survives the trip from the worker as plain data. */
export class ConversionError extends Error {
  constructor(
    readonly reason: FailureReason,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = 'ConversionError';
  }
}

export function failureText(reason: FailureReason, message?: string): string {
  switch (reason) {
    case 'unreadable':
      return "Couldn't read this image";
    case 'too-large':
      return 'Image is too large to convert in this browser';
    case 'unsupported-format':
      return "This browser can't write that format";
    case 'other':
      return message ? `Conversion failed: ${message}` : 'Conversion failed';
  }
}
