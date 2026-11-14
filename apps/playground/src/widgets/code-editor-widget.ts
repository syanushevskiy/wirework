/**
 * The demo's LAZY widget (doc/ADR/0018-lazy-widgets.md): the code editor's
 * definition — its contract, here and in everybody's bundle — with the
 * component behind `load`, in a chunk only the pages that show the editor
 * ask for. The loader goes through the demo's request tracking
 * (`loadedCode`), so a scenario can hold the code back like a server's
 * answer and read what was loaded (`wirework.loaded()`).
 */
import { implementContract } from "@wirework/react";
import { loadedCode } from "../api/requests";
import { codeEditorContract } from "../contracts/code-editor";

export const CODE_EDITOR_TYPE = "demo-code-editor";

export const codeEditor = implementContract(codeEditorContract, {
  type: CODE_EDITOR_TYPE,
  load: () => loadedCode(CODE_EDITOR_TYPE, () => import("./code-editor")),
  // Ten lines by default: the placeholder holds about that much room, so the page does not jump.
  placeholder: { minHeight: "14rem" },
});
