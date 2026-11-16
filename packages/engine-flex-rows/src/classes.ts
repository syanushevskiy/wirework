/**
 * The LAYOUT VOCABULARY of flex-rows (doc/ADR/0010-flex-rows.md): Tailwind's
 * layout class names — its Layout, Flexbox & Grid, Spacing and Sizing
 * sections — each the CSS it stands for. A row's and a cell's `classes`
 * is a list of these names (`flex-1 basis-1/3 self-end`, `grid grid-cols-3
 * gap-4`, `absolute inset-0`, `-mt-2 w-[320px]`), which `layoutStyle`
 * turns into the element's style; `unknownClasses` names what the table
 * lacks. ONE table is the vocabulary, the validation and the builder's
 * suggestions, so nothing has to be kept in step. No Tailwind at runtime:
 * the names are borrowed because page builders know them; the CSS is this
 * table's. Beyond the table: a NEGATIVE value where Tailwind has one
 * (`-m-4`, `-top-2`, `-order-1`) and an ARBITRARY value in brackets
 * (`w-[32rem]`, `grid-cols-[200px_1fr]`, underscores being spaces).
 *
 * Not here, because inline style cannot say them: responsive and state
 * variants (`md:flex-row`, `hover:`) and the child selectors of
 * `space-x-*` / `divide-*` (use `gap-*`).
 */
import type { CSSProperties } from "react";

type Styles = Readonly<Record<string, CSSProperties>>;
type Values = readonly (readonly [string, string])[];
type Style = (value: string) => CSSProperties;

/** The style of one property. The one cast: an object with a key of CSSProperties is a CSSProperties. */
const prop =
  (name: keyof CSSProperties): Style =>
  (value) =>
    ({ [name]: value }) as CSSProperties;
/** The same value on several properties (`px`: left and right padding). */
const props =
  (...names: (keyof CSSProperties)[]): Style =>
  (value) =>
    Object.assign({}, ...names.map((name) => prop(name)(value))) as CSSProperties;

/** Tailwind's spacing scale: a step is 0.25rem. */
const SPACING = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64,
  72, 80, 96,
] as const;
const SCALE: Values = [
  ...SPACING.map((step) => [String(step), step === 0 ? "0px" : `${step / 4}rem`] as const),
  ["px", "1px"],
];
/** The fractions Tailwind names: halves to sixths, and twelfths. */
const FRACTIONS: Values = [2, 3, 4, 5, 6, 12].flatMap((denominator) =>
  Array.from({ length: denominator - 1 }, (_, at) => {
    const numerator = at + 1;
    return [`${numerator}/${denominator}`, `${Number(((numerator / denominator) * 100).toFixed(6))}%`] as const;
  }),
);
/** Tailwind's container scale (`w-sm`, `max-w-7xl`, `columns-xs`). */
const CONTAINERS: Values = [
  ["3xs", "16rem"],
  ["2xs", "18rem"],
  ["xs", "20rem"],
  ["sm", "24rem"],
  ["md", "28rem"],
  ["lg", "32rem"],
  ["xl", "36rem"],
  ["2xl", "42rem"],
  ["3xl", "48rem"],
  ["4xl", "56rem"],
  ["5xl", "64rem"],
  ["6xl", "72rem"],
  ["7xl", "80rem"],
];
/** `1` … `to`, each its own value. */
const count = (to: number, from = 1): Values =>
  Array.from({ length: to - from + 1 }, (_, at) => [String(from + at), String(from + at)] as const);
/** Names that are their own CSS keyword. */
const keywords = (...names: string[]): Values => names.map((name) => [name, name] as const);
const pairs = (named: Record<string, string>): Values => Object.entries(named);

