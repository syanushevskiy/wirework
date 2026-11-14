Feature: What I saved under an older version still opens, and what a newer version saved is kept
  The application was updated since I saved my views. I do nothing: a view
  saved under an older data format is brought forward when it is loaded,
  and shows as I left it. And when my views were saved by a NEWER version
  than the one I am looking at — after a rollback, say — they are not
  guessed at and never written over: the page shows the team's layout,
  says why, and my own views cannot be changed here.

  Scenario: A view I saved under data format 1 opens as I left it
    # Back then the status badge's widget was called "run-badge"; today nothing but the upgrade knows that name.
    Given my saved views are from data format 1
    When I open the address "/demo/runs/123456"
    And the server has had time to answer
    Then the page uses the "badge-first" view, which is "mine"
    And the page has 2 cells
    And the status badge reads "Status: Failed"
    And no widget has crashed
    And the page shows no warnings
    # What the application holds now is today's format: the next save stores it that way.
    And the state JSON contains '"badge-first"'
    And the state JSON does not contain "run-badge"

  Scenario: A choice saved under data format 1 is still my choice
    Given my saved views are from data format 1
    When I open the "overview" page
    Then the page uses the "compact" view, which is "prebuilt"

  Scenario: Views saved by a newer version are kept, not applied and not overwritten
    Given my saved views were saved by a newer version of the application
    When I open the "overview" page
    Then the page uses the "default" view, which is "prebuilt"
    And the page says my own views were not applied: "saved by a newer version of the application"
    And the page cannot be edited because "Saved by a newer version of the application"
    # Choosing a view would write my views: it is refused, and what is stored stays as it was.
    When I try to choose the view "compact"
    Then the page uses the "default" view, which is "prebuilt"
    And the state JSON contains '"view": "from-the-future"'
    # The shared page is another document: without my overlay it is edited as ever.
    When I disable the user overlay
    Then the page can be edited
