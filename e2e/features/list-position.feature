Feature: A long list held as a slice, and a scale that says where it stands and jumps along it
  The Archive page lists two thousand runs. Nobody holds them all: the
  server is asked for two hundred at a time, the list keeps only that slice,
  and of the slice only the rows around the view are on the page. The
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