const FLEX_START_END = pairs({ start: "flex-start", end: "flex-end", center: "center" });
const DISTRIBUTE = pairs({ between: "space-between", around: "space-around", evenly: "space-evenly" });
const SIZE_KEYWORDS = pairs({ auto: "auto", full: "100%", min: "min-content", max: "max-content", fit: "fit-content" });
/** A limit has no `auto`: Tailwind has `w-auto` and `min-w-auto`, never `max-w-auto` or `max-h-auto`. */
const LIMIT_KEYWORDS = SIZE_KEYWORDS.filter(([name]) => name !== "auto");
const SCREENS = (unit: string): Values =>
  pairs({
    screen: `100${unit}`,
    [`s${unit}`]: `100s${unit}`,
    [`l${unit}`]: `100l${unit}`,
    [`d${unit}`]: `100d${unit}`,
  });

/**
 * A utility: `<prefix>-<name>` for every named value, styled by `style`.
 * `negative` adds `-<prefix>-<name>` with the value negated where Tailwind
 * does; `arbitrary` says `<prefix>-[value]` takes any value (the first
 * utility of a prefix decides).
 */
interface Utility {
  prefix: string;
  style: Style;
  values: Values;
  negative?: boolean;
  arbitrary?: boolean;
}
const utility = (prefix: string, style: Style, values: Values, flags: Partial<Utility> = {}): Utility => ({
  prefix,
  style,
  values,
  arbitrary: true,
  ...flags,
});
/** `inset-x-4` is `left` and `right`; the four sides and the logical ones each a utility of the same shape. */
const sides = (
  prefixOf: (side: string) => string,
  styles: Record<string, Style>,
  values: Values,
  flags: Partial<Utility> = {},
): Utility[] => Object.entries(styles).map(([side, style]) => utility(prefixOf(side), style, values, flags));

const INSET: Values = [...SCALE, ...FRACTIONS, ["auto", "auto"], ["full", "100%"]];
const EDGES = (property: "padding" | "margin"): Record<string, Style> => ({
  "": prop(property),
  x: props(`${property}Left`, `${property}Right`),
  y: props(`${property}Top`, `${property}Bottom`),
  s: prop(`${property}InlineStart`),
  e: prop(`${property}InlineEnd`),
  t: prop(`${property}Top`),
  r: prop(`${property}Right`),
  b: prop(`${property}Bottom`),
  l: prop(`${property}Left`),
});

