Feature: Dependent multi-selects
  A multi-select stores every chosen value. On the demo page two of them
  depend on each other: the test suites on offer are those of the chosen
  applications. The dependency is host code with a name — choosing
  applications stores the choice, then calls the action that offers their
  suites and drops chosen suites whose application is no longer chosen.

  Scenario: No suites are offered until an application is chosen
    Given I open the "runs" page
    Then I see a widget "antd-multi-select"
    And the "Test suites" multi-select offers ""
    When I pick "Billing" in the "Applications" multi-select
    Then the "Applications" multi-select holds "billing"
    And the "Test suites" multi-select offers "Billing smoke, Billing regression"

  Scenario: Every chosen application adds its suites to the offer
    Given I open the "runs" page
    When I pick "Billing" in the "Applications" multi-select
    And I pick "Search" in the "Applications" multi-select
    Then the "Applications" multi-select holds "billing, search"
    And the "Test suites" multi-select offers "Billing smoke, Billing regression, Search smoke, Search relevance"
    And the state JSON contains '"search-relevance"'

  Scenario: Removing an application drops the suites chosen from it
    Given I open the "runs" page
    When I pick "Billing" in the "Applications" multi-select
    And I pick "Search" in the "Applications" multi-select
    And I pick "Billing smoke" in the "Test suites" multi-select
    And I pick "Search relevance" in the "Test suites" multi-select
    Then the "Test suites" multi-select holds "billing-smoke, search-relevance"
    When I unpick "Billing" in the "Applications" multi-select
    Then the "Applications" multi-select holds "search"
    And the "Test suites" multi-select offers "Search smoke, Search relevance"
    And the "Test suites" multi-select holds "search-relevance"
