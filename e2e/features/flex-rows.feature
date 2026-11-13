Feature: Flex rows — a layout engine that speaks Tailwind's flex classes
  "flex-rows" lays cells out in rows, each row a CSS flexbox. A row and a
  cell take Tailwind's flex class names — flex-1, basis-1/3, justify-between,
  items-center, gap-4, self-end, order-2 — which the engine itself turns into
  style; Tailwind is not needed. In edit mode every row and every cell has a
  field for its classes, and every cell is DRAGGED by its handle: let go on
  another cell's middle the two swap places, on its left or right edge the
  dragged one goes beside it, on the strip between two rows it takes a row
  of its own. The demo's cards page is a FlexLayout
  of two cards, one holding react-grid-layout and one holding flex rows:
  three engines on one page. (doc/flex-rows-design.md)

  Scenario: The cards page is a FlexLayout of two cards side by side, a grid inside one and flex rows inside the other
    Given I open the "cards" page
    Then the page layout uses the "flexlayout" engine
    # A third card on a CSS grid sits below the two (css-grid.feature).
    And the page has 3 cells
    And the cells "card-counter, card-profile" sit side by side
    And the container "card-counter" runs on the "react-grid-layout" engine
    And the container "card-profile" runs on the "flex-rows" engine
    And the container "card-counter" holds the cells "statistic-clicks, counter-clicks, button-reset-clicks"
    And the container "card-profile" holds the cells "button-name-alice, button-name-bob, button-name-clear, input-profile-name, switch-profile-refresh, label-greeting"
    # Inside the profile card the flex classes do their work: the name field takes its row, the switch keeps its size.
    And the cells "input-profile-name, switch-profile-refresh" sit side by side
    And the cell "input-profile-name" has the flex classes "flex-1"
    And the cell "switch-profile-refresh" has the flex classes "shrink-0"
    And the cell "input-profile-name" sits below the cell "button-name-alice"
    And the cell "label-greeting" sits below the cell "input-profile-name"
    # The widgets inside work as on any page: the counter moves the statistic, the controls write the global settings.
    When I click the counter 2 times
    Then the statistic reads "Clicks" and "2"
    When I click the button "Reset"
    Then the statistic reads "Clicks" and "0"
    When I type "Sergey" into the input
    Then the cell "label-greeting" reads "Sergey"
    When I flip the switch
    Then the state JSON contains '"autoRefresh": true'

  Scenario: In the profile card a row of buttons of different sizes wraps when the card gets narrow, and the buttons write the name the field edits
    Given I open the "cards" page
    And the server has had time to answer
    # Three buttons in one row: the first grows into the room left, the other two keep the width their basis says.
    Then the cell "button-name-alice" has the flex classes "basis-32 grow"
    And the cell "button-name-bob" has the flex classes "flex-none basis-24"
    And the cell "button-name-clear" has the flex classes "flex-none basis-20"
    And the cells "button-name-alice, button-name-bob, button-name-clear" sit side by side
    And the cell "button-name-alice" is wider than the cell "button-name-bob"
    And the cell "button-name-bob" is wider than the cell "button-name-clear"
    # The buttons set the name; the field and the greeting follow, as they do a typed name.
    When I click the button "Alice"
    Then the cell "label-greeting" reads "Alice"
    When I type "Sergey" into the input
    Then the cell "label-greeting" reads "Sergey"
    When I click the button "Bob"
    Then the cell "label-greeting" reads "Bob"
    When I click the button "Clear"
    Then the cell "label-greeting" reads ""
    # Narrow the window and the card with it: the button that no longer fits goes to the next line of its row, and comes back with the room.
    When the browser window is 600 pixels wide
    Then the cells "button-name-alice, button-name-bob" sit side by side
    And the cell "button-name-clear" sits below the cell "button-name-alice"
    And the cell "input-profile-name" sits below the cell "button-name-clear"
    When the browser window is 520 pixels wide
    Then the cell "button-name-bob" sits below the cell "button-name-alice"
    And the cells "button-name-bob, button-name-clear" sit side by side
    When the browser window is 1280 pixels wide
    Then the cells "button-name-alice, button-name-bob, button-name-clear" sit side by side

  Scenario: With the user overlay on, a cell's flex classes go into the user's own view, as a drag on a grid does
    Given I open the "builder" page
    When I select the "flex-rows" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "Mine"
    And I add the widget
    And I enable the user overlay
    And I edit the page
    And I set the flex classes of the cell "custom-1" to "basis-1/2 self-end"
    Then the cell "custom-1" has the flex classes "basis-1/2 self-end"
    And there are at least 1 pending change
    When I save the page
    Then the cell "custom-1" has the flex classes "basis-1/2 self-end"
    And the page uses the "my-own" view
    And the state JSON contains '"classes": "basis-1/2 self-end"'
    # The shared page is untouched: with the overlay off the cell has no classes.
    When I disable the user overlay
    Then the page uses the "default" view
    And the cell "custom-1" has no flex classes

  Scenario: In the builder, cells added on flex rows are moved between rows and given their classes
    Given I open the "builder" page
    When I select the "flex-rows" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "First"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "Second"
    And I add the widget
    Then the engine is locked as "flex-rows"
    # Every added cell starts a row of its own; a drag puts them together — there are no arrows.
    And the page has 2 rows
    And the cell "custom-2" sits below the cell "custom-1"
    When I edit the page
    Then the cell "custom-1" has no arrows to move it by
    # Let go on a cell's right edge, the dragged one goes after it, into its row.
    When I drop the cell "custom-2" after the cell "custom-1"
    Then the page has 1 row
    And the cells "custom-1, custom-2" sit side by side
    # Let go on a cell's middle, the two swap places.
    When I swap the cell "custom-2" with the cell "custom-1"
    Then row 1 holds the cells "custom-2, custom-1"
    # Let go on the strip between rows, it takes a row of its own; on a cell's left edge it is back before it.
    When I drop the cell "custom-1" into a new row above row 1
    Then the page has 2 rows
    And row 1 holds the cells "custom-1"
    And the cell "custom-2" sits below the cell "custom-1"
    When I drop the cell "custom-1" into a new row below row 2
    Then row 2 holds the cells "custom-1"
    When I drop the cell "custom-2" before the cell "custom-1"
    Then the page has 1 row
    And row 1 holds the cells "custom-2, custom-1"
    When I set the flex classes of row 1 to "justify-between"
    And I set the flex classes of the cell "custom-1" to "flex-none self-center"
    Then the cell "custom-1" has the flex classes "flex-none self-center"
    And row 1 has the flex classes "justify-between"
    When I save the page
    Then the state JSON contains '"classes": "justify-between"'
    And the state JSON contains '"classes": "flex-none self-center"'
    And the cell "custom-1" has no edit chrome

  Scenario: A class the engine does not know is flagged in the field and reported above the page
    Given I open the "builder" page
    When I select the "flex-rows" layout engine
    And I choose the "antd-label" widget
    And I set the setting "text" to "Alone"
    And I add the widget
    And I edit the page
    And I set the flex classes of the cell "custom-1" to "flex-1 bg-red-500"
    Then the flex classes field of the cell "custom-1" is marked invalid
    And the page warns 'cell "custom-1": unknown classes bg-red-500'
    When I set the flex classes of the cell "custom-1" to "flex-1"
    Then the page shows no warnings

  Scenario: The content of a card on flex rows is edited like the page, classes and all
    Given I open the "cards" page
    And the server has had time to answer
    When I disable the user overlay
    And I edit the page
    And I edit the content of the cell "card-profile"
    Then the breadcrumb reads "cards › card-profile"
    And the page layout uses the "flex-rows" engine
    And the page has 3 rows
    When I set the flex classes of the cell "switch-profile-refresh" to "shrink-0 self-start"
    And I save the page
    Then the cell "switch-profile-refresh" has the flex classes "shrink-0 self-start"
    When I follow the breadcrumb "cards"
    Then the page layout uses the "flexlayout" engine
    And the page has 3 cells