const UTILITIES: readonly Utility[] = [
  // ---- Layout ----
  utility("aspect", prop("aspectRatio"), pairs({ auto: "auto", square: "1 / 1", video: "16 / 9" })),
  utility("columns", prop("columns"), [...count(12), ["auto", "auto"], ...CONTAINERS]),
  utility(
    "break-after",
    prop("breakAfter"),
    keywords("auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"),
    { arbitrary: false },
  ),
  utility(
    "break-before",
    prop("breakBefore"),
    keywords("auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"),
    { arbitrary: false },
  ),
  utility("break-inside", prop("breakInside"), keywords("auto", "avoid", "avoid-page", "avoid-column"), {
    arbitrary: false,
  }),
  utility("object", prop("objectFit"), keywords("contain", "cover", "fill", "none", "scale-down"), {
    arbitrary: false,
  }),
  utility(
    "object",
    prop("objectPosition"),
    pairs({
      bottom: "bottom",
      center: "center",
      left: "left",
      "left-bottom": "left bottom",
      "left-top": "left top",
      right: "right",
      "right-bottom": "right bottom",
      "right-top": "right top",
      top: "top",
    }),
  ),
  ...sides(
    (side) => `overflow${side}`,
    { "": prop("overflow"), "-x": prop("overflowX"), "-y": prop("overflowY") },
    keywords("auto", "hidden", "clip", "visible", "scroll"),
    { arbitrary: false },
  ),
  ...sides(
    (side) => `overscroll${side}`,
    { "": prop("overscrollBehavior"), "-x": prop("overscrollBehaviorX"), "-y": prop("overscrollBehaviorY") },
    keywords("auto", "contain", "none"),
    { arbitrary: false },
  ),
  ...sides(
    (side) => side,
    {
      inset: props("top", "right", "bottom", "left"),
      "inset-x": props("left", "right"),
      "inset-y": props("top", "bottom"),
      start: prop("insetInlineStart"),
      end: prop("insetInlineEnd"),
      top: prop("top"),
      right: prop("right"),
      bottom: prop("bottom"),
      left: prop("left"),
    },
    INSET,
    { negative: true },
  ),
  utility("z", prop("zIndex"), [...keywords("0", "10", "20", "30", "40", "50"), ["auto", "auto"]], { negative: true }),
  // ---- Flexbox & Grid ----
  utility("basis", prop("flexBasis"), [...SCALE, ...FRACTIONS, ["auto", "auto"], ["full", "100%"], ...CONTAINERS]),
  utility("flex", prop("flex"), [
    ["1", "1 1 0%"],
    ["auto", "1 1 auto"],
    ["initial", "0 1 auto"],
    ["none", "none"],
    ...count(12, 2),
  ]),
  utility("grow", prop("flexGrow"), count(12, 0)),
  utility("shrink", prop("flexShrink"), count(12, 0)),
  // Only a NUMBERED order has a negative (`-order-1`); Tailwind has no `-order-last`.
  utility("order", prop("order"), count(12), { negative: true }),
  utility("order", prop("order"), [
    ["first", "-9999"],
    ["last", "9999"],
    ["none", "0"],
  ]),
  utility("grid-cols", prop("gridTemplateColumns"), [
    ...count(12).map(([n]) => [n, `repeat(${n}, minmax(0, 1fr))`] as const),
    ...keywords("none", "subgrid"),
  ]),
  utility("grid-rows", prop("gridTemplateRows"), [
    ...count(12).map(([n]) => [n, `repeat(${n}, minmax(0, 1fr))`] as const),
    ...keywords("none", "subgrid"),
  ]),
  utility("col-span", prop("gridColumn"), [
    ...count(12).map(([n]) => [n, `span ${n} / span ${n}`] as const),
    ["full", "1 / -1"],
  ]),
  utility("col-start", prop("gridColumnStart"), [...count(13), ["auto", "auto"]], { negative: true }),
  utility("col-end", prop("gridColumnEnd"), [...count(13), ["auto", "auto"]], { negative: true }),
  utility("col", prop("gridColumn"), [["auto", "auto"]]),
  utility("row-span", prop("gridRow"), [
    ...count(12).map(([n]) => [n, `span ${n} / span ${n}`] as const),
    ["full", "1 / -1"],
  ]),
  utility("row-start", prop("gridRowStart"), [...count(13), ["auto", "auto"]], { negative: true }),
  utility("row-end", prop("gridRowEnd"), [...count(13), ["auto", "auto"]], { negative: true }),
  utility("row", prop("gridRow"), [["auto", "auto"]]),
  utility(
    "grid-flow",
    prop("gridAutoFlow"),
    pairs({ row: "row", col: "column", dense: "dense", "row-dense": "row dense", "col-dense": "column dense" }),
    { arbitrary: false },
  ),
  utility(
    "auto-cols",
    prop("gridAutoColumns"),
    pairs({ auto: "auto", min: "min-content", max: "max-content", fr: "minmax(0, 1fr)" }),
  ),
  utility(
    "auto-rows",
    prop("gridAutoRows"),
    pairs({ auto: "auto", min: "min-content", max: "max-content", fr: "minmax(0, 1fr)" }),
  ),
  ...sides((side) => `gap${side}`, { "": prop("gap"), "-x": prop("columnGap"), "-y": prop("rowGap") }, SCALE),
  utility("justify", prop("justifyContent"), [...FLEX_START_END, ...DISTRIBUTE, ...keywords("stretch", "normal")], {
    arbitrary: false,
  }),
  utility("justify-items", prop("justifyItems"), keywords("start", "end", "center", "stretch", "normal"), {
    arbitrary: false,
  }),
  utility("justify-self", prop("justifySelf"), keywords("auto", "start", "end", "center", "stretch"), {
    arbitrary: false,
  }),
  utility(
    "content",
    prop("alignContent"),
    [...FLEX_START_END, ...DISTRIBUTE, ...keywords("normal", "baseline", "stretch")],
    { arbitrary: false },
  ),
  utility("items", prop("alignItems"), [...FLEX_START_END, ...keywords("baseline", "stretch")], { arbitrary: false }),
  utility("self", prop("alignSelf"), [["auto", "auto"], ...FLEX_START_END, ...keywords("stretch", "baseline")], {
    arbitrary: false,
  }),
  utility(
    "place-content",
    prop("placeContent"),
    [...keywords("center", "start", "end", "baseline", "stretch"), ...DISTRIBUTE],
    { arbitrary: false },
  ),
  utility("place-items", prop("placeItems"), keywords("start", "end", "center", "baseline", "stretch"), {
    arbitrary: false,
  }),
  utility("place-self", prop("placeSelf"), keywords("auto", "start", "end", "center", "stretch"), { arbitrary: false }),
  // ---- Spacing ----
  ...sides((side) => `p${side}`, EDGES("padding"), SCALE),
  ...sides((side) => `m${side}`, EDGES("margin"), [...SCALE, ["auto", "auto"]], { negative: true }),
  // ---- Sizing ----
  utility("w", prop("width"), [...SCALE, ...FRACTIONS, ...CONTAINERS, ...SIZE_KEYWORDS, ...SCREENS("vw")]),
  utility("min-w", prop("minWidth"), [...SCALE, ...FRACTIONS, ...CONTAINERS, ...SIZE_KEYWORDS, ...SCREENS("vw")]),
  utility("max-w", prop("maxWidth"), [
    ...SCALE,
    ...FRACTIONS,
    ...CONTAINERS,
    ...LIMIT_KEYWORDS,
    ...SCREENS("vw"),
    ["none", "none"],
    ["prose", "65ch"],
  ]),
  utility("h", prop("height"), [...SCALE, ...FRACTIONS, ...SIZE_KEYWORDS, ...SCREENS("vh"), ["lh", "1lh"]]),
  utility("min-h", prop("minHeight"), [...SCALE, ...FRACTIONS, ...SIZE_KEYWORDS, ...SCREENS("vh"), ["lh", "1lh"]]),
  utility("max-h", prop("maxHeight"), [
    ...SCALE,
    ...FRACTIONS,
    ...LIMIT_KEYWORDS,
    ...SCREENS("vh"),
    ["lh", "1lh"],
    ["none", "none"],
  ]),
  utility("size", props("width", "height"), [...SCALE, ...FRACTIONS, ...SIZE_KEYWORDS]),
];

