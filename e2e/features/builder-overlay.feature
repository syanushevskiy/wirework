Feature: User overlay on the builder page
  The builder page has a user overlay too. It waits for the first widget —
  an empty page has nothing to personalise — and a visit starts with it OFF:
  building is work on the shared page. Turned on, every page edit is the
  user's own: a widget edit becomes that cell's settings, the layout becomes
  the user's "my-own" template, and the shared view models stay untouched.
  Widgets are added to the shared page only, so Add waits while it is on.

  Scenario: The overlay becomes available with the first widget
    Given I open the "builder" page
    Then the user overlay is not available
    And the edit target is "view models"
    When I choose the "antd-label" widget
    And I set the setting "text" to "Shared text"
    And I add the widget
    Then the user overlay is available and off
    And the edit target is "view models"

  Scenario: With the overlay on, a widget edit is saved as the user's settings
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "Shared text"
    And I add the widget
    And I enable the user overlay
    Then the edit target is "user overlay"
    When I edit the page
    And I edit the cell "custom-1"
    And I set the setting "text" to "My text"
    And I save the widget
    And I save the page
    Then the label reads "My text"
    And the state JSON contains '"Shared text"'
    And the state JSON contains '"My text"'
    When I disable the user overlay
    Then the label reads "Shared text"

  Scenario: With the overlay on, the user's view cannot rewire a widget
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.a"
    And I set the reaction for "incremented" to set "demo.a" from "value"
    And I add the widget
    And I enable the user overlay
    And I edit the page
    And I edit the cell "custom-1"
    Then the widget editor keeps inputs and reactions read-only

  Scenario: With the overlay on, a layout edit becomes the user's own template
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.a"
    And I set the reaction for "incremented" to set "demo.a" from "value"
    And I add the widget
    And I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.b"
    And I set the reaction for "incremented" to set "demo.b" from "value"
    And I add the widget
    And I enable the user overlay
    And I edit the page
    And I drag the cell "custom-2" onto the cell "custom-1"
    And I save the page
    Then the page uses the "my-own" view
    And the cell "custom-2" is placed at x 0 y 0 w 12 h 2
    When I disable the user overlay
    Then the page uses the "default" view
    And the cell "custom-2" is placed at x 0 y 2 w 12 h 2

  Scenario: A cell removed from the user's view stays on the shared page
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    And I add the widget
    And I enable the user overlay
    And I edit the page
    And I remove the cell "custom-2"
    And I save the page
    Then the page has 1 cell
    When I disable the user overlay
    Then the page has 2 cells

  Scenario: Widgets are added to the shared page, so Add waits while the overlay is on
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    Then the add widget button is enabled
    When I enable the user overlay
    Then adding widgets waits for the user overlay to be turned off
    When I disable the user overlay
    And I add the widget
    Then the page has 2 cells

  Scenario: The overlay starts over with every visit
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I enable the user overlay
    Then the edit target is "user overlay"
    When I switch to the "builder" page
    Then the user overlay is not available
    When I switch to the "demo" page
    Then the edit target is "user overlay"
    When I disable the user overlay
    And I switch to the "demo" page
    Then the edit target is "user overlay"
