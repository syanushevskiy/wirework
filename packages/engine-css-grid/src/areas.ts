/**
 * The PICTURE's arithmetic, pure (doc/css-grid-design.md): `areas` read as
 * a grid of tokens, a cell's span, the rectangle rule CSS insists on, a
 * rectangle placed or a slot filled, the grid grown or shrunk, and what is
 * wrong with a picture or a track size — one place for every rule the
 * operations, the view's drag and `validate` share.
 */
import { EMPTY, TRACK_KEYWORDS, TRACK_UNITS, type Span } from "./schema";

/** The rows of tokens: one string per row split on whitespace. */
export const tokensOf = (areas: readonly string[]): string[][] =>
  areas.map((row) =>
    row
      .trim()
      .split(/\s+/)
      .filter((token) => token !== ""),
  );

/** The rows back as CSS writes them. */
export const areasOf = (tokens: readonly (readonly string[])[]): string[] => tokens.map((row) => row.join(" "));

/** How many columns the picture has: the longest row's. */
export const columnCount = (tokens: readonly (readonly string[])[]): number =>
  tokens.reduce((most, row) => Math.max(most, row.length), 0);

/** Every slot naming `id`, as `[row, column]` pairs. */
const slotsOf = (tokens: readonly (readonly string[])[], id: string): [number, number][] =>
  tokens.flatMap((row, r) => row.flatMap((token, c): [number, number][] => (token === id ? [[r, c]] : [])));

/** The bounding rectangle of the slots naming `id`, or undefined when it is named nowhere. */
export function spanOf(tokens: readonly (readonly string[])[], id: string): Span | undefined {
  const slots = slotsOf(tokens, id);
  if (slots.length === 0) return undefined;
  const rs = slots.map(([r]) => r);
  const cs = slots.map(([, c]) => c);
  return { r1: Math.min(...rs), c1: Math.min(...cs), r2: Math.max(...rs), c2: Math.max(...cs) };
}

/** The span as a scenario reads it: "1-1/1-2" — rowStart-columnStart/rowEnd-columnEnd, counted from 1. */
export const spanText = ({ r1, c1, r2, c2 }: Span): string => `${r1 + 1}-${c1 + 1}/${r2 + 1}-${c2 + 1}`;

/** Whether the slots naming `id` fill their bounding rectangle exactly — CSS drops the whole picture otherwise. */
export const isRectangle = (tokens: readonly (readonly string[])[], id: string): boolean => {
  const span = spanOf(tokens, id);
  if (span === undefined) return true;
  const area = (span.r2 - span.r1 + 1) * (span.c2 - span.c1 + 1);
  return slotsOf(tokens, id).length === area;
};

/** The ids the picture names, each once, in reading order. */
export const namedIds = (tokens: readonly (readonly string[])[]): string[] => [
  ...new Set(tokens.flat().filter((token) => token !== EMPTY)),
];

/** The slot another cell holds inside the rectangle, if any — the reason a drop is refused. */
export const holderIn = (
  tokens: readonly (readonly string[])[],
  id: string,
  span: Span,
): { row: number; column: number; id: string } | undefined => {
  for (const [r, c] of slotsIn(span)) {
    const token = tokens[r]?.[c] ?? EMPTY;
    if (token !== EMPTY && token !== id) return { row: r, column: c, id: token };
  }
  return undefined;
};

const slotsIn = ({ r1, c1, r2, c2 }: Span): [number, number][] =>
  Array.from({ length: r2 - r1 + 1 }, (_, dr) =>
    Array.from({ length: c2 - c1 + 1 }, (_, dc): [number, number] => [r1 + dr, c1 + dc]),
  ).flat();

/** The picture with `id` named in exactly the rectangle — its old slots emptied — grown to hold it. */
export function placed(tokens: readonly (readonly string[])[], id: string, span: Span): string[][] {
  const grown = grownTo(tokens, span.r2 + 1, span.c2 + 1);
  return grown.map((row, r) =>
    row.map((token, c) => {
      if (r >= span.r1 && r <= span.r2 && c >= span.c1 && c <= span.c2) return id;
      return token === id ? EMPTY : token;
    }),
  );
}

/** One slot filled with `id` (or emptied with undefined); the slot table's pick. */
export const withSlot = (
  tokens: readonly (readonly string[])[],
  row: number,
  column: number,
  id: string | undefined,
): string[][] =>
  grownTo(tokens, row + 1, column + 1).map((tokensOfRow, r) =>
    tokensOfRow.map((token, c) => (r === row && c === column ? (id ?? EMPTY) : token)),
  );

/** The picture at least `rows` × `columns`, every row the same length, new slots empty. */
export function grownTo(tokens: readonly (readonly string[])[], rows: number, columns: number): string[][] {
  const width = Math.max(columns, columnCount(tokens));
  const padded = tokens.map((row) => [...row, ...Array<string>(Math.max(0, width - row.length)).fill(EMPTY)]);
  while (padded.length < rows) padded.push(Array<string>(width).fill(EMPTY));
  return padded;
}

