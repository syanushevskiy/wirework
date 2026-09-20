Feature: Widget events
  Widgets declare the typed events they emit next to their input ports —
  emitting is the ONLY way a widget changes state: a reaction in the view
  model writes the store. The host injects an event bus; every cell receives
  an `emit` scoped to its own declaration, and subscribers see the widget
  type, event name, source cell and validated payload. The playground's
  event log subscribes to everything so events are visible and testable.

  Scenario: The event log starts empty and collapsed
    Given I open the "demo" page
    Then the "events" panel is collapsed
    When I expand the "events" panel
    Then the event log is empty

  Scenario: Clicking the counter emits a typed event from its cell
    Given I open the "demo" page
    And I expand the "events" panel
    When I click the counter 1 time
    Then the event log shows widget "antd-counter" event "incremented" with payload '{"value":1}'
    And the event log shows widget "antd-counter" event "incremented" from cell "counter-main"

  Scenario: Every emit is logged, newest first
    Given I open the "demo" page
    And I expand the "events" panel
    When I click the counter 3 times
    Then the event log has 3 entries
    And the event log shows widget "antd-counter" event "incremented" with payload '{"value":3}'

  Scenario: The host subscribes to an event and turns it into state
    Given I open the "demo" page
    And I expand the "events" panel
    Then the echo widget at "runs.selected" shows "∅"
    When I click the table row "123456"
    Then the event log shows widget "antd-table" event "row-selected" with '"key":"123456"' in its payload
    And the echo widget at "runs.selected" shows '"123456"'
    When I click the table row "123457"
    Then the echo widget at "runs.selected" shows '"123457"'

  Scenario: The builder lists the events a widget emits
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    Then the widget events list includes "incremented"
    When I choose the "antd-table" widget
    Then the widget events list includes "row-selected"
    When I choose the "antd-label" widget
    Then the widget emits no events

  Scenario: Two cells of the same widget emit with their own cell id
    Given I open the "builder" page
    And I expand the "events" panel
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.a"
    And I set the reaction for "incremented" to set "demo.a" from "value"
    And I add the widget
    And I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.b"
    And I set the reaction for "incremented" to set "demo.b" from "value"
    And I add the widget
    And I click the counter in cell "custom-2" 1 time
    Then the event log has 1 entry
    And the event log shows widget "antd-counter" event "incremented" from cell "custom-2"

  Scenario: The event log can be cleared
    Given I open the "demo" page
    And I expand the "events" panel
    When I click the counter 2 times
    And I clear the event log
    Then the event log is empty

  Scenario: The counter's own write is a declared reaction, not widget code
    Given I open the "demo" page
    Then the state JSON contains '"set": "demo.counter"'
    And the echo widget at "demo.counter" shows "0"
    When I click the counter 2 times
    Then the echo widget at "demo.counter" shows "2"

  Scenario: A user wires an event to a store path in the builder
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "runs.data"
    And I set the reaction for "row-selected" to set "runs.picked" from "key"
    And I add the widget
    And I choose the "antd-echo" widget
    And I set the "input" port "value" to "runs.picked"
    And I add the widget
    Then the echo widget at "runs.picked" shows "∅"
    When I click the table row "123457"
    Then the echo widget at "runs.picked" shows '"123457"'

  Scenario: A button click runs a host action wired in the view model
    Given I open the "demo" page
    And I expand the "events" panel
    When I click the counter 2 times
    Then the echo widget at "demo.counter" shows "2"
    When I click the button "Reset counter"
    Then the event log shows widget "antd-button" event "clicked" with payload '{"label":"Reset counter"}'
    And the echo widget at "demo.counter" shows "0"

  Scenario: A page change requests that page from the server through a host action
    Given I open the "demo" page
    And I expand the "events" panel
    Then the pagination shows page 1
    And the table has 5 rows
    When I go to page 2 of the pagination
    Then the event log shows widget "antd-pagination" event "changed" with payload '{"page":2,"pageSize":5}'
    And the pagination shows page 2
    # Every request moves unfinished runs one step: queued → running → finished.
    And the table row "123461" shows "Running" for "status.state"
    And the table has 5 rows
    And the table is not loading
    When I go to page 5 of the pagination
    Then the table row "123478" shows "Success" for "status.state"
    And the table has 3 rows

  Scenario: Editing the paginator on the shared page keeps its whole reaction chain
    Given I open the "demo" page
    When I disable the user overlay
    And I edit the page
    And I edit the cell "pagination-runs"
    Then the reaction for "changed" keeps 2 more reactions
    When I set the setting "size" to "small"
    And I save the widget
    And I save the page
    And I go to page 2 of the pagination
    Then the table row "123461" shows "Running" for "status.state"

  Scenario: A user wires a button to a host action in the builder
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.counter"
    And I set the reaction for "incremented" to set "demo.counter" from "value"
    And I add the widget
    And I choose the "antd-button" widget
    And I set the setting "label" to "Reset"
    And I set the reaction for "clicked" to call "reset-counter"
    And I add the widget
    And I click the counter 3 times
    Then the counter shows "3"
    When I click the button "Reset"
    Then the counter shows "0"

  Scenario: The demo input is required and stores its text through a reaction
    Given I open the "demo" page
    Then the input is invalid with "required"
    When I type "Sergey" into the input
    Then the input is valid
    And the state JSON contains '"name": "Sergey"'
