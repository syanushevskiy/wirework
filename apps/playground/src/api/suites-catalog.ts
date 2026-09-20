/**
 * The test-suite catalog behind the demo's dependent filters: which suites
 * each application has. Host data — a real app would load it from the
 * server; the view models only name store paths and the action using it.
 */
import type { ChoiceOption } from "@wirework/widget-contracts";

interface Application {
  id: string;
  name: string;
  suites: ChoiceOption[];
}

const APPLICATIONS: readonly Application[] = [
  {
    id: "billing",
    name: "Billing",
    suites: [
      { value: "billing-smoke", label: "Billing smoke" },
      { value: "billing-regression", label: "Billing regression" },
    ],
  },
  {
    id: "search",
    name: "Search",
    suites: [
      { value: "search-smoke", label: "Search smoke" },
      { value: "search-relevance", label: "Search relevance" },
    ],
  },
  {
    id: "checkout",
    name: "Checkout",
    suites: [
      { value: "checkout-e2e", label: "Checkout E2E" },
      { value: "checkout-payments", label: "Checkout payments" },
    ],
  },
];

/** Every application, as options. */
export const applicationOptions = (): ChoiceOption[] => APPLICATIONS.map(({ id, name }) => ({ value: id, label: name }));

/** The suites of the chosen applications, in catalog order (not in the order they were chosen). */
export const suiteOptionsFor = (chosen: readonly string[]): ChoiceOption[] =>
  APPLICATIONS.filter((application) => chosen.includes(application.id)).flatMap((application) => application.suites);
