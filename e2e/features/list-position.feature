Feature: A long list held as a slice, and a scale that says where it stands and jumps along it
  The Infinite List page lists two thousand runs — and its server does not COUNT
  them: how many there are is not known until the list's end is reached.
  Nobody holds them all either: the server is asked for two hundred at a
  time — the next two hundred AHEAD OF TIME, once three quarters of the rows
  held are scrolled past, so the rows are there before they are needed —,
  the list keeps at most six hundred, and of those only the rows around the
  view are on the page. The scrollbar spans the rows known so far, and the
  line under them says "200+ rows"; the batch that comes back empty is the
  end, and from then on the list has "2000 rows". Under the list a scale
  shows where it stands — the rows in view, of how many, as a percent once
  the total is known — and follows the list as it scrolls; moving the scale
  jumps the list there, and the list asks the server for the slice at that
  place.

  Scenario: The list holds a slice of two hundred rows and does not know how many there are
    Given I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    And the infinite table shows "200+ rows"
    And the infinite table renders only a window of its rows
    And the list stands at row 1 of at least 200
    And the list's end is not known
    And the first table row is "123456"

  Scenario: The next two hundred rows are fetched ahead of time, and the farthest rows are let go
    Given I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    # Past three quarters of the rows held: the next batch is asked for while the rows in view are still there.
    When I scroll the infinite table to row 150
    Then the list holds the rows 1 to 400
    And the infinite table shows "400+ rows"
    And the infinite table renders only a window of its rows
    When I scroll the infinite table to row 300
    Then the list holds the rows 1 to 600
    # Three batches are kept: with the fourth the first two hundred rows leave the store.
    When I scroll the infinite table to row 450
    Then the list holds the rows 201 to 800
    # And back: before the first quarter of the rows held, the batch before them is fetched, the last one let go —
    # the list still knows of the eight hundred rows it has seen.
    When I scroll the infinite table to row 340
    Then the list holds the rows 1 to 600
    And the list stands at row 340 of at least 800
    And the infinite table shows "800+ rows"

  Scenario: The end of the list is where the total becomes known
    Given I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    When I scroll the infinite table until the list's end is found
    # The batch after row 2000 came back empty: the last six hundred rows are held, and the list is counted.
    Then the list's end is known
    And the infinite table shows "2000 rows"
    And the list holds the rows 1401 to 2000
    When I scroll the infinite table to its end
    Then the last table row is "125455"
    And the list stands at about 100 percent
    And the infinite table renders only a window of its rows
    # Scrolling out of the slice replaces it — and what was learned stays.
    When I scroll the infinite table to its top
    Then the list holds the rows 1 to 200
    And the list stands at row 1 of 2000

  Scenario: Moving the scale jumps the list, which asks for the slice there
    Given I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    When I scroll the infinite table until the list's end is found
    And I move the list position to 40 percent
    Then the list stands at about 40 percent
    And the list holds a slice around row 800
    And the row the list stands at is shown, counting from "123456"
    And the infinite table renders only a window of its rows
    And no widget has crashed

  Scenario: A filter that leaves a few rows is counted at once, and the unfiltered list is open again
    Given I open the "infinite-list" page
    Then the infinite table shows "200+ rows"
    When I filter the "Started" column from "2026-10-01 00:00" to "2026-10-10 23:59"
    # Fewer rows than a batch came back: that is all of them.
    Then the infinite table shows "10 rows"
    And the list stands at row 1 of 10
    And the list's end is known
    When I clear the period of the "Started" column
    Then the infinite table shows "200+ rows"
    And the list stands at row 1 of at least 200
    And the list's end is not known

  Scenario: Moving the scale to its end scrolls ahead: the rows known grow under it
    Given I open the "infinite-list" page
    Then the list stands at row 1 of at least 200
    # The end of the scale is the last row known — from there the next batch is fetched, and the scale is longer.
    When I move the list position to 99 percent
    Then the list holds the rows 1 to 400
    And the infinite table shows "400+ rows"
    And the list's end is not known
