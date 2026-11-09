/**
 * The TYPED field for a track's size in edit mode: a number and a unit
 * select (fr, px, rem, %) or a keyword (auto, min-content, max-content) in
 * the same select — a size the browser cannot read cannot be typed. A size
 * written in JSON that the form does not edit (`minmax(...)`) is shown as
 * text. Render-only: logic in useTrackInput.
 */
import { TRACK_KEYWORDS, TRACK_UNITS } from "./schema";
import { useTrackInput } from "./useTrackInput";

export interface TrackInputProps {
  value: string;
  testId: string;
  /** The accessible name: "size of column 1", "size of row 2", "gap". */
  label: string;
  /** Attributes the suite finds the field by (data-column, data-row). */
  data?: Record<string, number> | undefined;
  /** Without units the field is a length only (the gap): no fr, no keywords. */
  units?: readonly string[] | undefined;
  keywords?: readonly string[] | undefined;
  onCommit: (size: string) => void;
}

export function TrackInput({
  value,
  testId,
  label,
  data,
  units = TRACK_UNITS,
  keywords = TRACK_KEYWORDS,
  onCommit,
}: TrackInputProps) {
  const { parts, draft, setDraft, unit, setUnit, commit, onKeyDown } = useTrackInput(value, onCommit);
  if (parts === undefined) {
    return (
      <span
        className="ww-css-grid-track ww-css-grid-track-raw"
        data-testid={testId}
        {...data}
        title={`${label}: written in the page's JSON`}
      >
        {value}
      </span>
    );
  }
  const keyword = "keyword" in parts;
  return (
    <span className="ww-css-grid-track" data-testid={testId} {...data} data-size={value}>
      {keyword ? null : (
        <input
          type="number"
          className="ww-css-grid-number"
          data-testid={`${testId}-number`}
          aria-label={label}
          min={0}
          step="any"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      )}
      <select
        className="ww-css-grid-unit"
        data-testid={`${testId}-unit`}
        aria-label={`unit of ${label}`}
        value={unit}
        onChange={(event) => setUnit(event.target.value)}
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
        {keywords.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </span>
  );
}
