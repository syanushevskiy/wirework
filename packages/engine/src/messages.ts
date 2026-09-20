/**
 * How problems read — one place, so resolve, validation, registries and
 * hosts format caught errors and zod issues the same way.
 */

/** A caught value as message text. */
export const errorText = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

interface IssueList {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}

/** A zod error's issues on one line: "path: message; path: message". */
export const issuesText = (error: IssueList): string =>
  error.issues.map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`).join("; ");
