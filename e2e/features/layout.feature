Feature: Layout engines
  A page view model DECLARES its layout engine by name; the engine is a
  registered plugin that owns the template shape and the layout operations,
  and the playground never converts between engines. "react-grid-layout"
  places cells on a 12-column grid by x/y/w/h. "Edit page" opens ONE
  session: cells can be dragged, resized, edited and removed through the
  chrome the engine places on each cell; "Save page" keeps everything,
  "Cancel" drops everything.

  Scenario: The overview page renders on the grid engine
    Given I open the "overview" page
    Then the page layout uses the "react-grid-layout" engine
    And the page has 8 cells
    And I see a widget "antd-label"
    And I see a widget "antd-counter"
    And I see a widget "antd-echo"
    And I see a widget "antd-button"
    And I see a widget "antd-tag"
    And the cell "counter-main" is placed at x 0 y 1 w 6 h 2

  Scenario: The runs page renders on the grid engine
    Given I open the "runs" page
    Then the page layout uses the "react-grid-layout" engine
    And the page has 9 cells
    And I see a widget "antd-table"
    And I see a widget "antd-pagination"
    And I see a widget "antd-refresher"
    And I see a widget "antd-multi-select"
    And I see a widget "antd-filter-bar"
    And the cell "table-main" is placed at x 0 y 3 w 9 h 5

  Scenario: The default page view applies without user selection
    Given I open the "overview" page
    Then the page uses the "default" view

  Scenario: Cells have no handles or chrome outside edit mode
    Given I open the "overview" page
    Then the page mode is "view"
    And there are no drag handles
    And the cell "counter-main" has no edit chrome

  Scenario: A dragged cell is saved (a demo page: into the user's own template)
    Given I open the "overview" page
    When I edit the page
    Then the page mode is "editing"
    When I drag the cell "counter-main" onto the cell "label-main"
    Then the cell "counter-main" is placed at x 0 y 0 w 6 h 2
    When I save the page
    Then the page mode is "view"
    And there are no drag handles
    And the cell "counter-main" is placed at x 0 y 0 w 6 h 2

  Scenario: Cancelling a page edit restores the saved layout
    Given I open the "overview" page
    When I edit the page
    And I drag the cell "counter-main" onto the cell "label-main"
    Then the cell "counter-main" is placed at x 0 y 0 w 6 h 2
    When I cancel the page edit
    Then the page mode is "view"
    And the cell "counter-main" is placed at x 0 y 1 w 6 h 2

  Scenario: A resized cell is saved (a demo page: into the user's own template)
    Given I open the "overview" page
    When I edit the page
    And I widen the cell "echo-counter" by 1 column
    Then the cell "echo-counter" is placed at x 6 y 1 w 4 h 2
    When I save the page
    Then the cell "echo-counter" is placed at x 6 y 1 w 4 h 2

  Scenario: The builder's engine is a free choice until the first widget is placed
    Given I open the "builder" page
    When I select the "gridstack" layout engine
    Then the page layout uses the "gridstack" engine
    When I select the "react-grid-layout" layout engine
    Then the page layout uses the "react-grid-layout" engine
    When I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    Then the engine is locked as "react-grid-layout"

  Scenario: A third engine plugs in without core changes (gridstack)
    Given I open the "builder" page
    When I select the "gridstack" layout engine
    And I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.a"
    And I set the reaction for "incremented" to set "demo.a" from "value"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    And I add the widget
    Then the page layout uses the "gridstack" engine
    And the page has 2 cells
    And the cell "custom-2" is placed at x 0 y 2 w 12 h 2
    And there are no drag handles
    When I edit the page
    And I drag the cell "custom-2" onto the cell "custom-1"
    Then the cell "custom-2" is placed at x 0 y 0 w 12 h 2
    When I edit the cell "custom-2"
    And I set the setting "text" to "Gridstack label"
    And I save the widget
    And I save the page
    Then the label reads "Gridstack label"
    And the cell "custom-2" is placed at x 0 y 0 w 12 h 2

  Scenario: A tree engine plugs in without core changes (FlexLayout)
    Given I open the "builder" page
    When I select the "flexlayout" layout engine
    And I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.f"
    And I set the reaction for "incremented" to set "demo.f" from "value"
    And I add the widget
    And I choose the "antd-echo" widget
    And I set the "input" port "value" to "demo.f"
    And I add the widget
    Then the page layout uses the "flexlayout" engine
    And the engine is locked as "flexlayout"
    When I select the tab "custom-1"
    And I click the counter 1 time
    Then the echo widget at "demo.f" shows "1"
    And the page has 2 cells
    When I edit the page
    And I remove the cell "custom-2"
    Then there are at least 1 pending change
    And the page has 1 cell
    When I save the page
    Then the page has 1 cell
    And the state JSON does not contain '"custom-2"'
