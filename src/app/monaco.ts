import { NgxMonacoEditorConfig } from 'ngx-monaco-editor';
import { loadWASM } from 'onigasm' // peer dependency of 'monaco-textmate'
import { Registry } from 'monaco-textmate' // peer dependency
import { wireTmGrammars } from 'monaco-editor-textmate'

declare const monaco: any;

export const monacoConfig: NgxMonacoEditorConfig = {
  async onMonacoLoad() {
    monaco.languages.register({ id: 'crystal' });
  },
};

export async function initEditor(editor: any) {
  await loadWASM(await (await fetch('assets/onigasm.wasm')).arrayBuffer());

  const crystalGrammar = await (await fetch("assets/crystal.json")).text();

  const registry = new Registry({
    getGrammarDefinition: async (scopeName) => {
      return {
        format: 'json',
        content: crystalGrammar
      }
    }
  });

  const grammars = new Map();
  grammars.set('crystal', 'source.cr');

  await wireTmGrammars(monaco, registry, grammars, editor)
}
