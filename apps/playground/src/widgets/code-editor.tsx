/**
 * The code editor's COMPONENT — the module the editor's pages load
 * (code-editor-widget.ts). It stands in for a heavy library such as Monaco:
 * what matters to the demo is that this file, its stylesheet and whatever
 * it imports travel in a chunk of their own. Render-only: logic in
 * use-code-editor.
 */
import type { ContractProps } from "@wirework/schema";
import { codeEditorContract } from "../contracts/code-editor";
import { useCodeEditor } from "../hooks/use-code-editor";
// The editor's styles come with its code, not with the application's entry.
import "./code-editor.css";

/** Found in the editor's chunk and in no other: what the bundle check looks for (scripts/check-bundle.mjs). */
const CHUNK_MARK = "ww-demo-code-editor-chunk";

export default function CodeEditor({ viewModel, store, emit }: ContractProps<typeof codeEditorContract>) {
  const { code, lineNumbers, lines, change } = useCodeEditor(
    store,
    emit,
    viewModel.inputs.value,
    codeEditorContract.io.inputs.value,
  );
  return (
    <label className="pg-code-editor" data-testid="code-editor" data-chunk={CHUNK_MARK} data-lines={lines}>
      <span className="pg-code-editor__label">
        {viewModel.label} · {viewModel.language}
      </span>
      <span className="pg-code-editor__box">
        <span className="pg-code-editor__gutter" aria-hidden="true">
          {lineNumbers}
        </span>
        <textarea
          className="pg-code-editor__text"
          rows={viewModel.rows}
          spellCheck={false}
          wrap="off"
          value={code}
          onChange={change}
        />
      </span>
    </label>
  );
}
