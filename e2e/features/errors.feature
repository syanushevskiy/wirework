Feature: Loud failure modes
  Invalid widget definitions are rejected at registration, and the example
  view models pass boot validation. Every rejection and the validation
  result are visible in the collapsed diagnostics panels.

  Scenario: The example view models pass boot validation
    Given I open the "overview" page
    Then the boot validation status is "view models: OK"

  Scenario: Invalid widget definitions are rejected at registration
    Given I open the "overview" page
    And I expand the "registration" panel
    Then all 8 broken widget definitions were rejected