/** The picture without one row — or the same picture when a cell would lose its only slots. */
export const withoutRow = (tokens: readonly (readonly string[])[], row: number): string[][] | undefined =>
  removable(tokens, tokens[row] ?? []) ? tokens.filter((_, r) => r !== row).map((r) => [...r]) : undefined;

/** The picture without one column — or the same picture when a cell would lose its only slots. */
export const withoutColumn = (tokens: readonly (readonly string[])[], column: number): string[][] | undefined =>
  removable(
    tokens,
    tokens.map((row) => row[column] ?? EMPTY),
  )
    ? tokens.map((row) => row.filter((_, c) => c !== column))
    : undefined;

/** Whether the slots of a row or column may go: every id in them is named somewhere else too. */
const removable = (tokens: readonly (readonly string[])[], slots: readonly string[]): boolean =>
  slots.every((token) => token === EMPTY || slotsOf(tokens, token).length > countOf(slots, token));

const countOf = (slots: readonly string[], id: string): number => slots.filter((token) => token === id).length;

/** The picture without any row that is all empty. */
export const withoutEmptyRows = (tokens: readonly (readonly string[])[]): string[][] =>
  tokens.filter((row) => row.some((token) => token !== EMPTY)).map((row) => [...row]);

/** A CSS custom identifier — what a cell id must be to name an area. */
const IDENT = /^-?[A-Za-z_][\w-]*$/;

/** A track size the browser reads: a number with a unit, a keyword, or one of CSS's sizing functions. */
const TRACK_SIZE = new RegExp(
  `^(?:\\d+(?:\\.\\d+)?(?:${TRACK_UNITS.join("|")}|em|vw|vh)|${TRACK_KEYWORDS.join("|")}|(?:minmax|repeat|fit-content)\\([^()]*\\))$`,
);
export const isTrackSize = (size: string): boolean => TRACK_SIZE.test(size.trim());

/** A size as the typed form shows it: a number and a unit, or a keyword — undefined for a function it does not edit. */
export function trackParts(size: string): { number: string; unit: string } | { keyword: string } | undefined {
  const trimmed = size.trim();
  if ((TRACK_KEYWORDS as readonly string[]).includes(trimmed)) return { keyword: trimmed };
  const match = /^(\d+(?:\.\d+)?)(fr|px|rem|%)$/.exec(trimmed);
  return match === null || match[1] === undefined || match[2] === undefined
    ? undefined
    : { number: match[1], unit: match[2] };
}

/**
 * Everything wrong with a picture and its tracks, as sentences: rows of
 * unequal length, a token that is no cell or no identifier, an area that
 * is no rectangle (CSS drops the whole picture then), a cell with no slot,
 * tracks that do not match the grid, a size the browser cannot read.
 */
export function pictureProblems(
  areas: readonly string[],
  cellIds: readonly string[],
  tracks: { columns?: readonly string[] | undefined; rows?: readonly string[] | undefined; gap?: string | undefined },
): string[] {
  const tokens = tokensOf(areas);
  const width = columnCount(tokens);
  const problems: string[] = [];
  tokens.forEach((row, r) => {
    if (row.length !== width) problems.push(`row ${r + 1} has ${row.length} slots, the widest row ${width}`);
    row.forEach((token, c) => {
      if (token === EMPTY) return;
      if (!IDENT.test(token)) problems.push(`slot row ${r + 1} column ${c + 1} names "${token}", not an identifier`);
      else if (!cellIds.includes(token))
        problems.push(`slot row ${r + 1} column ${c + 1} names "${token}", which is not a cell`);
    });
  });
  for (const id of namedIds(tokens)) {
    if (!isRectangle(tokens, id)) problems.push(`area "${id}" is not a rectangle — the browser drops the picture`);
  }
  for (const id of cellIds) {
    if (spanOf(tokens, id) === undefined) problems.push(`cell "${id}" has no slot and is placed after the grid`);
  }
  if (tracks.columns !== undefined && tracks.columns.length !== width) {
    problems.push(`columns has ${tracks.columns.length} sizes for ${width} columns`);
  }
  if (tracks.rows !== undefined && tracks.rows.length !== tokens.length) {
    problems.push(`rows has ${tracks.rows.length} sizes for ${tokens.length} rows`);
  }
  tracks.columns?.forEach((size, c) => {
    if (!isTrackSize(size)) problems.push(`columns[${c}] "${size}" is not a track size`);
  });
  tracks.rows?.forEach((size, r) => {
    if (!isTrackSize(size)) problems.push(`rows[${r}] "${size}" is not a track size`);
  });
  if (tracks.gap !== undefined && !/^\d+(\.\d+)?(px|rem|em|%)$/.test(tracks.gap.trim())) {
    problems.push(`gap "${tracks.gap}" is not a length`);
  }
  return problems;
}

/** Whether CSS would accept the picture: equal rows and every area a rectangle. */
export const isDrawable = (tokens: readonly (readonly string[])[]): boolean =>
  tokens.length > 0 &&
  tokens.every((row) => row.length === columnCount(tokens)) &&
  namedIds(tokens).every((id) => isRectangle(tokens, id));
