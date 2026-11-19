Feature: A date column is filtered by a period
  A column the server describes as a date offers, in its header, a start
  and an end — each a date and a time. The Infinite List page shows its runs'
  "Started" column: the period chosen there is sent to the server, which
  answers with the runs started in it. The archive's server does not count
  its rows: a list longer than one batch of two hundred reads "200+ rows",
  a shorter one its count.

  Scenario: A start and an end leave the runs started between them
    Given I open the "infinite-list" page
    Then the infinite table shows "200+ rows"
    And the "Started" column is filtered by a period
    # Every run starts at 09:00: the last day counts to its last minute.
    When I filter the "Started" column from "2026-10-01 00:00" to "2026-10-10 23:59"
    Then the infinite table shows "10 rows"
    And the table has 10 rows
    And the state JSON contains '"started": ['
    And the server has had time to answer
    And no widget has crashed

  Scenario: The time of an end counts
    Given I open the "infinite-list" page
    # Up to 08:59 on the tenth: that day's run, started at 09:00, is left out.
    When I filter the "Started" column from "2026-10-01 00:00" to "2026-10-10 08:59"
    Then the infinite table shows "9 rows"

  Scenario: Either end of the period may stay open
    Given I open the "infinite-list" page
    Then the infinite table shows "200+ rows"
    # The six seeded runs started on 1–6 November, every other one before.
    When I filter the "Started" column from "2026-11-04 00:00" to ""
    Then the infinite table shows "3 rows"
    And the first table row is "123459"
    When I clear the period of the "Started" column
    Then the infinite table shows "200+ rows"
    And the first table row is "123456"
    # Up to the end of 2 November: the first two seeded runs and every run before them — still more than a batch, so not counted.
    When I filter the "Started" column from "" to "2026-11-02 23:59"
    Then the infinite table shows "200+ rows"
    And the first table row is "123456"

  Scenario: Reset takes the period away
    Given I open the "infinite-list" page
    When I filter the "Started" column from "2026-10-01 00:00" to "2026-10-10 23:59"
    Then the infinite table shows "10 rows"
    When I clear the period of the "Started" column
    Then the infinite table shows "200+ rows"
