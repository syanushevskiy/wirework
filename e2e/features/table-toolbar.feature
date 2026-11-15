Feature: The toolbar of a table
  A table lists the tools it wants above it, beside the column menu's
  button: "Reset filters" takes every filter away at once — whichever way
  it was chosen, a header or the filter bar —, and "Reload" asks the
  server for the rows again. The tools are registered by name, so a host
  puts its own beside them or in their place.

  Scenario: Reset filters takes away what the headers filter by
    Given I open the "history" page
    Then the table toolbar offers "reset-filters, refresh"
    And the filters of the table cannot be reset
    When I open the header filter of the "Status" column
    And I tick "Failed" in the header filter
    And I apply the header filter
    And I search the "Name" column for "suite"
    Then the table has 1 row
    And the filters of the table can be reset
    When I reset the filters of the table
    Then the infinite table shows "10 of 23"
    And the state JSON contains '"filterIn": {}'
    And the state JSON contains '"filterLike": {}'

  Scenario: Reload asks the server for the rows again, from the top
    Given I open the "history" page
    And I expand the "events" panel
    Then the table has 10 rows
    When I scroll the infinite table to its end
    Then the list holds 20 rows
    When I reload the table
    Then the event log shows widget "antd-infinite-table" event "refresh" with payload '{}'
    And the list holds 10 rows
    And the infinite table shows "10 of 23"

  Scenario: Reset filters clears what the filter bar chose too — one choice, two views
    Given I open the "runs" page
    Then the table toolbar offers "reset-filters"
    When I pick "Smoke suite" in the "Suite" filter
    Then the table has 1 row
    And the filters of the table can be reset
    When I reset the filters of the table
    Then the table has 5 rows
    And the "Suite" filter holds ""
    And the state JSON contains '"filterIn": {}'

  Scenario: A table that lists no tools has none beside its column menu
    Given I open the "archive" page
    Then the list holds the rows 1 to 200
    And the table toolbar offers ""
