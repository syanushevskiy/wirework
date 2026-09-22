Feature: Basic widgets
  The five basic widgets every UI library has that the standard kinds were
  missing: select, tag, checkbox, progress and
  alert. Each is a standard contract with an antd implementation. An author
  adds them in the builder and wires them to the store, so what one widget
  writes another one shows.

  Scenario: Every basic widget has a live preview in the palette
    Given I open the "builder" page
    When I open the widget palette
    Then the preview of "antd-select" reads "Choose one"
    And the preview of "antd-tag" reads "Success"
    And the preview of "antd-checkbox" reads "Remember me"
    And the preview of "antd-progress" reads "Upload"
    And the preview of "antd-alert" reads "Saved"

  Scenario: A choice is stored, and a tag bound to it shows it
    Given I open the "builder" page
    When I choose the "antd-select" widget
    And I set the "input" port "value" to "form.environment"
    And I set the reaction for "changed" to set "form.environment" from "value"
    And I add the widget
    And I choose the "antd-tag" widget
    And I set the "input" port "text" to "form.environment"
    And I set the setting "text" to "none chosen"
    And I add the widget
    Then the tag reads "none chosen"
    When I choose "Two" in the select
    Then the select holds "two"
    And the tag reads "two"
    And the state JSON contains '"environment": "two"'

  Scenario: A checkbox stores a yes or no
    Given I open the "builder" page
    When I choose the "antd-checkbox" widget
    And I set the "input" port "checked" to "form.confirmed"
    And I set the reaction for "changed" to set "form.confirmed" from "checked"
    And I add the widget
    Then the checkbox is unchecked
    When I tick the checkbox
    Then the checkbox is checked
    And the state JSON contains '"confirmed": true'
    When I untick the checkbox
    Then the checkbox is unchecked

  Scenario: Progress follows the stored percentage and never passes 100
    Given I open the "builder" page
    When I choose the "antd-progress" widget
    And I set the "input" port "percent" to "form.percent"
    And I add the widget
    And I choose the "antd-counter" widget
    And I set the "input" port "value" to "form.percent"
    And I set the reaction for "incremented" to set "form.percent" from "value"
    And I set the setting "step" to "30"
    And I add the widget
    Then the progress shows 0 percent
    When I click the counter 2 times
    Then the progress shows 60 percent
    When I click the counter 2 times
    Then the progress shows 100 percent
    And the state JSON contains '"percent": 120'

  Scenario: An alert is announced with its severity
    Given I open the "builder" page
    When I choose the "antd-alert" widget
    And I set the setting "title" to "Rollouts pause when the error rate passes 2%"
    And I set the setting "tone" to "warning"
    And I add the widget
    Then the alert reads "Rollouts pause when the error rate passes 2%" as a "warning"
