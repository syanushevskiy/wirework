Feature: The infinite table over a list of ten thousand rows
  The Infinite List page's list is scrolled with a real mouse wheel while
  the fake servers hold ten thousand runs, and the page's own frames are
  measured. A WINDOWED list must keep its store and its DOM small however
  far it goes. The frame budgets are bounds for a development server beside
  other workers — an order of magnitude, not a benchmark; the measured
  numbers are attached to each scenario and printed.
  (doc/ADR/0007-row-window-and-header-filters.md)

  @timeout:120000
  Scenario: A windowed list scrolls through ten thousand rows holding six hundred of them
    Given the fake servers hold 10000 runs
    And I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    When I start measuring the page's frames
    And I turn the mouse wheel 400 times over the infinite table
    And I stop measuring the page's frames, calling it "windowed-wheel"
    # Batches joined on the way and the farthest were let go: the store never held more than three.
    Then the infinite table has scrolled past row 600
    And the list holds at most 600 rows
    And the infinite table renders at most 60 rows
    And 95 percent of the frames took no longer than 100 ms
    And no frame took longer than 500 ms

  @timeout:180000
  Scenario: A windowed list jumps along ten thousand rows once its end is found
    Given the fake servers hold 10000 runs
    And I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    When I scroll the infinite table until the list's end is found
    Then the infinite table shows "10000 rows"
    And the list holds at most 600 rows
    When I start measuring the page's frames
    And I move the list position to 10 percent
    Then the list holds a slice around row 1000
    When I move the list position to 90 percent
    Then the list holds a slice around row 9000
    When I stop measuring the page's frames, calling it "windowed-jumps"
    Then the list holds at most 600 rows
    And the infinite table renders at most 60 rows
    And no frame took longer than 500 ms
