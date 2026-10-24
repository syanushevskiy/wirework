Feature: Infinite list — a table that grows as you scroll, with its filters in the column headers
  The History page shows the same runs as the runs page, but as ONE widget:
  the rows scroll inside the table, and when its end comes into view the
  table asks the server for the rows after the ones it holds and appends
  them — no pagination. Filtering and sorting live in the column headers:
  a column the server offers VALUES for shows a filter icon opening a list
  to tick; a column the server calls filterable without values shows a
  SEARCH icon opening a box to type in; a sortable column sorts on a click
  of its header — ascending, descending, then not at all. Every choice is a
  request to the server (the view table API's filterIn, filterLike and
  orderBy), never a sort or a filter of the rows on screen. The fake server
  moves unfinished runs one step after every answer of the list, as on the
  runs page.

  Scenario: The list grows as I scroll, never all at once
    Given I open the "history" page
    Then the table has 10 rows
    And the infinite table shows "10 of 23"
    And the state JSON contains '"total": 23'
    When I scroll the infinite table to its end
    Then the table has 20 rows
    And the infinite table shows "20 of 23"
    When I scroll the infinite table to its end
    Then the table has 23 rows
    And the infinite table shows "23 of 23"
    # The first rows are the ones loaded first: appended, not replaced.
    And the first table row is "123456"

  Scenario: Nothing is shown until the server answers, and the end asks for nothing yet
    Given the server is slow to answer
    And I open the "history" page
    Then the table has 0 rows
    And the infinite table shows "0 rows"
    When the server has had time to answer
    Then the table has 10 rows
    And the infinite table shows "10 of 23"

  Scenario: What a header can filter by comes from the server's description
    Given I open the "history" page
    Then the table has the columns "#, Name, Reference, Inbound, Status"
    # Status and Inbound come with values: a filter icon. Name is filterable without values: a SEARCH icon.
    And the "Status" column header has a filter icon
    And the "Inbound" column header has a filter icon
    And the "Name" column header has a search icon
    # The server calls # not filterable and says nothing about Reference.
    And the "#" column header has no filter
    And the "Reference" column header has no filter

  Scenario: A values filter in a column header re-requests the rows that match
    Given I open the "history" page
    And I expand the "events" panel
    When I open the header filter of the "Status" column
    # The server's null ("no value") is not on offer.
    Then the header filter offers "Queued, Running, Success, Failed"
    When I tick "Failed" in the header filter
    And I apply the header filter
    Then the event log shows widget "antd-infinite-table" event "filter-changed" with payload '{"filterIn":{"state":["Failed"]},"filterLike":{}}'
    # 6 runs fail from the start; the ones running when the page opened have all succeeded by this second request.
    And the table has 6 rows
    And the infinite table shows "6 of 6"
    And the table row "123456" shows a "danger" tag "Failed" for "state"
    And the table row "123460" shows a "danger" tag "Failed" for "state"
    And the state JSON contains '"filterIn": {'
    When I open the header filter of the "Status" column
    And I reset the header filter
    Then the infinite table shows "10 of 23"
    And the state JSON contains '"filterIn": {}'

  Scenario: A text filter searches the column on the server
    Given I open the "history" page
    When I search the "Name" column for "suite"
    Then the table has 1 row
    And the table row "123460" shows "Smoke suite" for "name"
    And the infinite table shows "1 of 1"
    And the state JSON contains '"filterLike": {'
    And the state JSON contains '"name": "suite"'
    When I clear the search of the "Name" column
    Then the table has 10 rows
    And the state JSON contains '"filterLike": {}'

  Scenario: A click on a sortable header orders the rows on the server
    Given I open the "history" page
    Then the first table row is "123456"
    When I click the "Name" column header
    Then the state JSON contains '"name": "ASC"'
    And the first table row is "123456"
    When I click the "Name" column header
    Then the state JSON contains '"name": "DESC"'
    And the first table row is "123460"
    And the table row "123460" shows "Smoke suite" for "name"
    When I click the "Name" column header
    Then the state JSON contains '"orderBy": {}'
    And the first table row is "123456"

  Scenario: A row's links still open the run
    Given I open the "history" page
    When I click the link "Smoke suite" in the table row "123460"
    Then the address is "/demo/runs/123460"
    And the "run" page is shown

  Scenario: An infinite table added in the builder loads and grows by itself
    Given I open the "builder" page
    When I choose the "antd-infinite-table" widget
    And I set the setting "height" to "200"
    And I set the reaction for "load" to call "table-view/load"
    # The widget's ports are bound to builder.infiniteTable.* (its suggested paths): the loader fills that root.
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "builder.infiniteTable"
    And I set the action parameter "pageSize" for "load" to "5"
    And I set the reaction for "more" to call "table-view/load"
    And I set the action parameter "into" for "more" to "builder.infiniteTable"
    And I click the action parameter "more" for "more"
    And I add the widget
    Then the table has 5 rows
    And the infinite table shows "5 of 23"
    And the table has the columns "#, Name, Reference, Inbound, Status"
    When I scroll the infinite table to its end
    Then the table has 10 rows
    And the infinite table shows "10 of 23"
    And no widget has crashed
