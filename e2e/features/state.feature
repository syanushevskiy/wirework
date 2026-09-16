Feature: State inspector
  The left side of the playground shows the whole state-management tree
  (view models + data models) as editable JSON. Widget interactions appear
  in it live, and applying an edit updates the widgets on the right.

  Scenario: Widget interactions are reflected in the state JSON
    Given I open the "demo" page
    When I click the counter 2 times
    Then the state JSON contains '"counter": 2'

  Scenario: Editing a data value updates the widgets
    Given I open the "demo" page
    When I edit the state JSON setting "demo.counter" to 41
    Then the echo widget at "demo.counter" shows "41"

  Scenario: Editing a view model updates the widgets
    Given I open the "demo" page
    When I edit the state JSON setting "viewModels.widgets.demo.label.loud.text" to "HELLO FROM STATE"
    Then the label reads "HELLO FROM STATE"

  Scenario: Invalid JSON is rejected with an error and never reaches the store
    Given I open the "demo" page
    When I replace the state JSON with "not json at all"
    Then the state error is shown
    And I see a widget "antd-label"

  Scenario: A structurally invalid view-model tree is rejected and never reaches the store
    Given I open the "demo" page
    When I replace the state JSON with '{"viewModels": {}}'
    Then the state error is shown
    And I see a widget "antd-label"
