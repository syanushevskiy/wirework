Feature: The toolbar of a table
  A table lists the tools it wants above it, beside the column menu's
  button: "Reset filters" takes every filter away at once — whichever way
  it was chosen, a header or the filter bar —, and "Reload" asks the
  server for the rows again. The tools are registered by name, so a host
  puts its own beside them or in their place.

  Scenario: Reset filters takes away what the headers filter by
    Given I open the "infinite-list" page
    Then the table toolbar offers "reset-filters, refresh"
    And the filters of the table cannot be reset
    When I open the header filter of the "Status" column
    And I tick "Failed" in the header filter
    And I apply the header filter
    And I search the "Name" column for "suite"
    Then the table has 1 row
    And the filters of the table can be reset
    When I reset the filters of the table
    Then the infinite table shows "200+ rows"
    And the state JSON contains '"filterIn": {}'
    And the state JSON contains '"filterLike": {}'

  Scenario: Reset filters clears what the filter bar chose too — one choice, two views
    Given I open the "pagination" page
    Then the table toolbar offers "reset-filters"
    When I pick "Smoke suite" in the "Suite" filter
    Then the table has 1 row
    And the filters of the table can be reset
    When I reset the filters of the table
    Then the table has 5 rows
    And the "Suite" filter holds ""
    And the state JSON contains '"filterIn": {}'

  Scenario: Reload on a list held as a slice starts it again from its first rows
    Given I open the "infinite-list" page
    And I expand the "events" panel
    Then the list holds the rows 1 to 200
    When I scroll the infinite table to row 150
    Then the list holds the rows 1 to 400
    When I reload the table
    Then the event log shows widget "antd-infinite-table" event "refresh" with payload '{}'
    And the list holds the rows 1 to 200
    And the first table row is "123456"
    # The rows known so far stay known: the same list, asked again.
    And the list stands at row 1 of at least 400
