Feature: Load events — a page and a table ask for their data
  Nothing in the host decides what a page loads. A PAGE emits `load` once
  when it has opened, and a TABLE emits `load` once when it appears; what
  happens then is a reaction like any other — typically the action that
  fetches the data. A page's own reactions live beside its templates
  (`viewModels.on.<page>.load`), a table's in its widget template
  (`on: { load: [...] }`). Both fire after the page has bound its reactions,
  and once — also under React's StrictMode, which mounts everything twice.

  Scenario: The overview loads its numbers through the page's own load reaction
    Given I open the "overview" page
    Then the state JSON contains '"call": "overview/load"'
    When the server has had time to answer
    Then the state JSON contains '"notice": "6 of 23 runs failed, 6 still running"'

  Scenario: A page's load event fires once per opening
    Given I open the address "/demo/runs/123456"
    And I expand the "events" panel
    Then the event log has 1 entry
    And the event log shows widget "page" event "load" with payload '{"page":"run"}'
    And the cell "label-run-name" reads "E2E Run # 98765"

  Scenario: The runs table asks for its data when it appears
    Given I open the "runs" page
    And I expand the "events" panel
    Then the event log shows widget "antd-table" event "load" from cell "table-main"
    # The page's load and the table's: two events, one request.
    And the event log has 2 entries
    And the table has 5 rows
    And the state JSON contains '"pageSize": 5'

  Scenario: A table added in the builder loads its data by itself
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "jobs.data"
    And I set the "input" port "columns" to "jobs.columns"
    And I set the reaction for "load" to call "table-view/load"
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "jobs"
    And I set the action parameter "pageSize" for "load" to "5"
    And I add the widget
    # No Refresh, no click: the table's load reaction did it.
    Then the table has 5 rows
    And the table has the columns "#, Name, Reference, Inbound, Status"

  Scenario: Saving the page loads it again, by what was just saved
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the reaction for "load" to call "table-view/load"
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "builder.table"
    And I set the action parameter "pageSize" for "load" to "5"
    And I add the widget
    Then the table has 5 rows
    And the table has the columns "#, Name, Reference, Inbound, Status"
    When I edit the page
    And I edit the cell "custom-1"
    And I set the action parameter "pageSize" for "load" to "10"
    And I set the action parameter "columns" for "load" to '{ "inbound": { "hidden": true } }'
    And I save the widget
    And I save the page
    # No click, no browser reload: the table asked again, with the changed reaction.
    Then the table has 10 rows
    And the table has the columns "#, Name, Reference, Status"

  Scenario: Cancelling a page edit loads nothing again
    Given I open the "builder" page
    And I expand the "events" panel
    When I choose the "antd-table" widget
    And I set the reaction for "load" to call "table-view/load"
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "builder.table"
    And I add the widget
    # The page opened (1); after Add it loaded again: the page (2) and the new table (3).
    Then the event log has 3 entries
    When I edit the page
    And I cancel the page edit
    Then the event log has 3 entries

  Scenario: Adding a widget loads the page again: the page's load event and every table's
    Given I open the "builder" page
    And I expand the "events" panel
    When I choose the "antd-table" widget
    And I set the reaction for "load" to call "table-view/load"
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "builder.table"
    And I add the widget
    Then the event log has 3 entries
    When I choose the "antd-label" widget
    And I set the setting "text" to "Runs"
    And I add the widget
    # Again the page and the table: 3 + 2.
    Then the event log has 5 entries
    And the event log shows widget "antd-table" event "load" from cell "custom-1"

  Scenario: A wrong page reaction is ignored loudly, and the page still renders
    Given I open the "overview" page
    Then the page shows no warnings
    When the store holds at "viewModels.on.overview":
      """
      { "load": [{ "call": "no-such-action" }] }
      """
    Then the page warns 'page reactions ignored: on load: calls unknown action "no-such-action"'
    And the label reads "WIREWORK PLAYGROUND!!!"
    And the boot validation status is "view models: 1 problem(s)"
    When I expand the "validation" panel
    Then the validation report mentions "on.overview"

  Scenario: A reaction to an event pages do not have never reaches the store
    Given I open the "overview" page
    When I try to put into the store at "viewModels.on.overview":
      """
      { "opened": [{ "call": "overview/load" }] }
      """
    Then the state error is shown
