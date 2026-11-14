/**
 * Appearances (doc/ADR/0008-conditions.md, "Appearance"): the sixth
 * extension point. A conditional widget's `appear` and `disappear` name an
 * animation; this registry holds the standard five from the start and
 * whatever the host registers — a name and a description for the builder's
 * list, with the animation itself in the host's stylesheet as
 * `@keyframes ww-<name>`. `appearanceProblems` is what resolve and boot
 * validation report for a name nobody registered.
 */
import { APPEARANCE_NAME, standardAppearances, type AppearanceDefinition } from "@wirework/schema";
import { createNamedRegistry, type NamedRegistry } from "./named-registry";

export type AppearanceRegistry = NamedRegistry<AppearanceDefinition>;

/** A registry with the standard appearances (`@wirework/schema`) already in it; the host adds its own, then seals it. */
export function createAppearances(): AppearanceRegistry {
  const registry = createNamedRegistry<AppearanceDefinition>({
    label: "Appearance",
    keyOf: (appearance) => appearance.name,
    pattern: APPEARANCE_NAME,
    invariants: [
      (appearance) =>
        typeof appearance.description !== "string" || appearance.description === "" ? "has no description" : undefined,
    ],
  });
  for (const appearance of standardAppearances) registry.register(appearance);
  return registry;
}

/** The standard appearances alone, sealed — what a caller without a registry of its own checks against. */
export const STANDARD_APPEARANCES: AppearanceRegistry = createAppearances();
STANDARD_APPEARANCES.seal();

/** The problems of a view model's `appear` and `disappear`: a name the registry does not know. */
export function appearanceProblems(
  viewModel: { appear?: string | undefined; disappear?: string | undefined } | undefined,
  appearances: AppearanceRegistry = STANDARD_APPEARANCES,
): string[] {
  return (["appear", "disappear"] as const).flatMap((key) => {
    const name = viewModel?.[key];
    return name === undefined || appearances.get(name) !== undefined
      ? []
      : [`${key} names an unknown appearance "${name}" (registered: ${appearances.keys().join(", ")})`];
  });
}
