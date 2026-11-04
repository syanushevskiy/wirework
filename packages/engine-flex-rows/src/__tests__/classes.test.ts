/** The vocabulary: Tailwind's layout names, the CSS each stands for, and what a `classes` value becomes. */
import { describe, expect, it } from "vitest";
import { LAYOUT_CLASSES, LAYOUT_CLASS_NAMES, classTokens, layoutStyle, styleOf, unknownClasses } from "../classes";

describe("the layout vocabulary", () => {
  it("has Tailwind's flexbox names with Tailwind's values", () => {
    expect(LAYOUT_CLASSES["flex-1"]).toEqual({ flex: "1 1 0%" });
    expect(LAYOUT_CLASSES["flex-2"]).toEqual({ flex: "2" });
    expect(LAYOUT_CLASSES["basis-1/3"]).toEqual({ flexBasis: "33.333333%" });
    expect(LAYOUT_CLASSES["justify-between"]).toEqual({ justifyContent: "space-between" });
    expect(LAYOUT_CLASSES["items-start"]).toEqual({ alignItems: "flex-start" });
    expect(LAYOUT_CLASSES["self-end"]).toEqual({ alignSelf: "flex-end" });
    expect(LAYOUT_CLASSES["place-content-between"]).toEqual({ placeContent: "space-between" });
    expect(LAYOUT_CLASSES["order-first"]).toEqual({ order: "-9999" });
    expect(LAYOUT_CLASSES["-order-1"]).toEqual({ order: "-1" });
    expect(LAYOUT_CLASSES["shrink-0"]).toEqual({ flexShrink: "0" });
    expect(LAYOUT_CLASSES["grow"]).toEqual({ flexGrow: 1 });
    expect(LAYOUT_CLASSES["gap-4"]).toEqual({ gap: "1rem" });
    expect(LAYOUT_CLASSES["gap-x-px"]).toEqual({ columnGap: "1px" });
  });

  it("has the grid names", () => {
    expect(LAYOUT_CLASSES["grid"]).toEqual({ display: "grid" });
    expect(LAYOUT_CLASSES["grid-cols-3"]).toEqual({ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" });
    expect(LAYOUT_CLASSES["col-span-2"]).toEqual({ gridColumn: "span 2 / span 2" });
    expect(LAYOUT_CLASSES["col-span-full"]).toEqual({ gridColumn: "1 / -1" });
    expect(LAYOUT_CLASSES["row-start-13"]).toEqual({ gridRowStart: "13" });
    expect(LAYOUT_CLASSES["grid-flow-col-dense"]).toEqual({ gridAutoFlow: "column dense" });
    expect(LAYOUT_CLASSES["auto-rows-fr"]).toEqual({ gridAutoRows: "minmax(0, 1fr)" });
  });

  it("has the sizing, spacing and layout names", () => {
    expect(LAYOUT_CLASSES["w-2/3"]).toEqual({ width: "66.666667%" });
    expect(LAYOUT_CLASSES["w-sm"]).toEqual({ width: "24rem" });
    expect(LAYOUT_CLASSES["w-screen"]).toEqual({ width: "100vw" });
    expect(LAYOUT_CLASSES["max-w-prose"]).toEqual({ maxWidth: "65ch" });
    expect(LAYOUT_CLASSES["h-dvh"]).toEqual({ height: "100dvh" });
    expect(LAYOUT_CLASSES["size-8"]).toEqual({ width: "2rem", height: "2rem" });
    expect(LAYOUT_CLASSES["p-4"]).toEqual({ padding: "1rem" });
    expect(LAYOUT_CLASSES["px-2"]).toEqual({ paddingLeft: "0.5rem", paddingRight: "0.5rem" });
    expect(LAYOUT_CLASSES["ps-1"]).toEqual({ paddingInlineStart: "0.25rem" });
    expect(LAYOUT_CLASSES["mx-auto"]).toEqual({ marginLeft: "auto", marginRight: "auto" });
    expect(LAYOUT_CLASSES["-mt-2"]).toEqual({ marginTop: "-0.5rem" });
    expect(LAYOUT_CLASSES["absolute"]).toEqual({ position: "absolute" });
    expect(LAYOUT_CLASSES["inset-0"]).toEqual({ top: "0px", right: "0px", bottom: "0px", left: "0px" });
    expect(LAYOUT_CLASSES["-top-1/2"]).toEqual({ top: "-50%" });
    expect(LAYOUT_CLASSES["z-10"]).toEqual({ zIndex: "10" });
    expect(LAYOUT_CLASSES["hidden"]).toEqual({ display: "none" });
    expect(LAYOUT_CLASSES["overflow-y-auto"]).toEqual({ overflowY: "auto" });
    expect(LAYOUT_CLASSES["object-left-top"]).toEqual({ objectPosition: "left top" });
    expect(LAYOUT_CLASSES["aspect-video"]).toEqual({ aspectRatio: "16 / 9" });
    expect(LAYOUT_CLASSES["columns-xs"]).toEqual({ columns: "20rem" });
    expect(LAYOUT_CLASSES["float-start"]).toEqual({ float: "inline-start" });
    expect(LAYOUT_CLASSES["invisible"]).toEqual({ visibility: "hidden" });
    // No negative of zero or of a keyword.
    expect(LAYOUT_CLASSES).not.toHaveProperty("-m-0");
    expect(LAYOUT_CLASSES).not.toHaveProperty("-m-auto");
  });

  it("has no name Tailwind 4 lacks — checked against Tailwind 4.3.4 on 3 November 2026", () => {
    expect(LAYOUT_CLASSES).not.toHaveProperty("-order-last");
    expect(LAYOUT_CLASSES).not.toHaveProperty("max-w-auto");
    expect(LAYOUT_CLASSES).not.toHaveProperty("max-h-auto");
    expect(LAYOUT_CLASSES["min-w-auto"]).toEqual({ minWidth: "auto" });
    expect(LAYOUT_CLASSES["max-w-none"]).toEqual({ maxWidth: "none" });
    expect(LAYOUT_CLASSES["order-last"]).toEqual({ order: "9999" });
  });

  it("takes an arbitrary value in brackets where Tailwind does, underscores as spaces, negated by a leading minus", () => {
    expect(styleOf("w-[320px]")).toEqual({ width: "320px" });
    expect(styleOf("grid-cols-[200px_1fr]")).toEqual({ gridTemplateColumns: "200px 1fr" });
    expect(styleOf("-m-[3px]")).toEqual({ margin: "-3px" });
    expect(styleOf("inset-x-[2rem]")).toEqual({ left: "2rem", right: "2rem" });
    expect(styleOf("object-[50%_25%]")).toEqual({ objectPosition: "50% 25%" });
    expect(styleOf("justify-[anything]")).toBeUndefined();
    expect(styleOf("bg-[red]")).toBeUndefined();
  });

  it("lists every name once, in the table's order, for a builder to suggest", () => {
    expect(new Set(LAYOUT_CLASS_NAMES).size).toBe(LAYOUT_CLASS_NAMES.length);
    expect(LAYOUT_CLASS_NAMES.slice(0, 2)).toEqual(["block", "inline-block"]);
    expect(LAYOUT_CLASS_NAMES).toContain("basis-11/12");
    expect(LAYOUT_CLASS_NAMES).not.toContain("gap-1/2");
  });

  it("turns a classes value into one style, a later class winning, a stranger doing nothing", () => {
    expect(layoutStyle("flex-1 basis-1/3 self-end")).toEqual({
      flex: "1 1 0%",
      flexBasis: "33.333333%",
      alignSelf: "flex-end",
    });
    expect(layoutStyle("  justify-start   justify-end ")).toEqual({ justifyContent: "flex-end" });
    expect(layoutStyle("flex-none nope constructor")).toEqual({ flex: "none" });
    expect(layoutStyle(undefined)).toEqual({});
    expect(layoutStyle("")).toEqual({});
  });

  it("names the strangers — colours, typography, variants and child selectors among them — and splits on any whitespace", () => {
    expect(classTokens(" flex-1\tgrow\n")).toEqual(["flex-1", "grow"]);
    expect(unknownClasses("flex-1 bg-red-500 text-sm md:flex-row space-x-4 constructor")).toEqual([
      "bg-red-500",
      "text-sm",
      "md:flex-row",
      "space-x-4",
      "constructor",
    ]);
    expect(unknownClasses("w-[32rem] -mt-2")).toEqual([]);
    expect(unknownClasses(undefined)).toEqual([]);
  });
});
