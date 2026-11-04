/**
 * The field for a row's or a cell's flex classes in edit mode: plain text,
 * the vocabulary suggested by the browser from the view's datalist, marked
 * invalid while it names a class the engine does not know. Render-only:
 * logic in useClassesInput.
 */
import { useClassesInput } from "./useClassesInput";

export interface ClassesInputProps {
  value: string | undefined;
  /** The datalist of every class name, rendered once by the view. */
  listId: string;
  testId: string;
  /** The accessible name: "classes of row 1", "classes of custom-1". */
  label: string;
  onCommit: (classes: string) => void;
}

export function ClassesInput({ value, listId, testId, label, onCommit }: ClassesInputProps) {
  const { draft, setDraft, commit, onKeyDown, unknown } = useClassesInput(value, onCommit);
  return (
    <input
      type="text"
      className="ww-flex-classes"
      data-testid={testId}
      aria-label={label}
      {...(unknown.length === 0 ? {} : { "aria-invalid": true, title: `unknown: ${unknown.join(" ")}` })}
      list={listId}
      placeholder="flex classes"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
    />
  );
}
