Feature: A long list held as a slice, and a scale that says where it stands and jumps along it
  The Archive page lists two thousand runs. Nobody holds them all: the
  server is asked for two hundred at a time — the next two hundred AHEAD OF
  TIME, once three quarters of the rows held are scrolled past, so the rows
  are there before they are needed —, the list keeps at most six hundred,
  and of those only the rows around the view are on the page. The
  scrollbar still spans the whole list. Under the list a scale shows where
  it stands — the rows in view, of how many, as a percent — and follows the
  list as it scrolls; moving the scale jumps the list there, and the list
  asks the server for the slice at that place.

  Scenario: The list holds a slice of two hundred rows and renders a window of it
    Given I open the "archive" page
    Then the list holds the rows 1 to 200
    And the infinite table shows "2000 rows"
    And the infinite table renders only a window of its rows
    And the list stands at row 1 of 2000
    And the first table row is "123456"

  Scenario: The next two hundred rows are fetched ahead of time, and the farthest rows are let go
    Given I open the "archive" page
    Then the list holds the rows 1 to 200
    # Past three quarters of the rows held: the next batch is asked for while the rows in view are still there.
    When I scroll the infinite table to row 150
    Then the list holds the rows 1 to 400
    And the infinite table renders only a window of its rows
    When I scroll the infinite table to row 300
    Then the list holds the rows 1 to 600
    # Three batches are kept: with the fourth the first two hundred rows leave the store.
    When I scroll the infinite table to row 450
    Then the list holds the rows 201 to 800
    # And back: before the first quarter of the rows held, the batch before them is fetched, the last one let go.
    When I scroll the infinite table to row 340
    Then the list holds the rows 1 to 600
    And the list stands at row 340 of 2000

  Scenario: Scrolling moves the scale, and scrolling out of the slice replaces it
    Given I open the "archive" page
    Then the list holds the rows 1 to 200
    When I scroll the infinite table to its end
    # The last two hundred rows are held now — the first two hundred are gone from the store.
    Then the list holds the rows 1801 to 2000
    And the last table row is "125455"
    And the list stands at about 100 percent
    And the infinite table renders only a window of its rows
    When I scroll the infinite table to its top
    Then the list holds the rows 1 to 200
    And the list stands at row 1 of 2000

  Scenario: Moving the scale jumps the list, which asks for the slice there
    Given I open the "archive" page
    Then the list holds the rows 1 to 200
    When I move the list position to 40 percent
    Then the list stands at about 40 percent
    And the list holds a slice around row 800
    And the row the list stands at is shown, counting from "123456"
    And the infinite table renders only a window of its rows
    And no widget has crashed
