/**
 * For a widget that announces its own appearance — a table's `load`: "I am
 * here, fetch my data". Runs `announce` once per mount, after the page has
 * bound its reactions, and again — in place, without a remount — whenever
 * the host asks the page to load again (`PageView`'s `reloadKey`). See
 * useAnnounce for the timing.
 */
import { useContext } from "react";
import { PageReloadContext, useAnnounce } from "./useAnnounce";

export function useAfterMount(announce: () => void): void {
  useAnnounce(announce, [useContext(PageReloadContext)]);
}
