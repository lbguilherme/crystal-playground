# Crystal Playground

This is a very early and experimental Web playground for the Crystal Language using WebAssembly.

**Try it! https://lbguilherme.github.io/crystal-playground/**  
(works best on Firefox)

See https://github.com/crystal-lang/crystal/issues/10870 for more details about the port. This repository includes the playground source code and the prebuilt binaries for Crystal and for LLVM's linker (wasm-ld).

## Previous work that made this possible

- Crystal - https://crystal-lang.org/
- Source code editor: Monaco - https://microsoft.github.io/monaco-editor/
- Crystal syntax grammar - https://github.com/crystal-lang-tools/vscode-crystal-lang/blob/master/syntaxes/crystal.json
- TextMate grammar support for Monaco - https://github.com/zikaari/monaco-textmate + https://github.com/zikaari/monaco-editor-textmate + https://github.com/zikaari/onigasm
- Terminal-like output: Xterm.js - https://xtermjs.org/
- Linker: LLVM's wasm-ld - https://lld.llvm.org/WebAssembly.html
- Web framework: Angular - https://angular.io/
- WASI implementation: based on Wasmer - https://github.com/wasmerio/wasmer-js/tree/v0.12.0

# What is WebAssembly?

Quoting [the WebAssembly site](https://webassembly.org/):

> WebAssembly (abbreviated Wasm) is a binary instruction format for a
> stack-based virtual machine. Wasm is designed as a portable target
> for compilation of high-level languages like C/C++/Rust, enabling
> deployment on the web for client and server applications.
About speed:

> WebAssembly aims to execute at native speed by taking advantage of
> [common hardware
> capabilities](https://webassembly.org/docs/portability/#assumptions-for-efficient-execution)
> available on a wide range of platforms.
About safety:

> WebAssembly describes a memory-safe, sandboxed [execution
> environment](https://webassembly.org/docs/semantics/#linear-memory) […].
