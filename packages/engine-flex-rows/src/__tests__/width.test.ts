/** The width spec as the item's style: keywords inline, fractions per breakpoint as custom properties. */
import { describe, expect, it } from "vitest";
import { widthStyle } from "../width";

describe("widthStyle", () => {
  it("keeps the keywords as inline flex values", () => {
    expect(widthStyle(undefined)).toEqual({ flex: "0 1 auto" });
    expect(widthStyle("auto")).toEqual({ flex: "0 1 auto" });
    expect(widthStyle("full")).toEqual({ flex: "1 1 100%" });
  });

  it("puts each breakpoint's fraction on the item, for the media queries to pick", () => {
    expect(widthStyle("m-8/12 s-1/2")).toEqual({ "--ww-basis-m": "66.6667%", "--ww-basis-s": "50.0000%" });
    expect(widthStyle("l-1/3")).toEqual({ "--ww-basis-l": "33.3333%" });
    expect(widthStyle("m-1")).toEqual({ "--ww-basis-m": "100.0000%" });
  });

  it("ignores what is not a token (the schema refuses it before it gets here)", () => {
    expect(widthStyle("x-1/2 m-0/0")).toEqual({});
  });
});
