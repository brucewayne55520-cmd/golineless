/**
 * Runtime polyfill for `File` and `Blob` constructors.
 *
 * The generated `UploadPhotoBody` zod schema uses `zod.instanceof(File)`,
 * which requires `File` to exist as a constructor at runtime.
 * Node.js 20+ includes `File` and `Blob` natively, but older runtimes
 * (Node 16, some serverless environments, bundle targets) do not.
 *
 * This polyfill only applies when the native constructor is missing.
 * The implementations are intentionally minimal — they exist solely
 * to prevent `zod.instanceof()` from throwing, since the upload
 * endpoint typically runs in the browser (where `File` is natively
 * available) or behind a multer middleware (which parses the
 * multipart body before any zod validation runs).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */

// ---------------------------------------------------------------------------
// Blob polyfill (minimal)
// ---------------------------------------------------------------------------
var _global = globalThis as any;

if (typeof _global.Blob === "undefined") {
  _global.Blob = class Blob {
    size: number = 0;
    type: string = "";

    constructor(blobParts?: any[], options?: { type?: string }) {
      if (blobParts) {
        this.size = blobParts.reduce((acc: number, part: any) => {
          if (typeof part === "string") return acc + part.length;
          if (part && typeof part.size === "number") return acc + part.size;
          if (part && typeof part.byteLength === "number") return acc + part.byteLength;
          return acc;
        }, 0);
      }
      if (options?.type) this.type = options.type;
    }

    slice(_start?: number, _end?: number, contentType?: string): globalThis.Blob {
      return _global.Blob ? new _global.Blob([], { type: contentType ?? this.type }) : this as any;
    }

    async text(): Promise<string> {
      return "";
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      return new ArrayBuffer(0);
    }
  };
  _global.Blob.prototype.constructor = _global.Blob;
}

// ---------------------------------------------------------------------------
// File polyfill (minimal)
// ---------------------------------------------------------------------------
if (typeof _global.File === "undefined") {
  _global.File = class File {
    name: string = "";
    size: number = 0;
    type: string = "";
    lastModified: number = Date.now();

    constructor(fileBits: any[], fileName: string, options?: { type?: string; lastModified?: number }) {
      const BlobCtor = _global.Blob;
      if (BlobCtor) {
        const blob = new BlobCtor(fileBits, { type: options?.type });
        this.size = blob.size;
        this.type = blob.type;
      }
      this.name = fileName;
      this.lastModified = options?.lastModified ?? Date.now();
    }

    slice(_start?: number, _end?: number, contentType?: string): globalThis.Blob {
      const BlobCtor = _global.Blob;
      return BlobCtor ? new BlobCtor([], { type: contentType ?? this.type }) : this as any;
    }

    async text(): Promise<string> {
      return "";
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      return new ArrayBuffer(0);
    }
  };
  _global.File.prototype.constructor = _global.File;
}
