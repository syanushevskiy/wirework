Feature: The run page — a fact sheet, a pipeline, a history, an outcome and a dialog
  One run shown with the dashboard set (doc/ADR/0015-more-widgets.md): the
  record as labelled FIELDS in the table's own cell kinds (a tag per state,
  the company's Copy button on the reference), where it stands in its
  PIPELINE, its HISTORY as the server tells it, a RESULT saying there is no
  such run with one way on, and Retry opening a DIALOG with a reason of
  several lines. Nothing here is wired by hand beyond the page's words.

  Scenario: A finished run as a fact sheet with its pipeline and history
    Given I open the address "/demo/runs/123459"
    And the server has had time to answer
    Then the cell "label-run-name" reads "Nightly regression"
    And the field "Status" of the descriptions reads "Success"
    And the field "Reference" of the descriptions reads "REF59456738Copy"
    And the field "Message" of the descriptions reads "Finished"
    And the field "Started" of the descriptions reads "2026-11-04 09:00"
    And the current step is "finished"
    # Queued, running, finished: three entries, the last one green.
    And the timeline has 3 entries
    And the cell "result-run" is hidden
    And the cell "button-retry" is hidden

  Scenario: A run nobody knows is a result with one way on
    Given I open the address "/demo/runs/nope"
    And the server has had time to answer
    Then the cell "result-run" is shown
    And the result says "There is no run nope"
    And the result says "Check the address, or go back to the list."
    When I click the button "Open the runs list"
    Then the address is "/demo/pagination"

  Scenario: A failed run is retried from a dialog, with a reason, and comes back queued
    Given I open the address "/demo/runs/123456"
    And the server has had time to answer
    Then the status badge reads "Status: Failed"
    And the current step is "finished"
    And the pipeline has failed
    And the field "Status" of the descriptions reads "Failed"
    And the cell "button-retry" is shown
    And the dialog "Retry run" is closed
    When I click the button "Retry"
    Then the dialog "Retry run" is open
    # Cancel closes it with nothing done; Retry opens it again.
    When I click the button "Cancel" in the dialog
    Then the dialog "Retry run" is closed
    And the status badge reads "Status: Failed"
    When I click the button "Retry"
    And I type "flaky network" into the field "Reason" in the dialog
    And I click the button "Run again" in the dialog
    And the server has had time to answer
    Then the dialog "Retry run" is closed
    And the status badge reads "Status: Queued"
    And the current step is "queued"
    And the state JSON contains '"reason": "flaky network"'
    # Queued again, with the retry and its reason in the history; nothing to retry any more.
    And the timeline has 2 entries
    And the cell "button-retry" is hidden

  Scenario: The dialog closes from its close icon
    Given I open the address "/demo/runs/123456"
    And the server has had time to answer
    When I click the button "Retry"
    Then the dialog "Retry run" is open
    When I close the dialog
    Then the dialog "Retry run" is closed
    And the state JSON contains '"open": false'
