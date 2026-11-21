Feature: A windowed list asks for its next rows at the page's own mark
  The infinite table's `fetchAhead` setting says how many rows before the
  end of the rows held the next batch is asked for. A WINDOWED list scrolled
  by the wheel must keep getting its batches at that mark, batch after
  batch, however far it goes — the rows in view are always rows it holds.
  (doc/ADR/0007-row-window-and-header-filters.md)

  @timeout:120000
  Scenario Outline: A wheel faster than the server scrolls a windowed list on through its batches — fetchAhead <ahead>, a window of <height> pixels
    Given the browser window is <height> pixels tall
    And I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    When I edit the state JSON setting "viewModels.widgets.infinite-list.table.default.fetchAhead" to <ahead>
    And I turn the mouse wheel 300 times over the infinite table
    And the server has had time to answer
    # Four batches of two hundred rows were passed: the list went on asking, and holds the rows it shows.
    Then the infinite table has scrolled past row 800
    And the list holds the rows in view
    And the list holds at most 600 rows

    Examples:
      | ahead | height |
      | 100   | 720    |
      | 150   | 1200   |

  @timeout:120000
  Scenario Outline: At a hand's pace the list goes on too — fetchAhead <ahead>
    # 190 and 300 are marks a batch of two hundred is too small for: nothing is asked ahead of time while one
    # batch is held, and the list asks at its last row known instead.
    Given I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    When I edit the state JSON setting "viewModels.widgets.infinite-list.table.default.fetchAhead" to <ahead>
    And I turn the mouse wheel 250 times over the infinite table, a notch every 40 ms
    And the server has had time to answer
    Then the infinite table has scrolled past row 700
    And the list holds the rows in view
    And the list holds at most 600 rows

    Examples:
      | ahead |
      | 100   |
      | 190   |
      | 300   |
