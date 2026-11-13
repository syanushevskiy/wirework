Feature: A date column is filtered by a period
  A column the server describes as a date offers, in its header, a start
  and an end date. The Archive page shows its runs' "Started" column: the
  period chosen there is sent to the server, which answers with the runs
  started in it.

  Scenario: A start and an end date leave the runs started between them
    Given I open the "archive" page
    Then the infinite table shows "2000 rows"
    And the "Started" column is filtered by a period
    When I filter the "Started" column from "2026-10-01" to "2026-10-10"
    Then the infinite table shows "10 rows"
    And the table has 10 rows
    And the state JSON contains '"started": ['
    And the server has had time to answer
    And no widget has crashed

  Scenario: Either end of the period may stay open
    Given I open the "archive" page
    Then the infinite table shows "2000 rows"
    # The six seeded runs started on 1–6 November, every other one before.
    When I filter the "Started" column from "2026-11-04" to ""
    Then the infinite table shows "3 rows"
    When I clear the period of the "Started" column
    Then the infinite table shows "2000 rows"
    When I filter the "Started" column from "" to "2026-11-02"
    Then the infinite table shows "1996 rows"

  Scenario: Reset takes the period away
    Given I open the "archive" page
    When I filter the "Started" column from "2026-10-01" to "2026-10-10"
    Then the infinite table shows "10 rows"
    When I clear the period of the "Started" column
    Then the infinite table shows "2000 rows"
