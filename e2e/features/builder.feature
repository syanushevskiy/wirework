Feature: Widget builder
  Widgets can be added to a page at runtime from a palette of live widget
  previews. Each widget declares typed input ports and typed events; the
  builder asks for a store path per input, a reaction per event (required
  when the event carries state), and the widget's primitive settings
  (required ones gate Add), then writes it all into the view models —
  wiring the widgets together through the store.

  Scenario: The builder page starts empty
    Given I open the "builder" page
    Then the page has 0 cells

  Scenario: Added widgets are wired together through inputs and reactions
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.custom"
    And I set the reaction for "incremented" to set "demo.custom" from "value"
    And I add the widget
    And I choose the "antd-echo" widget
    And I set the "input" port "value" to "demo.custom"
    And I add the widget
    Then the page has 2 cells
    And I see a widget "antd-counter"
    And I see a widget "antd-echo"
    When I click the counter 1 time
    Then the echo widget at "demo.custom" shows "1"

  Scenario: A widget cannot be added until required ports and reactions are bound
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    Then the add widget button is disabled
    When I set the "input" port "value" to "demo.custom"
    Then the add widget button is disabled
    When I set the reaction for "incremented" to set "demo.custom" from "value"
    Then the add widget button is enabled

  Scenario: Input autocomplete offers only type-compatible existing paths
    Given I open the "builder" page
    And the store holds at "sample":
      """
      { "count": 3, "rows": [{ "id": "1" }] }
      """
    When I choose the "antd-counter" widget
    And I open the "input" port "value" suggestions
    Then the path suggestions include "sample.count"
    And the path suggestions do not include "sample.rows"

  Scenario: An input port can be bound from the suggestions
    Given I open the "builder" page
    And the store holds at "sample":
      """
      { "count": 3, "rows": [{ "id": "1" }] }
      """
    When I choose the "antd-echo" widget
    And I open the "input" port "value" suggestions
    Then the path suggestions include "sample.rows"
    When I set the "input" port "value" to "sample.count"
    And I add the widget
    Then the echo widget at "sample.count" shows "3"

  Scenario: Widget settings are offered with their defaults
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    Then the builder shows a setting "step"
    And the builder shows a setting "label"

  Scenario: A label cannot be added until its required text is set
    Given I open the "builder" page
    When I choose the "antd-label" widget
    Then the add widget button is disabled
    When I set the setting "text" to "Hello from the builder"
    Then the add widget button is enabled
    When I add the widget
    Then the page has 1 cell
    And the label reads "Hello from the builder"

  Scenario: A label can take its text from a store path
    Given I open the "builder" page
    And the store holds at "sample.runs":
      """
      [{ "id": "123456", "name": "E2E Run # 98765" }]
      """
    When I choose the "antd-label" widget
    And I set the setting "text" to "fallback text"
    And I set the "input" port "text" to "sample.runs.0.name"
    And I add the widget
    Then the label reads "E2E Run # 98765"

  Scenario: A placed widget can be modified and removed
    Given I open the "builder" page
    Then the edit target is "view models"
    When I choose the "antd-label" widget
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
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.a"
    And I set the reaction for "incremented" to set "demo.a" from "value"
    And I add the widget
    And I choose the "antd-counter" widget
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
    When I choose the "antd-counter" widget
    Then the reaction for "incremented" takes "value" from the payload

  Scenario: The payload field default survives typing the reaction's path
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.typed"
    And I set the reaction for "incremented" to set "demo.typed"
    Then the reaction for "incremented" takes "value" from the payload
    When I add the widget
    And I click the counter 1 time
    Then the counter shows "(1)"

  Scenario: Widgets cannot be added while a page edit is open
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "first"
    Then the add widget button is enabled
    When I edit the page
    Then adding widgets waits for the page edit to end
    When I cancel the page edit
    Then the add widget button is enabled

  Scenario: A reaction writing the whole payload does not crash the counter
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.whole"
    And I set the reaction for "incremented" to set "demo.whole" from ""
    And I add the widget
    And I click the counter 1 time
    Then no widget has crashed
    And the counter shows '{"value":1}'

  Scenario: An input validates with a premade rule and stores its text
    Given I open the "builder" page
    When I choose the "antd-input" widget
    Then the builder shows a setting "validation"
    And the reaction for "changed" takes "value" from the payload
    When I set the "input" port "value" to "demo.email"
    And I set the setting "validation" to "email"
    And I set the reaction for "changed" to set "demo.email" from "value"
    And I add the widget
    And I choose the "antd-echo" widget
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
    When I choose the "antd-input" widget
    And I set the "input" port "value" to "demo.code"
    And I set the setting "pattern" to "^[A-Z]{3}-[0-9]+$"
    And I set the setting "patternMessage" to "use the form ABC-123"
    And I set the reaction for "changed" to set "demo.code" from "value"
    And I add the widget
    And I type "abc" into the input
    Then the input is invalid with "use the form ABC-123"
    When I type "ABC-42" into the input
    Then the input is valid

  Scenario: An app-defined contract and its widget register like the standard ones
    Given I open the "builder" page
    And the store holds at "sample.run":
      """
      { "id": "123456", "status": { "state": "Failed" } }
      """
    When I choose the "status-badge" widget
    And I set the "input" port "state" to "sample.run.status.state"
    And I set the setting "prefix" to "Run: "
    And I add the widget
    Then the status badge reads "Run: Failed"
    And the cell "custom-1" has kind "status-badge"

  Scenario: Standard-contract widgets carry their kind
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "kinded"
    And I add the widget
    Then the cell "custom-1" has kind "label"

  Scenario: The palette shows a live preview of every registered widget
    Given I open the "builder" page
    When I open the widget palette
    Then the palette shows a preview of every registered widget
    And the preview of "antd-label" reads "Sample text"
    And the preview of "antd-counter" reads "Increment (3)"
    And the preview of "antd-table" reads "Nightly"
    And the preview of "status-badge" reads "Run: Success"
    And the preview of "antd-crash" reads "crashed"
    And the preview of "antd-refresher" reads "Auto-refresh every"

  Scenario: The catalog opens with the search and closes after it
    Given I open the "builder" page
    Then the widget catalog is hidden
    When I open the widget palette
    Then the palette shows a preview of every registered widget
    When I search the palette for "counter"
    Then the palette shows 1 widget preview

  Scenario: The palette is searched to find a widget
    Given I open the "builder" page
    When I open the widget palette
    Then the palette shows a preview of every registered widget
    When I search the palette for "table"
    Then the palette shows 1 widget preview
    And the preview of "antd-table" reads "Nightly"
    When I search the palette for "nothing-like-this"
    Then the palette shows 0 widget previews
    And the palette reports no matches
    When I search the palette for ""
    Then the palette shows a preview of every registered widget

  Scenario: A widget is found through the search suggestions and added
    Given I open the "builder" page
    When I pick the widget suggestion "antd-button"
    Then the palette shows 1 widget preview
    When I choose the "antd-button" widget
    And I set the reaction for "clicked" to call "log-event"
    And I add the widget
    Then the page has 1 cell
