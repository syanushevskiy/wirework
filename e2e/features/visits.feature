Feature: Page visits
  Opening a page starts a VISIT: the page's own data starts over — a fresh
  store with the little the page begins with, what the router matched, and
  no server data. The builder is a page of its own with no data at all: its
  store fills up only with what the added widgets write. The runs table is
  empty until the (fake) server answers. So the state inspector shows every
  step: what a page starts with, and what each click or server answer adds.
  (What OUTLIVES a visit — the demo application's global state — is in
  app.feature.)

  Scenario: The builder starts with no data, and every widget adds only its own
    Given I open the "builder" page
    Then the state JSON does not contain '"demo"'
    And the state JSON does not contain '"runs"'
    And the state JSON does not contain '"filters"'
    And the state JSON does not contain '"app"'
    And the state JSON does not contain '"route"'
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "form.count"
    And I set the reaction for "incremented" to set "form.count" from "value"
    And I add the widget
    Then the state JSON does not contain '"count":'
    When I click the counter 1 time
    Then the state JSON contains '"count": 1'

  Scenario: The runs table is empty until the server answers
    Given I open the "runs" page
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

  Scenario: Switching pages starts each page's own data over
    Given I open the "overview" page
    When I click the counter 2 times
    Then the state JSON contains '"counter": 2'
    When I switch to the "runs" page
    Then the state JSON does not contain '"counter": 2'
    And the table row "123458" shows "Running" for "state"
    When I switch to the "overview" page
    Then the echo widget at "demo.counter" shows "0"

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
    Given I open the "runs" page
    When I switch to the "settings" page
    And the server has had time to answer
    Then the state JSON does not contain '"data": ['
    And the state JSON does not contain '"total": 23'

  Scenario: A new visit starts its own event log
    Given I open the "overview" page
    And I expand the "events" panel
    When I click the counter 2 times
    # The page's own load event, then the two clicks.
    Then the event log has 3 entries
    When I switch to the "overview" page
    # Nothing of the visit before: only this visit's page load.
    Then the event log has 1 entry
    And the event log shows widget "page" event "load" with payload '{"page":"overview"}'
