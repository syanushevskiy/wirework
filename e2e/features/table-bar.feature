Feature: The title and the own filters of a table
  A table says what it lists in a title above it, and may have filters of
  its own beside the tools: always in view, and by a property no column
  needs to show. They are one choice with the column headers — the same
  request, the same "Reset Filters".

  Scenario: The history list has a title and two filters above it
    Given I open the "history" page
    Then the table is titled "Runs"
    And the table has the filters "Reference, Started" above it
    And the table toolbar offers "reset-filters, refresh"
    And the table has 10 rows

  Scenario: A text filter above the table filters the list
    Given I open the "history" page
    When I type "REF55" into the "Reference" filter above the table
    Then the table has 1 row
    And the "Reference" filter above the table holds "REF55"
    And the state JSON contains '"reference": "REF55"'
    And the filters of the table can be reset
    When I type "" into the "Reference" filter above the table
    Then the infinite table shows "10 of 23"
    And the filters of the table cannot be reset

  Scenario: A period above the table filters by a column the table does not show
    Given I open the "history" page
    Then the table has the columns "#, Name, Reference, Inbound, Status"
    # Each end is a date and a time.
    When I filter from "2026-11-01 00:00" to "2026-11-03 23:59" in the "Started" filter above the table
    Then the table has 3 rows
    And the state JSON contains '"2026-11-03T23:59:00'

  Scenario: The filters above the table and the headers are one choice
    Given I open the "history" page
    When I type "REF59" into the "Reference" filter above the table
    And I open the header filter of the "Status" column
    And I tick "Failed" in the header filter
    And I apply the header filter
    # The header's choice kept what the bar filters by.
    Then the "Reference" filter above the table holds "REF59"
    And the state JSON contains '"reference": "REF59"'
    When I reset the filters of the table
    Then the "Reference" filter above the table holds ""
    And the infinite table shows "10 of 23"

  Scenario: A table without a title and filters of its own shows neither
    Given I open the "runs" page
    Then the table has 5 rows
    And the table has the filters "" above it
