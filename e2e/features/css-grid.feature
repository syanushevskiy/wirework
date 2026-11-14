Feature: CSS grid — a page laid out by template areas, filled by drag and drop or a typed form
  "css-grid" lays a page out as a CSS grid of SLOTS. Its picture is CSS's own
  grid-template-areas, one line per row, every token the id of a widget and
  "." an empty slot — a widget spanning several slots is one area. In edit
  mode the picture is DRAWN: a widget dragged by its handle onto a slot, or
  onto another widget to swap places with it; an edge or the corner pulled
  over the slots it spans, taking them from a neighbour — one left with no
  slot waits in a tray under the grid, with a warning, until it is dragged
  back; or filled from a form that can only hold what exists — a select per
  slot. Nothing is refused. The columns and rows are sized in
  the same form as a number with a unit or a keyword. The demo's run page is
  such a skeleton. (doc/ADR/0013-css-grid.md)

  Scenario: The run page is a css-grid skeleton
    Given I open the address "/demo/runs/123459"
    Then the page layout uses the "css-grid" engine
    And the grid has 6 rows and 3 columns
    And the grid columns are sized "1fr 1fr 12rem"
    And the cell "label-run-name" fills the slots "1-1/1-1"
    And the cell "status-run" fills the slots "1-2/1-2"
    And the cell "button-back" fills the slots "1-3/1-3"
    And the cell "steps-run" fills the slots "2-1/2-3"
    And the cell "descriptions-run" fills the slots "3-1/3-2"
    And the cell "timeline-run" fills the slots "3-3/3-3"
    And the cell "result-run" fills the slots "4-1/4-2"
    And the cell "button-retry" fills the slots "4-3/4-3"
    And the cell "dialog-retry" fills the slots "5-1/5-3"
    And the cell "echo-route" fills the slots "6-1/6-3"
    And the cells "label-run-name, button-back" sit side by side
    And the cell "label-run-name" is wider than the cell "button-back"
    And the cell "label-run-name" reads "Nightly regression"
    # A hidden widget leaves its slot empty: the picture does not move.
    And the cell "result-run" is hidden
    And the cell "result-run" fills the slots "4-1/4-2"

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

  Scenario: A drop onto another widget swaps the two places
    Given I open the "builder" page
    When I select the "css-grid" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    And I add the widget
    And I edit the page
    And I drop the cell "custom-2" onto the cell "custom-1"
    Then the cell "custom-2" fills the slots "1-1/1-1"
    And the cell "custom-1" fills the slots "2-1/2-1"
    And the cell "custom-1" sits below the cell "custom-2"
    And every widget of the grid has a slot
    # The same drop by the slot's place: nothing is refused, the two swap back.
    When I drag the cell "custom-2" to the slot row 2 column 1
    Then the cell "custom-1" fills the slots "1-1/1-1"
    And the cell "custom-2" fills the slots "2-1/2-1"

  Scenario: A widget widened over its neighbour takes its slots, and the neighbour waits off the grid until it is dragged back
    Given I open the "builder" page
    When I select the "css-grid" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "first"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "second"
    And I add the widget
    And I edit the page
    And I add a column
    And I add a column
    # One row of three: the first widget over two thirds, the second in the last third.
    And I pull the right edge of the cell "custom-1" to the slot row 1 column 2
    And I drag the cell "custom-2" to the slot row 1 column 3
    And I remove row 2
    Then the grid has 1 row and 3 columns
    And the cell "custom-1" fills the slots "1-1/1-2"
    And the cell "custom-2" fills the slots "1-3/1-3"
    # Pulled over the last third, the first takes it: the second has no slot left and says so until it is placed.
    When I pull the right edge of the cell "custom-1" to the slot row 1 column 3
    Then the cell "custom-1" fills the slots "1-1/1-3"
    And the cell "custom-2" waits off the grid
    And the grid says 1 widget has no slot
    And the page warns 'cell "custom-2" has no slot'
    # Dragged from the tray onto the "+" row it is in the grid again.
    When I drag the cell "custom-2" to the slot row 2 column 1
    Then the grid has 2 rows and 3 columns
    And the cell "custom-2" fills the slots "2-1/2-1"
    And every widget of the grid has a slot
    And the page shows no warnings
    # An edge pulled back lets the slots go; a neighbour with a rectangle left only shrinks.
    When I pull the right edge of the cell "custom-1" to the slot row 1 column 2
    Then the cell "custom-1" fills the slots "1-1/1-2"
    When I pull the right edge of the cell "custom-2" to the slot row 2 column 3
    And I pull the bottom edge of the cell "custom-1" to the slot row 2 column 1
    Then the cell "custom-1" fills the slots "1-1/2-2"
    And the cell "custom-2" fills the slots "2-3/2-3"
    # Off the grid by hand, and back onto a widget: it takes the place, the other one waits.
    When I drag the cell "custom-2" off the grid
    Then the cell "custom-2" waits off the grid
    When I drop the cell "custom-2" onto the cell "custom-1"
    Then the cell "custom-2" fills the slots "1-1/2-2"
    And the cell "custom-1" waits off the grid
    And the grid says 1 widget has no slot

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
