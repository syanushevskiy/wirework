Feature: Widget builder
  Widgets can be added to a page at runtime from a dropdown of registered
  widgets. Each widget declares typed input ports and typed events; the
  builder asks for a store path per input, a reaction per event (required
  when the event carries state), and the widget's primitive settings
  (required ones gate Add), then writes it all into the view models —
  wiring the widgets together through the store.

  Scenario: The builder page starts empty
    Given I open the "builder" page
    Then the page has 0 cells

  Scenario: Added widgets are wired together through inputs and reactions
    Given I open the "builder" page
    When I choose the "dummy-counter" widget
    And I set the "input" port "value" to "demo.custom"
    And I set the reaction for "incremented" to set "demo.custom" from "value"
    And I add the widget
    And I choose the "dummy-echo" widget
    And I set the "input" port "value" to "demo.custom"
    And I add the widget
    Then the page has 2 cells
    And I see a widget "dummy-counter"
    And I see a widget "dummy-echo"
    When I click the counter 1 times
    Then the echo widget at "demo.custom" shows "1"

  Scenario: A widget cannot be added until required ports and reactions are bound
    Given I open the "builder" page
    When I choose the "dummy-counter" widget
    Then the add widget button is disabled
    When I set the "input" port "value" to "demo.custom"
    Then the add widget button is disabled
    When I set the reaction for "incremented" to set "demo.custom" from "value"
    Then the add widget button is enabled

  Scenario: Input autocomplete offers only type-compatible existing paths
    Given I open the "builder" page
    When I choose the "dummy-counter" widget
    And I open the "input" port "value" suggestions
    Then the path suggestions include "demo.counter"
    And the path suggestions do not include "runs.data"

  Scenario: An input port can be bound from the suggestions
    Given I open the "builder" page
    When I choose the "dummy-echo" widget
    And I open the "input" port "value" suggestions
    Then the path suggestions include "runs.data"
    When I set the "input" port "value" to "demo.counter"
    And I add the widget
    Then the echo widget at "demo.counter" shows "0"

  Scenario: Widget settings are offered with their defaults
    Given I open the "builder" page
    When I choose the "dummy-counter" widget
    Then the builder shows a setting "step"
    And the builder shows a setting "label"

  Scenario: A label cannot be added until its required text is set
    Given I open the "builder" page
    When I choose the "dummy-label" widget
    Then the add widget button is disabled
    When I set the setting "text" to "Hello from the builder"
    Then the add widget button is enabled
    When I add the widget
    Then the page has 1 cells
    And the label reads "Hello from the builder"

  Scenario: A label can take its text from a store path
    Given I open the "builder" page
    When I choose the "dummy-label" widget
    And I set the setting "text" to "fallback text"
    And I set the "input" port "text" to "runs.data.byId.123456.name"
    And I add the widget
    Then the label reads "E2E Run # 98765"

  Scenario: A placed widget can be modified and removed
    Given I open the "builder" page
    Then the edit target is "view models"
    When I choose the "dummy-label" widget
    And I set the setting "text" to "before"
    And I add the widget
    Then the label reads "before"
    When I edit the page
    And I edit the cell "custom-1"
    And I set the setting "text" to "after"
    And I save the widget
    And I save the page
    Then the label reads "after"
    When I edit the page
    And I remove the cell "custom-1"
    And I save the page
    Then the page has 0 cells
    And the state JSON does not contain '"custom-1"'

  Scenario: Layout edits on the builder page are saved into the view models
    Given I open the "builder" page
    When I choose the "dummy-counter" widget
    And I set the "input" port "value" to "demo.a"
    And I set the reaction for "incremented" to set "demo.a" from "value"
    And I add the widget
    And I choose the "dummy-counter" widget
    And I set the "input" port "value" to "demo.b"
    And I set the reaction for "incremented" to set "demo.b" from "value"
    And I add the widget
    Then the cell "custom-2" is placed at x 0 y 2 w 12 h 2
    When I edit the page
    And I drag the cell "custom-2" onto the cell "custom-1"
    And I save the page
    Then the edit target is "view models"
    And the page uses the "default" view
    And the cell "custom-2" is placed at x 0 y 0 w 12 h 2

  Scenario: A reaction defaults to the payload's only field
    Given I open the "builder" page
    When I choose the "dummy-counter" widget
    Then the reaction for "incremented" takes "value" from the payload

  Scenario: A reaction writing the whole payload does not crash the counter
    Given I open the "builder" page
    When I choose the "dummy-counter" widget
    And I set the "input" port "value" to "demo.whole"
    And I set the reaction for "incremented" to set "demo.whole" from ""
    And I add the widget
    And I click the counter 1 times
    Then no widget has crashed
    And the counter shows '{"value":1}'

  Scenario: An input validates with a premade rule and stores its text
    Given I open the "builder" page
    When I choose the "dummy-input" widget
    Then the builder shows a setting "validation"
    And the reaction for "changed" takes "value" from the payload
    When I set the "input" port "value" to "demo.email"
    And I set the setting "validation" to "email"
    And I set the reaction for "changed" to set "demo.email" from "value"
    And I add the widget
    And I choose the "dummy-echo" widget
    And I set the "input" port "value" to "demo.email"
    And I add the widget
    And I type "not-an-email" into the input
    Then the input is invalid with "must be an email address"
    And the echo widget at "demo.email" shows '"not-an-email"'
    When I type "team@example.com" into the input
    Then the input is valid
    And the echo widget at "demo.email" shows '"team@example.com"'

  Scenario: An input validates with a custom pattern
    Given I open the "builder" page
    When I choose the "dummy-input" widget
    And I set the "input" port "value" to "demo.code"
    And I set the setting "pattern" to "^[A-Z]{3}-[0-9]+$"
    And I set the setting "patternMessage" to "use the form ABC-123"
    And I set the reaction for "changed" to set "demo.code" from "value"
    And I add the widget
    And I type "abc" into the input
    Then the input is invalid with "use the form ABC-123"
    When I type "ABC-42" into the input
    Then the input is valid
