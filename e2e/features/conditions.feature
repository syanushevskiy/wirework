Feature: Conditions — a widget shown when a predicate holds
  A widget's template may say WHEN it shows: a list of checks over the
  page's data, every one of which must hold — "unless run.error is empty",
  "when runs.total is greater than 10". The checks are named: eight
  standard ones (empty, true, false, equals, one of, contains, greater
  than, less than) and whatever the application registers under its own
  name. A hidden widget keeps its place on the page and comes back as it
  was; while the page is edited it stays visible, dimmed, with the reason.
  (doc/conditions-design.md)

  Scenario: The runs page shows "Open run" only while a run is selected
    Given I open the "runs" page
    Then the cell "button-open-run" is hidden
    When I click the table row "123456"
    Then the cell "button-open-run" is shown
    # It fades in, and fades out on its way: the cell is empty once the animation has ended.
    And the cell "button-open-run" appears with "fade"
    And the cell "button-open-run" disappears with "fade"
    When the store holds at "runs.selected":
      """
      ""
      """
    Then the cell "button-open-run" is hidden

  Scenario: The run page shows its error line only when there is an error
    Given I open the address "/demo/runs/nope"
    Then the cell "label-run-error" is shown
    And the cell "label-run-error" reads "There is no run nope"
    When I open the address "/demo/runs/123459"
    Then the cell "label-run-name" reads "Nightly regression"
    And the cell "label-run-error" is hidden

  Scenario: A check the application registered decides like a standard one
    # The fake server's rule: a failed run with an even id would run again.
    Given I open the address "/demo/runs/123456"
    Then the status badge reads "Status: Failed"
    And the cell "tag-run-retry" is shown
    And the cell "tag-run-retry" reads "Retry possible"
    # An appearance the application registered ("drop"), picked by name like a standard one.
    And the cell "tag-run-retry" appears with "drop"
    When I open the address "/demo/runs/123457"
    Then the status badge reads "Status: Success"
    And the cell "tag-run-retry" is hidden

  Scenario: In the builder a condition is typed in words, read back, and decides on the page
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "Plenty"
    And I add a condition
    And I set the condition to "demo.count" "is greater than" "10"
    Then the condition reads "when demo.count is greater than 10"
    And the add widget button is enabled
    # A conditional widget may APPEAR and DISAPPEAR with an animation from the list — the standard ones and the
    # application's own "drop"; it simply shows and goes otherwise.
    When I set the appearance to "slide up"
    And I set the disappearance to "drop"
    And I add the widget
    Then the page has 1 cell
    And the cell "custom-1" is hidden
    And the cell "custom-1" appears with "slide-up"
    And the cell "custom-1" disappears with "drop"
    And the state JSON contains '"is": "greater"'
    And the state JSON contains '"appear": "slide-up"'
    And the state JSON contains '"disappear": "drop"'
    When the store holds at "demo.count":
      """
      11
      """
    Then the cell "custom-1" is shown
    And the label reads "Plenty"
    # Hidden again, it drops out: the cell is empty once the animation has ended.
    When the store holds at "demo.count":
      """
      5
      """
    Then the cell "custom-1" is hidden

  Scenario: Several conditions must all hold; "unless" negates one
    Given I open the "builder" page
    And the store holds at "demo":
      """
      { "count": 11, "error": "" }
      """
    When I choose the "antd-label" widget
    And I set the setting "text" to "All good"
    And I add a condition
    And I set the condition to "demo.count" "is greater than" "10"
    And I add a condition
    And I set condition 2 to "demo.error" "is empty"
    And I negate condition 2
    Then condition 2 reads "unless demo.error is empty"
    When I add the widget
    Then the cell "custom-1" is hidden
    When the store holds at "demo.error":
      """
      "boom"
      """
    Then the cell "custom-1" is shown

  Scenario: A value the check refuses keeps the widget from being added, and says why
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "Plenty"
    And I add a condition
    And I set the condition to "demo.count" "is greater than" "ten"
    Then the add widget button is disabled
    And the condition problem is "not a number"
    When I set the condition to "demo.count" "is greater than" "10"
    Then the add widget button is enabled

  Scenario: While the page is edited a hidden widget stays visible, dimmed, with the reason
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "Plenty"
    And I add a condition
    And I set the condition to "demo.count" "is greater than" "10"
    And I add the widget
    Then the cell "custom-1" is hidden
    When I edit the page
    Then the cell "custom-1" says it is hidden now "when demo.count is greater than 10"
    When I edit the cell "custom-1"
    Then the condition reads "when demo.count is greater than 10"
    When I remove condition 1
    And I save the widget
    And I save the page
    Then the cell "custom-1" always shows
    And the label reads "Plenty"

  Scenario: A configuration that names a check nobody registered is a problem of that cell, and the page stands
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "Fine"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "Doubtful"
    And I add a condition
    And I set the condition to "demo.count" "is empty"
    And I add the widget
    Then the page has 2 cells
    When the store holds at "viewModels.widgets.custom.custom-2.default.when":
      """
      [{ "path": "demo.count", "is": "bigger", "to": 1 }]
      """
    Then the cell "custom-2" shows the problem 'unknown predicate "bigger"'
    And the cell "custom-1" reads "Fine"
    And the boot validation status is "view models: 1 problem(s)"

  Scenario: The constructor composes checks step by step, with and, or, not and groups in parentheses
    Given I open the "builder" page
    And the store holds at "demo":
      """
      { "count": 11, "error": "", "force": false }
      """
    When I choose the "antd-label" widget
    And I set the setting "text" to "Composed"
    And I add a condition
    And I switch the condition to the constructor
    # The constructor starts as one group of one blank test.
    Then the condition problem is "finish every condition"
    And the add widget button is disabled
    When I set constructor condition "0" to "demo.count" "is greater than" "10"
    Then the condition reads "when demo.count is greater than 10"
    When I add a group to "the constructor"
    # The new group ("1") starts with a blank test of its own ("1.0").
    Then the condition problem is "finish every condition"
    When I set constructor condition "1.0" to "demo.error" "is empty"
    And I add a condition to "constructor group 1"
    And I set constructor condition "1.1" to "demo.force" "is true"
    And I join "constructor group 1" with "or"
    Then the condition reads "when demo.count is greater than 10 and (demo.error is empty or demo.force is true)"
    And the add widget button is enabled
    When I add the widget
    Then the cell "custom-1" is shown
    And the state JSON contains '"expression": "demo.count is greater than 10 and (demo.error is empty or demo.force is true)"'
    When the store holds at "demo.error":
      """
      "boom"
      """
    Then the cell "custom-1" is hidden
    When the store holds at "demo.force":
      """
      true
      """
    Then the cell "custom-1" is shown
    When I edit the page
    And I edit the cell "custom-1"
    # The words come back as the tree they were built from, and can be built on.
    Then the condition reads "when demo.count is greater than 10 and (demo.error is empty or demo.force is true)"
    When I negate "constructor group 1"
    And I remove constructor condition "0"
    Then the condition reads "when not (demo.error is empty or demo.force is true)"

  Scenario: The host's own checks are offered in the builder by their phrase
    Given I open the "builder" page
    When I choose the "antd-tag" widget
    And I add a condition
    And I set the condition to "demo.run" "can be retried"
    Then the condition reads "when demo.run can be retried"
    When I add the widget
    And the store holds at "demo.run":
      """
      { "id": "123456", "status": { "state": "Failed" } }
      """
    Then the cell "custom-1" is shown