/** The classes that are a name alone, by Tailwind's name, with the CSS each stands for. */
const STATIC: Styles = {
  // display
  ...Object.fromEntries(
    [
      "block",
      "inline-block",
      "inline",
      "flex",
      "inline-flex",
      "table",
      "inline-table",
      "table-caption",
      "table-cell",
      "table-column",
      "table-column-group",
      "table-footer-group",
      "table-header-group",
      "table-row-group",
      "table-row",
      "flow-root",
      "grid",
      "inline-grid",
      "contents",
      "list-item",
    ].map((display) => [display, { display }]),
  ),
  hidden: { display: "none" },
  // position, float, clear, isolation, visibility, box
  ...Object.fromEntries(
    ["static", "fixed", "absolute", "relative", "sticky"].map((position) => [position, { position }]),
  ),
  ...Object.fromEntries(
    ["start", "end", "left", "right", "none"].map((float) => [
      `float-${float}`,
      { float: float === "start" ? "inline-start" : float === "end" ? "inline-end" : float },
    ]),
  ),
  ...Object.fromEntries(
    ["start", "end", "left", "right", "both", "none"].map((clear) => [
      `clear-${clear}`,
      { clear: clear === "start" ? "inline-start" : clear === "end" ? "inline-end" : clear },
    ]),
  ),
  isolate: { isolation: "isolate" },
  "isolation-auto": { isolation: "auto" },
  visible: { visibility: "visible" },
  invisible: { visibility: "hidden" },
  collapse: { visibility: "collapse" },
  "box-border": { boxSizing: "border-box" },
  "box-content": { boxSizing: "content-box" },
  "box-decoration-clone": { boxDecorationBreak: "clone" },
  "box-decoration-slice": { boxDecorationBreak: "slice" },
  // flex direction and wrap, the bare grow / shrink
  "flex-row": { flexDirection: "row" },
  "flex-row-reverse": { flexDirection: "row-reverse" },
  "flex-col": { flexDirection: "column" },
  "flex-col-reverse": { flexDirection: "column-reverse" },
  "flex-wrap": { flexWrap: "wrap" },
  "flex-wrap-reverse": { flexWrap: "wrap-reverse" },
  "flex-nowrap": { flexWrap: "nowrap" },
  grow: { flexGrow: 1 },
  shrink: { flexShrink: 1 },
};

