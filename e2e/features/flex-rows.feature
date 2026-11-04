Feature: Flex rows — a layout engine that speaks Tailwind's flex classes
  "flex-rows" lays cells out in rows, each row a CSS flexbox. A row and a
  cell take Tailwind's flex class names — flex-1, basis-1/3, justify-between,
  items-center, gap-4, self-end, order-2 — which the engine itself turns into
  style; Tailwind is not needed. In edit mode every row and every cell has a
  field for its classes, and every cell four arrows that move it within its
  row or into the row above or below. The demo's cards page is a FlexLayout
  of two cards, one holding react-grid-layout and one holding flex rows:
  three engines on one page. (doc/flex-rows-design.md)

  Scenario: The cards page is a FlexLayout of two cards side by side, a grid inside one and flex rows inside the other
    Given I open the "cards" page
    Then the page layout uses the "flexlayout" engine
    And the page has 2 cells
    And the cells "card-counter, card-profile" sit side by side
    And the container "card-counter" runs on the "react-grid-layout" engine
    And the container "card-profile" runs on the "flex-rows" engine
    And the container "card-counter" holds the cells "statistic-clicks, counter-clicks, button-reset-clicks"
    And the container "card-profile" holds the cells "input-profile-name, switch-profile-refresh, label-greeting"
    # Inside the profile card the flex classes do their work: the name field takes the row, the switch keeps its size.
    And the cells "input-profile-name, switch-profile-refresh" sit side by side
    And the cell "input-profile-name" has the flex classes "flex-1"
    And the cell "switch-profile-refresh" has the flex classes "shrink-0"
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
    # Every added cell starts a row of its own; the arrows put them together.
    And the page has 2 rows
    And the cell "custom-2" sits below the cell "custom-1"
    When I edit the page
    And I move the cell "custom-2" up
    Then the page has 1 row
    And the cells "custom-1, custom-2" sit side by side
    When I move the cell "custom-2" left
    Then row 1 holds the cells "custom-2, custom-1"
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
    And the page has 2 rows
    When I set the flex classes of the cell "switch-profile-refresh" to "shrink-0 self-start"
    And I save the page
    Then the cell "switch-profile-refresh" has the flex classes "shrink-0 self-start"
    When I follow the breadcrumb "cards"
    Then the page layout uses the "flexlayout" engine
    And the page has 2 cells
