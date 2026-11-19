Feature: The height of an infinite table
  A list is by default as tall as its rows, at most its height. The Archive
  page's list FILLS the window instead: its rows take the room from where
  they start down to the bottom of the window — less the room the page
  keeps for the scale under it —, never more, and never less than the
  list's own height. The page then needs no scrolling to reach the scale.

  Scenario: In a short window the list keeps its least height
    Given I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    And the infinite table's list is 320 pixels tall

  Scenario: In a tall window the list reaches down to the bottom, and the scale under it stays in view
    Given the browser window is 1200 pixels tall
    And I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    And the infinite table's list is more than 320 pixels tall
    And the infinite table ends 96 pixels above the bottom of the window
    And the list position is in view under the table
    And the infinite table renders only a window of its rows

  Scenario: The list follows the window as it is resized
    Given the browser window is 1200 pixels tall
    And I open the "infinite-list" page
    Then the infinite table ends 96 pixels above the bottom of the window
    When the browser window is 1000 pixels tall
    Then the infinite table ends 96 pixels above the bottom of the window
    # Short again: the list stops at its least height and the page scrolls instead.
    When the browser window is 600 pixels tall
    Then the infinite table's list is 320 pixels tall

  Scenario: A taller list says so where it stands
    Given the browser window is 1200 pixels tall
    And I open the "infinite-list" page
    Then the infinite table ends 96 pixels above the bottom of the window
    # More rows are in view than the eight a list of 320 pixels shows.
    And the list stands at row 1 of at least 200
    And the list shows more than 8 rows in view

  Scenario: A tall list still gets its next rows — two hundred are too few to fetch ahead, so its end asks
    Given the browser window is 1200 pixels tall
    And I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    And the infinite table's list is more than 320 pixels tall
    When I scroll the infinite table to its end
    Then the list holds the rows 1 to 400
    And the infinite table shows "400+ rows"

  Scenario: A window made taller does not send a list scrolled down back for the rows behind it
    # The page's own mark (fetchAhead) asks only on the way the list is SCROLLED. A taller box remakes the row
    # window further back — which is not a scroll up.
    Given I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    When I edit the state JSON setting "viewModels.widgets.infinite-list.table.default.fetchAhead" to 198
    And I scroll the infinite table to its end
    Then the list holds the rows 1 to 600
    When I scroll the infinite table to row 392
    Then the list holds the rows 201 to 800
    When the browser window is 1000 pixels tall
    Then the infinite table's list is more than 320 pixels tall
    And the server has had time to answer
    And the list holds the rows 201 to 800

  Scenario: On a page the host made one screen tall, a list in a growing row takes what the other rows leave
    Given the browser window is 1000 pixels tall
    And I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    When I edit the state JSON setting "viewModels.widgets.infinite-list.table.default.heightMode" to "fill-cell"
    And I edit the state JSON setting "viewModels.pages.infinite-list.default.rows.1.classes" to "flex-1"
    And the host makes the page end 16 pixels above the bottom of the window
    Then the infinite table's list ends where the cell "table-archive" ends
    And the infinite table's list is more than 320 pixels tall
    And the list position is in view under the table
    # The list scrolls inside itself: two hundred rows are held, a window of them rendered.
    And the infinite table renders only a window of its rows