/** A value Tailwind negates: a positive number with its unit (`0.5rem`, `100%`); `0`, keywords and what is negative already stay as they are. */
const negated = (value: string): string | undefined => (Number.parseFloat(value) > 0 ? `-${value}` : undefined);

const generated: Styles = Object.fromEntries(
  UTILITIES.flatMap(({ prefix, style, values, negative }) =>
    values.flatMap(([name, value]) => {
      const minus = negative ? negated(value) : undefined;
      return [
        [`${prefix}-${name}`, style(value)] as const,
        ...(minus === undefined ? [] : [[`-${prefix}-${name}`, style(minus)] as const]),
      ];
    }),
  ),
);

/** Every class the engine reads, by Tailwind's name, with the CSS it stands for — the names alone and the generated ones. */
export const LAYOUT_CLASSES: Styles = { ...STATIC, ...generated };

/** By name — a Map, so a name like "constructor" is a lookup and never the object's own. */
const STYLES: ReadonlyMap<string, CSSProperties> = new Map(Object.entries(LAYOUT_CLASSES));
/** The prefixes that take an arbitrary value in brackets, with the style that reads it. */
const ARBITRARY: ReadonlyMap<string, Style> = new Map(
  UTILITIES.filter((candidate) => candidate.arbitrary).map((candidate) => [candidate.prefix, candidate.style]),
);
const BRACKETED = /^(-?)(.+?)-\[(.+)]$/;

/** The style of one class name: the table's, or an arbitrary value (`w-[32rem]`, `-m-[3px]`, underscores as spaces). */
export function styleOf(token: string): CSSProperties | undefined {
  const known = STYLES.get(token);
  if (known !== undefined) return known;
  const match = BRACKETED.exec(token);
  const style = match === null ? undefined : ARBITRARY.get(match[2] ?? "");
  if (match === null || style === undefined) return undefined;
  const value = (match[3] ?? "").replaceAll("_", " ");
  return style(match[1] === "-" ? (negated(value) ?? value) : value);
}

/** The names on offer, in the table's order: what a builder suggests. */
export const LAYOUT_CLASS_NAMES: readonly string[] = [...STYLES.keys()];

/** The names in a `classes` value, whitespace-separated. */
export const classTokens = (classes: string | undefined): string[] => classes?.split(/\s+/).filter(Boolean) ?? [];

/** The style a `classes` value stands for; a later class wins over an earlier one, a name nobody knows does nothing. */
export const layoutStyle = (classes: string | undefined): CSSProperties =>
  classTokens(classes).reduce<CSSProperties>((style, token) => ({ ...style, ...styleOf(token) }), {});

/**
 * Whether a ROW's classes ask for the room its page has left over (`flex-1`,
 * `flex-auto`, `grow`): on a page that has a height of its own such a row
 * takes it, top to bottom, and its cells are as tall as the row — so a
 * widget that fills its cell (a table, doc/ADR/0021-table-height.md) has a
 * height to fill. On a page as tall as its content it changes nothing.
 */
export function growsTall(classes: string | undefined): boolean {
  const { flex, flexGrow } = layoutStyle(classes);
  return Number(flexGrow ?? 0) > 0 || Number.parseFloat(String(flex ?? "0")) > 0;
}

/** The names in a `classes` value the vocabulary does not have. */
export const unknownClasses = (classes: string | undefined): string[] =>
  classTokens(classes).filter((token) => styleOf(token) === undefined);
