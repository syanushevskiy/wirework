Feature: Infinite list — one table that scrolls its rows, with its filters in the column headers
  The Infinite List page shows two thousand runs as ONE widget: the rows
  scroll inside the table — no pagination. It is a VIRTUAL list: of the rows
  it holds only those around the visible part of its box are rendered
  (twice the box's height), with blank space of the right height standing
  in for the rest, so a list of thousands stays smooth. Filtering and
  sorting live in the column headers: a column the server offers VALUES for
  shows a filter icon opening a list to pick from — every pick filters at
  once; a column the server calls filterable without values shows a SEARCH
  icon opening a box to type in; a sortable column sorts on a click of its
  header — ascending, descending, then not at all. Every choice is a request
  to the server (the view table API's filterIn, filterLike and orderBy),
  never a sort or a filter of the rows on screen. The page's list holds a
  SLICE of the rows (list-position.feature); a list that APPENDS what it
  fetches is the one a builder adds, at the end of this file.

  Scenario: The keyboard scrolls the list too — End reaches the last row known and asks for more, Home goes back
    Given I open the "infinite-list" page
    Then the list holds the rows 1 to 200
    # The BOX takes the focus — a focused row would leave the DOM with the window and drop it; End scrolls to the
    # bottom of the rows known, where the batch after them is asked for.
    When I press "End" in the infinite table
    Then the list holds the rows 1 to 400
    And the infinite table renders only a window of its rows
    When I press "Home" in the infinite table
    Then the first table row is "123456"

  Scenario: Nothing is shown until the server answers
    Given the server is slow to answer
    And I open the "infinite-list" page
    Then the table has 0 rows
    And the infinite table shows "0 rows"
    When the server has had time to answer
    Then the list holds the rows 1 to 200
    And the infinite table shows "200+ rows"

  Scenario: What a header can filter by comes from the server's description
    Given I open the "infinite-list" page
    Then the table has the columns "#, Name, Reference, Inbound, Status, Started, Runner, Branch, Duration"
    # Status and Inbound come with values: a filter icon. Name is filterable without values: a SEARCH icon.
    And the "Status" column header has a filter icon
    And the "Inbound" column header has a filter icon
    And the "Name" column header has a search icon
    # The server calls # not filterable and says nothing about Reference.
    And the "#" column header has no filter
    And the "Reference" column header has no filter

  Scenario: A values filter in a column header re-requests the rows that match
    Given I open the "infinite-list" page
    And I expand the "events" panel
    When I open the header filter of the "Status" column
    # The server's null ("no value") is not on offer.
    Then the header filter offers "Queued, Running, Success, Failed"
    When I tick "Failed" in the header filter
    And I apply the header filter
    Then the event log shows widget "antd-infinite-table" event "filter-changed" with payload '{"filterIn":{"state":["Failed"]},"filterLike":{},"filterBetween":{}}'
    # More than a batch of the two thousand runs failed: the first two hundred of them are held.
    And the list holds the rows 1 to 200
    And the first table row is "123456"
    And the table row "123456" shows a "danger" tag "Failed" for "state"
    And the table row "123460" shows a "danger" tag "Failed" for "state"
    And the state JSON contains '"filterIn": {'
    When I open the header filter of the "Status" column
    And I reset the header filter
    Then the table row "123457" shows a "success" tag "Success" for "state"
    And the state JSON contains '"filterIn": {}'

  Scenario: A text filter searches the column on the server
    Given I open the "infinite-list" page
    When I search the "Name" column for "suite"
    Then the table has 1 row
    And the table row "123460" shows "Smoke suite" for "name"
    And the infinite table shows "1 rows"
    And the state JSON contains '"filterLike": {'
    And the state JSON contains '"name": "suite"'
    When I clear the search of the "Name" column
    Then the infinite table shows "200+ rows"
    And the state JSON contains '"filterLike": {}'

  Scenario: The search of a column filters as the text is typed, and Done only closes it
    Given I open the "infinite-list" page
    When I type "suite" into the search of the "Name" column
    # Nothing was pressed: the pause after the last letter searched.
    Then the table has 1 row
    And the search of the column is open, with no "Search" button
    When I close the search of the column
    Then the infinite table shows "1 rows"
    And the state JSON contains '"name": "suite"'

  Scenario: A click on a sortable header orders the rows on the server
    Given I open the "infinite-list" page
    Then the first table row is "123456"
    When I click the "Name" column header
    Then the state JSON contains '"name": "ASC"'
    When I click the "Name" column header
    Then the state JSON contains '"name": "DESC"'
    And the first table row is "123460"
    And the table row "123460" shows "Smoke suite" for "name"
    When I click the "Name" column header
    Then the state JSON contains '"orderBy": {}'
    And the first table row is "123456"

  Scenario: A row's links still open the run
    Given I open the "infinite-list" page
    When I click the link "Smoke suite" in the table row "123460"
    Then the address is "/demo/runs/123460"
    And the "run" page is shown

  Scenario: An infinite table added in the builder loads and grows by itself, never all at once
    Given I open the "builder" page
    When I choose the "antd-infinite-table" widget
    And I set the setting "height" to "200"
    And I set the reaction for "load" to call "table-view/load"
    # The widget's ports are bound to builder.infiniteTable.* (its suggested paths): the loader fills that root.
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "builder.infiniteTable"
    And I set the action parameter "pageSize" for "load" to "10"
    And I set the reaction for "more" to call "table-view/load"
    And I set the action parameter "into" for "more" to "builder.infiniteTable"
    And I click the action parameter "more" for "more"
    And I add the widget
    Then the table has 10 rows
    And the infinite table shows "10 of 23"
    And the table has the columns "#, Name, Reference, Inbound, Status"
    # Its end in view asks for the rows after the ones held, and they are APPENDED.
    When I scroll the infinite table to its end
    Then the list holds 20 rows
    And the infinite table shows "20 of 23"
    When I scroll the infinite table to its end
    Then the list holds 23 rows
    And the infinite table shows "23 of 23"
    And the infinite table renders only a window of its rows
    # The first rows are the ones loaded first: back at the top the window shows them.
    When I scroll the infinite table to its top
    Then the first table row is "123456"
    And no widget has crashed
