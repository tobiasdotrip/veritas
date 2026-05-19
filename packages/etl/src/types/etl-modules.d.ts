declare module "node-stream-zip" {
  import type { EventEmitter } from "node:events";

  interface ZipEntry {
    name: string;
    isDirectory: boolean;
    compressedSize: number;
    size: number;
  }

  interface StreamZipOptions {
    file: string;
    storeEntries?: boolean;
  }

  class StreamZip extends EventEmitter {
    static async: new (config: StreamZipOptions) => AsyncStreamZip;
    constructor(config: StreamZipOptions);
    entries(): Promise<Record<string, ZipEntry>>;
    entry(name: string): ZipEntry | undefined;
    stream(
      entryName: string,
      callback: (err: Error | null, stream: NodeJS.ReadableStream) => void
    ): void;
    extract(
      entryName: string | null,
      targetPath: string,
      callback?: (err?: Error | null) => void
    ): void;
    close(): void;
  }

  class AsyncStreamZip extends StreamZip {
    entries(): Promise<Record<string, ZipEntry>>;
    extract(entryName: string | null, targetPath: string): Promise<void>;
    close(): Promise<void>;
  }

  export = StreamZip;
}

declare module "stream-json/Parser" {
  import type { Transform } from "node:stream";
  export function parser(options?: Record<string, unknown>): Transform;
}

declare module "stream-json/filters/Pick" {
  import type { Transform } from "node:stream";
  export function pick(options?: { filter?: string }): Transform;
}

declare module "stream-json/streamers/StreamArray" {
  import type { Transform } from "node:stream";
  export function streamArray(): Transform &
    AsyncIterable<{ key: number; value: unknown }>;
}
