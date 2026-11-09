Feature: CSS grid — a page laid out by template areas, filled by drag and drop or a typed form
  "css-grid" lays a page out as a CSS grid of SLOTS. Its picture is CSS's own
  grid-template-areas, one line per row, every token the id of a widget and
  "." an empty slot — a widget spanning several slots is one area. In edit
  mode the picture is DRAWN: a widget dragged by its handle onto the slot
  where it starts, its corner pulled over the slots it spans, a drop on a
  slot another widget holds refused; or filled from a form that can only
  hold what exists — a select per slot. The columns and rows are sized in
  the same form as a number with a unit or a keyword. The demo's run page is
  such a skeleton. (doc/css-grid-design.md)

  Scenario: The run page is a css-grid skeleton
    Given I open the address "/demo/runs/123459"
    Then the page layout uses the "css-grid" engine
    And the grid has 4 rows and 3 columns
    And the grid columns are sized "1fr 1fr 12rem"
    And the cell "label-run-name" fills the slots "1-1/1-2"
    And the cell "button-back" fills the slots "1-3/1-3"
    And the cell "status-run" fills the slots "2-1/2-1"
    And the cell "label-run-error" fills the slots "3-1/3-2"
    And the cell "tag-run-retry" fills the slots "3-3/3-3"
    And the cell "echo-route" fills the slots "4-1/4-3"
    And the cells "label-run-name, button-back" sit side by side
    And the cell "label-run-name" is wider than the cell "button-back"
    And the cell "label-run-name" reads "Nightly regression"
    # A hidden widget leaves its slot empty: the picture does not move.
    And the cell "label-run-error" is hidden
    And the cell "label-run-error" fills the slots "3-1/3-2"

  Scenario: The cards page holds a third card on a CSS grid below the two — four engines on one page
    Given I open the "cards" page
    And the server has had time to answer
    Then the page layout uses the "flexlayout" engine
    And the page has 3 cells
    And the container "card-session" runs on the "css-grid" engine
    And the cell "card-session" sits below the cell "card-counter"
    And the cell "card-session" sits below the cell "card-profile"
    And the container "card-session" holds the cells "label-session-name, tag-session-title, echo-session-roles"
    # The signed-in person as a skeleton: the name over two columns, the title in the third, the roles across below.
    And the cell "label-session-name" fills the slots "1-1/1-2"
    And the cell "tag-session-title" fills the slots "1-3/1-3"
    And the cell "echo-session-roles" fills the slots "2-1/2-3"
    And the cells "label-session-name, tag-session-title" sit side by side
    And the cell "echo-session-roles" sits below the cell "label-session-name"
    And the cell "label-session-name" reads "Alex Tester"
    And the tag reads "QA engineer"
    When I sign in as "admin"
    Then the cell "label-session-name" reads "Sam Keeper"
    And the tag reads "Administrator"

  Scenario: Widgets added in the builder each take a row, and a drop past the edge grows the grid
    Given I open the "builder" page
    When I select the "css-grid" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    And I add the widget
    Then the page layout uses the "css-grid" engine
    And the grid has 2 rows and 1 column
    And the cell "custom-1" fills the slots "1-1/1-1"
    And the cell "custom-2" fills the slots "2-1/2-1"
    And there are no slot selects
    When I edit the page
    And I drag the cell "custom-2" to the slot row 1 column 2
    Then the grid has 2 rows and 2 columns
    And the cell "custom-2" fills the slots "1-2/1-2"
    And the cells "custom-1, custom-2" sit side by side
    And the row 2 is empty
    When I remove row 2
    Then the grid has 1 row and 2 columns
    When I resize the cell "custom-2" to the slot row 2 column 2
    Then the grid has 2 rows and 2 columns
    And the cell "custom-2" fills the slots "1-2/2-2"
    When I save the page
    Then the state JSON contains '"engine": "css-grid"'
    And the state JSON contains '"custom-1 custom-2"'
    And the state JSON contains '". custom-2"'

  Scenario: A drop onto a slot another widget holds is refused
    Given I open the "builder" page
    When I select the "css-grid" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    And I add the widget
    And I edit the page
    And I drag the cell "custom-2" to the slot row 1 column 1
    Then the drop is refused because the slot holds "custom-1"
    And the cell "custom-2" fills the slots "2-1/2-1"
    And the cell "custom-1" fills the slots "1-1/1-1"

  Scenario: The slot table fills the same picture by name, and marks an area that is no rectangle
    Given I open the "builder" page
    When I select the "css-grid" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    And I add the widget
    And I edit the page
    Then the slot row 1 column 1 offers "empty, custom-1, custom-2"
    When I add a column
    Then the grid has 2 rows and 2 columns
    When I put "custom-2" into the slot row 1 column 2
    And I put "empty" into the slot row 2 column 1
    Then the cell "custom-2" fills the slots "1-2/1-2"
    And the cells "custom-1, custom-2" sit side by side
    # A row whose only widget has no other slot cannot go; an empty one can.
    And the row 1 cannot be removed
    When I remove row 2
    Then the grid has 1 row and 2 columns
    # An L is marked where it goes wrong and the page says so above; a rectangle again clears it.
    When I add a row
    And I put "custom-1" into the slot row 2 column 1
    And I put "custom-1" into the slot row 2 column 2
    Then the slot row 2 column 2 is marked invalid
    And the page warns 'area "custom-1" is not a rectangle'
    When I put "custom-2" into the slot row 2 column 2
    Then the page shows no warnings
    And the cell "custom-1" fills the slots "1-1/2-1"
    And the cell "custom-2" fills the slots "1-2/2-2"

  Scenario: The tracks are sized in a typed field and saved
    Given I open the "builder" page
    When I select the "css-grid" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    And I add the widget
    And I edit the page
    And I drag the cell "custom-2" to the slot row 1 column 2
    Then the grid columns are sized "1fr 1fr"
    When I set column 2 to 12 "rem"
    Then the grid columns are sized "1fr 12rem"
    And the cell "custom-1" is wider than the cell "custom-2"
    When I set column 1 to 1 "fr"
    And I set column 2 to 2 "fr"
    Then the grid columns are sized "1fr 2fr"
    And the cell "custom-2" is wider than the cell "custom-1"
    When I set row 1 to "min-content"
    Then the grid rows are sized "min-content auto"
    When I save the page
    Then the state JSON contains '"2fr"'
    And the state JSON contains '"min-content"'

  Scenario: A card's content on css-grid is edited as the page, and the layout goes where the edit target says
    Given I open the "builder" page
    When I choose the "antd-card" widget
    And I set the setting "title" to "Skeleton"
    And I add the widget
    Then the breadcrumb reads "builder › custom-1"
    When I select the "css-grid" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "inside"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "beside"
    And I add the widget
    Then the page layout uses the "css-grid" engine
    And the grid has 2 rows and 1 column
    When I edit the page
    And I drag the cell "custom-3" to the slot row 1 column 2
    Then the cells "custom-2, custom-3" sit side by side
    When I save the page
    And I follow the breadcrumb "builder"
    Then the container "custom-1" runs on the "css-grid" engine
    And the container "custom-1" holds the cells "custom-2, custom-3"
