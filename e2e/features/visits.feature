Feature: Page visits
  Opening a page starts it from its own initial state: a fresh store with
  that page's configuration and nothing of any other page. The builder
  starts with no data at all — the store fills up only with what the added
  widgets write. The demo's table is empty until the (fake) server answers.
  So the state inspector shows every step: what a page starts with, and
  what each click or server answer adds.

  Scenario: The builder starts with no data, and every widget adds only its own
    Given I open the "builder" page
    Then the state JSON does not contain '"demo"'
    And the state JSON does not contain '"runs"'
    And the state JSON does not contain '"filters"'
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "form.count"
    And I set the reaction for "incremented" to set "form.count" from "value"
    And I add the widget
    Then the state JSON does not contain '"count":'
    When I click the counter 1 time
    Then the state JSON contains '"count": 1'

  Scenario: The demo table is empty until the server answers
    Given I open the "demo" page
    Then the table is loading
    And the table has 0 rows
    And the state JSON contains '"loading": true'
    And the state JSON does not contain '"data": ['
    When the server has had time to answer
    Then the table is not loading
    And the table has 5 rows
    And the state JSON contains '"data": ['
    And the state JSON contains '"total": 23'
    And the state JSON contains '"pageSize": 5'

  Scenario: Switching pages starts each page over
    Given I open the "demo" page
    When I click the counter 2 times
    Then the state JSON contains '"counter": 2'
    When I switch to the "builder" page
    Then the state JSON does not contain '"counter"'
    When I switch to the "demo" page
    Then the echo widget at "demo.counter" shows "0"
    And the table row "123458" shows "Running" for "status.state"

  Scenario: Opening the page you are on starts it over too
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "soon gone"
    And I add the widget
    Then the page has 1 cell
    When I switch to the "builder" page
    Then the page has 0 cells
    And the state JSON does not contain '"soon gone"'

  Scenario: A server answer for a page the user has left never reaches the next page
    Given I open the "demo" page
    When I switch to the "builder" page
    And the server has had time to answer
    Then the state JSON does not contain '"runs"'
    And the state JSON does not contain '"loading"'

  Scenario: A new visit starts with an empty event log
    Given I open the "demo" page
    And I expand the "events" panel
    When I click the counter 2 times
    Then the event log has 2 entries
    When I switch to the "demo" page
    Then the event log is empty
