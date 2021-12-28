const fs = require("fs");
const path = require("path");
const { WasmFs } = require("@wasmer/wasmfs");

const wasmFs = new WasmFs();

function copy(src, dest) {
  // console.log(`Copying ${src} to ${dest}`);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    wasmFs.fs.mkdirpSync(dest);
    for (const child of fs.readdirSync(src)) {
      copy(path.join(src, child), path.join(dest, child));
    }
  } else {
    // if (path.extname(src) === ".cr") {
    //   let contents = fs.readFileSync(src, "utf8");
    //   contents = contents.replace(/\{% skip_file (if|unless) (.*?) %\}([^]*)/, (match, ifOrUnless, condition, code) => {
    //     condition = condition.replace(/flag\?\(:(\w+)\)/g, (match, flag) => {
    //       return flag === "wasm32" ? "true" : "false";
    //     });

    //     const goal = ifOrUnless === "if" ? true : false
    //     if (eval(condition) === goal) {
    //       return "";
    //     } else {
    //       return code;
    //     }
    //   });

    //   if (contents.includes("{% skip_file")) {
    //     contents = ""
    //   }

    //   wasmFs.fs.writeFileSync(dest, contents);
    // } else {
    //   wasmFs.fs.writeFileSync(dest, fs.readFileSync(src));
    // }
    wasmFs.fs.writeFileSync(dest, fs.readFileSync(src));
  }
}

copy("/home/guilherme/crystal/src", "/crystal/src/");
copy("/home/guilherme/llvm-wasm/wasi-sdk-14.0/share/wasi-sysroot/lib/wasm32-wasi", "/lib/wasm32-wasi");
copy("/home/guilherme/llvm-wasm/wasi-sdk-14.0/lib/clang/13.0.0/lib/wasi", "/lib/wasm32-wasi");

let offset = 0;
const blob = [];
const data = {};

for (const [key, value] of Object.entries(wasmFs.toJSON())) {
  if (value === null) {
    data[key] = null;
    continue;
  }

  blob.push(value);
  data[key] = [offset, value.length];
  offset += value.length;
}

// const data = Object.fromEntries(Object.entries(wasmFs.toJSON()).map(([key, value]) => [key, value ? [...value] : null]));
fs.writeFileSync("src/assets/fs.json", JSON.stringify(data));
fs.writeFileSync("src/assets/fs.blob", Buffer.concat(blob));
