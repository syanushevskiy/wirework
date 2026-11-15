Feature: Row actions — a star that appears on a row under the pointer and marks it as a favourite
  A table may offer tools of a single row. The Archive page lists one, the
  standard star: it stands at the start of every row, out of sight until the
  pointer is over the row, and pressing it tells the page — which asks the
  server to mark the run as a favourite. A row that is a favourite keeps its
  star in view. The table itself stores nothing: the mark is the row's own
  data, as the server has it.

  Scenario: The star shows on the row under the pointer, and only there
    Given I open the "archive" page
    Then the list holds the rows 1 to 200
    And the table row "123456" hides the action "favorite"
    When I hover the table row "123456"
    Then the table row "123456" shows the action "favorite"
    And the table row "123457" hides the action "favorite"
    When I hover the table row "123457"
    Then the table row "123457" shows the action "favorite"
    And the table row "123456" hides the action "favorite"

  Scenario: Pressing the star marks the row as a favourite, and it stays in view
    Given I open the "archive" page
    Then the table row "123456" is not a favorite
    When I use the action "favorite" on the table row "123456"
    Then the table row "123456" is a favorite
    And the state JSON contains '"favorite": true'
    # The pointer elsewhere: a favourite row still says so.
    When I hover the table row "123458"
    Then the table row "123456" shows the action "favorite"
    And the table row "123457" hides the action "favorite"
    # One row was changed where it is held: the list was not asked for again.
    And the list holds the rows 1 to 200
    And no widget has crashed

  Scenario: Pressing the star of a favourite takes the mark away
    Given I open the "archive" page
    When I use the action "favorite" on the table row "123457"
    Then the table row "123457" is a favorite
    When I use the action "favorite" on the table row "123457"
    Then the table row "123457" is not a favorite
    When I hover the table row "123459"
    Then the table row "123457" hides the action "favorite"

  Scenario: The mark is the server's: it is there when the rows are let go and fetched again
    Given I open the "archive" page
    When I use the action "favorite" on the table row "123456"
    Then the table row "123456" is a favorite
    When I scroll the infinite table to row 150
    Then the list holds the rows 1 to 400
    When I scroll the infinite table to row 300
    Then the list holds the rows 1 to 600
    # With the fourth batch the first two hundred rows leave the store.
    When I scroll the infinite table to row 450
    Then the list holds the rows 201 to 800
    When I scroll the infinite table to its top
    Then the list holds the rows 1 to 200
    And the table row "123456" is a favorite
    And the table row "123457" is not a favorite
