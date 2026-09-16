Feature: User view models
  The user's view model selects page and widget templates and overrides
  widget settings on top of the base view models — per CELL, so two cells
  of one widget type stay independent. On the demo page every edit (widget
  settings, cell removal, layout, engine) is saved in the user overlay: the
  layout becomes the user's own "my-own" template, widget edits become
  per-cell settings overlays, and the base view models stay untouched.

  Scenario: User overlay selects a template and overrides its settings
    Given I open the "demo" page
    Then the label reads "WIREWORK PLAYGROUND!!!"
    And the label tone is "success"

  Scenario: Without the overlay the base template applies
    Given I open the "demo" page
    When I disable the user overlay
    Then the label reads "Wirework playground"

  Scenario: Modifying a widget on the demo page is saved in the user overlay
    Given I open the "demo" page
    Then the edit target is "user overlay"
    When I edit the page
    And I edit the cell "label-main"
    And I set the setting "text" to "Edited via overlay"
    And I save the widget
    Then the label reads "Edited via overlay"
    When I save the page
    Then the label reads "Edited via overlay"
    And the state JSON contains '"Edited via overlay"'
    When I disable the user overlay
    Then the label reads "Wirework playground"

  Scenario: Removing a cell on the demo page is saved in the user overlay
    Given I open the "demo" page
    When I edit the page
    And I remove the cell "echo-demo"
    Then the page has 9 cells
    When I save the page
    Then the page has 9 cells
    And the page uses the "my-own" view
    When I disable the user overlay
    Then the page has 10 cells

  Scenario: Layout and widget edits are saved together in one session
    Given I open the "demo" page
    When I edit the page
    And I drag the cell "counter-main" onto the cell "label-main"
    And I edit the cell "label-main"
    And I set the setting "text" to "Edited after drag"
    And I save the widget
    Then the label reads "Edited after drag"
    And the cell "counter-main" is placed at x 0 y 0 w 6 h 2
    When I save the page
    Then the label reads "Edited after drag"
    And the cell "counter-main" is placed at x 0 y 0 w 6 h 2

  Scenario: Cancelling a session drops widget edits and removals too
    Given I open the "demo" page
    When I edit the page
    And I edit the cell "label-main"
    And I set the setting "text" to "Never saved"
    And I save the widget
    And I remove the cell "echo-demo"
    Then the page has 9 cells
    When I cancel the page edit
    Then the label reads "WIREWORK PLAYGROUND!!!"
    And the page has 10 cells

  Scenario: Turning the overlay off ends the session and closes the editor
    Given I open the "demo" page
    When I edit the page
    And I edit the cell "label-main"
    And I disable the user overlay
    Then the widget editor is closed
    And the page mode is "view"
    And the edit target is "view models"
    And the label reads "Wirework playground"

  Scenario: Layout edits on the demo page become the user's own template
    Given I open the "demo" page
    When I edit the page
    And I drag the cell "counter-main" onto the cell "label-main"
    And I save the page
    Then the page uses the "my-own" view
    And the cell "counter-main" is placed at x 0 y 0 w 6 h 2
    When I disable the user overlay
    Then the page uses the "default" view
    And the cell "counter-main" is placed at x 0 y 1 w 6 h 2
