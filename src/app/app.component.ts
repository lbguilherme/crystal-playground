import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { initEditor } from './monaco';
import { WASI, WASIBindings, WASIExitError, WASIKillError } from '../wasi';
import WasmFs from "@wasmer/wasmfs";
import { TerminalComponent } from './terminal/terminal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
})
export class AppComponent {
  title = 'crystal-playground';

  editorOptions = { theme: 'vs-dark', language: 'crystal' };

  code = atob(window.location.hash.slice(1)) || `
# Welcome to the Crystal Playground
#
# This is a proof of concept and as such is incomplete and incorrect. Please try!
# The default prelude can't yet be included because we lack exception support (see #11658).
#
# Everything here runs inside your browser.
#
# For more details see https://github.com/crystal-lang/crystal/issues/10870
# Playground source code: https://github.com/lbguilherme/crystal-playground
#
# If you are using a Chromium-based browser, keep the DevTools open or else it runs
# out of memory (browser bug). Firefox seems to handle it much better.

require "lib_c"
require "c/*"

class String
  def to_unsafe
    pointerof(@c)
  end
end

LibC.printf "Hello from WebAssembly!\\n"
`;

  crystalWasm = (async () => {
    return await WebAssembly.compileStreaming(fetch('assets/crystal.wasm'));
  })();

  wasmLdWasm = (async () => {
    return await WebAssembly.compileStreaming(fetch('assets/wasm-ld.wasm'));
  })();

  fsJson = (async () => {
    const data = await (await fetch("assets/fs.json")).json();
    const blob = await (await fetch("assets/fs.blob")).arrayBuffer();
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value ? new Uint8Array(blob, ...(value as [number, number])) : null]));
  })();

  @ViewChild(TerminalComponent) terminal!: TerminalComponent;

  busy = false;
  optimizeFlag = false;

  constructor(private changeDetector: ChangeDetectorRef) {}

  onCodeChange(code: string) {
    window.location.hash = btoa(code);
  }

  ngAfterViewInit() {
    this.version();
  }

  onInit(editor: any) {
    initEditor(editor);
  }

  async version() {
    const wasmFs = new WasmFs();

    await this.executeCommand(this.crystalWasm, wasmFs, ["crystal", "--version"]);
  }

  async format() {
    const wasmFs = new WasmFs();
    wasmFs.fs.writeFileSync("/code.cr", this.code);

    await this.executeCommand(this.crystalWasm, wasmFs, ["crystal", "tool", "format", "/code.cr"]);

    this.code = wasmFs.fs.readFileSync("/code.cr", "utf8") as string;
  }

  async run(download: boolean) {
    const wasmFs = new WasmFs();
    wasmFs.fromJSON(await this.fsJson);
    wasmFs.fs.writeFileSync("/code.cr", this.code);
    wasmFs.fs.writeFileSync("/dev/zero", "");

    await this.executeCommand(this.crystalWasm, wasmFs, [
      "crystal", "build", "/code.cr", "--cross-compile", "--prelude", "empty", ...(this.optimizeFlag ? ["--release"] : [])
    ], {
      CRYSTAL_PATH: "/crystal/src"
    });

    await this.executeCommand(this.wasmLdWasm, wasmFs, [
      "wasm-ld", "/code.wasm", "-o", "/program.wasm",
      "/lib/wasm32-wasi/crt1.o",
      "/lib/wasm32-wasi/libc.a"
    ]);

    if (download) {
      this.terminal.writeln("$ download /program.wasm");
      const data = wasmFs.fs.readFileSync("/program.wasm") as ArrayBufferView;

      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.setAttribute('style', 'display: none');
      a.href = url;
      a.download = "program.wasm";
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } else {
      await this.executeCommand(WebAssembly.compile(wasmFs.fs.readFileSync("/program.wasm") as ArrayBufferView), wasmFs, [
        "/program.wasm"
      ]);
    }
  }

  private async executeCommand(modulePromise: Promise<WebAssembly.Module>, wasmFs: WasmFs, args: string[], env: Record<string, string> = {}) {
    this.busy = true;
    this.changeDetector.detectChanges();

    try {
      this.terminal.writeln("$ " + args.join(" "));
      await new Promise(resolve => requestAnimationFrame(resolve));

      const wasi = new WASI({
        env,
        args,
        preopens: {
          "/": "/"
        },
        bindings: this.getBindings(wasmFs)
      });

      const module = await modulePromise;

      const instance = await WebAssembly.instantiate(module, {
        ...wasi.getImports(module)
      });

      try {
        wasi.start(instance);
        return [-1];
      } catch (e) {
        if (e instanceof WASIExitError) {
          if (e.code !== 0) {
            this.terminal.writeln("\n\n" + (e.stack ?? "").split("\n").filter(line => line.includes("wasm-function")).map(line => line.replace(/http:.*wasm:wasm-function/, "")).join("\n"));
            this.terminal.writeln(`exit code: ${e.code}`);
            throw e;
          }
          return [e.code, e.stack];
        } else {
          throw e;
        }
      }
    } catch (e) {
      if (!(e instanceof WASIExitError)) {
        this.terminal.writeln(`JavaScript Error: ${e}`);
        if (e instanceof Error && e.stack) this.terminal.writeln(e.stack);
      }
      throw e;
    } finally {
      this.busy = false;
      this.changeDetector.detectChanges();
      this.terminal.writeln("");
    }
  }

  private getBindings(wasmFs: WasmFs): WASIBindings {
    return {
      exit: (code) => { throw new WASIExitError(code); },
      kill: (signal) => { throw new WASIKillError(signal); },
      hrtime: () => { return BigInt(0); },
      isTTY: () => { return false; },
      path: require("path-browserify"),
      randomFillSync: (buffer, offset, size) => {
        var array = new Uint8Array((buffer as any).buffer, offset, size)
        crypto.getRandomValues(array)
        return buffer;
      },
      fs: {
        ...wasmFs.fs,
        writeSync: (fd: number, buffer: Uint8Array, offset?: number | undefined, length?: number | undefined, position?: number | undefined) =>{
          if (fd === 1 || fd === 2) {
            const data = new Uint8Array(buffer.buffer, buffer.byteOffset + (offset ?? 0), Math.min(buffer.byteLength - (offset ?? 0), length ?? buffer.byteLength));
            this.terminal.write(String.fromCharCode(...data));
            return data.length;
          }
          return wasmFs.fs.writeSync(fd, buffer, offset, length, position);
        },
        // readSync: (fd: number, buffer: Uint8Array | Buffer, offset: number, length: number, position: number) => {
        //   console.log("readSync", {fd, buffer, offset, length, position});
        //   return wasmFs.fs.readSync(fd, buffer, offset, length, position);
        // },
        // statSync: (path: string) => {
        //   console.log("statSync", {path});
        //   const stat = wasmFs.fs.statSync(path);
        //   if (path === "/program.wasm" || path.startsWith("/lib/")) {
        //     return {
        //       ...stat,
        //       isBlockDevice() { return false; },
        //       isCharacterDevice() { return false; },
        //       isFIFO() { return !stat.isDirectory(); },
        //       isDirectory() { return stat.isDirectory(); },
        //     };
        //   }
        //   console.log("statSync", {path, stat});
        //   return stat;
        // },
        // openSync: (path: string, flags: number, mode?: number | undefined) => {
        //   const fd = wasmFs.fs.openSync(path, flags, mode);
        //   console.log("openSync", {path, flags, mode, fd});
        //   return fd
        // }
      }
    }
  }
}
