declare module "node-stream-zip" {
  import type { EventEmitter } from "node:events";

  interface ZipEntry {
    name: string;
    isDirectory: boolean;
    compressedSize: number;
    size: number;
    /** External file attributes (Unix mode in upper 16 bits when present). */
    attr: number;
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
      callback: (err: Error | null, stream: NodeJS.ReadableStream) => void,
    ): void;
    extract(
      entryName: string | null,
      targetPath: string,
      callback?: (err?: Error | null) => void,
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

declare module "stream-json/Parser.js" {
  import type { Transform } from "node:stream";
  class Parser extends Transform {
    static parser(options?: Record<string, unknown>): Parser;
    static make(options?: Record<string, unknown>): Parser;
  }
  export default Parser;
}

declare module "stream-json/filters/Pick.js" {
  import type { Transform } from "node:stream";
  class Pick extends Transform {
    static pick(options?: { filter?: string }): Pick;
    static make(options?: { filter?: string }): Pick;
  }
  export default Pick;
}

declare module "stream-json/streamers/StreamArray.js" {
  import type { Transform } from "node:stream";
  class StreamArray extends Transform {
    static streamArray(): StreamArray;
    static make(): StreamArray;
  }
  export default StreamArray;
}
