Feature: Refresher
  A refresher asks for fresh data by hand or every N seconds. It fetches
  nothing itself: its schedule (on/off + interval) lives in the store, and
  every click or tick EMITS `refresh`, which the view model wires to a host
  action. On the demo page that action requests the runs page on screen
  again from the fake server, where every request moves unfinished runs one
  step (queued → running → finished).

  Scenario: Auto-refresh starts off with a 5 second interval
    Given I open the "demo" page
    Then auto-refresh is off
    And the refresh interval is 5 seconds

  Scenario: Refresh requests the page on screen again
    Given I open the "demo" page
    And I expand the "events" panel
    Then the runs table row "123458" shows "Running" for "status.state"
    When I click Refresh
    Then the event log shows widget "antd-refresher" event "refresh" with payload '{"trigger":"manual"}'
    And the runs table row "123458" shows "Success" for "status.state"
    And the runs table is not loading

  Scenario: Refresh keeps the page the user is on
    Given I open the "demo" page
    When I go to page 2 of the pagination
    Then the runs table row "123461" shows "Running" for "status.state"
    And the runs table is not loading
    When I click Refresh
    Then the runs table row "123461" shows "Failed" for "status.state"
    And the pagination shows page 2

  Scenario: The schedule is state in the store, written by the reaction
    Given I open the "demo" page
    When I set the refresh interval to 30 seconds
    And I turn auto-refresh on
    Then auto-refresh is on
    And the refresh interval is 30 seconds
    And the state JSON contains '"interval": 30'

  Scenario: Auto-refresh requests the page on every tick
    Given I open the "demo" page
    And I expand the "events" panel
    When I set the refresh interval to 1 second
    And I turn auto-refresh on
    Then the event log shows widget "antd-refresher" event "refresh" with payload '{"trigger":"interval"}'
    And the runs table row "123458" shows "Success" for "status.state"
    When I turn auto-refresh off
    Then auto-refresh is off
