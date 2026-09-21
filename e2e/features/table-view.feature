Feature: A table the server describes (view table API)
  The runs list is not written into the page: the page declares only the
  URL of the table's view API, and the FIRST answer describes the table —
  its columns, which of them the server hides, and the values some can be
  filtered by — together with the first rows and the count, in one
  response (`metadata: true`). The table's columns and the filter bar are
  built from that description. What the page wants different it says next
  to the URL: a column not shown, a filter not offered, a filter with values
  of the page's own. Filters, pages and refreshes re-request rows only.

  Scenario: The columns come from the server, as the page changes them
    Given I open the "runs" page
    Then the table has the columns "#, Name, Reference, Status"
    # "Message" is hidden by the SERVER, "Inbound" by the page.
    And the state JSON contains '"url": "/api/v1/view/runs"'
    And the state JSON contains '"title": "Reference"'
    And the state JSON does not contain '"title": "Inbound"'
    And the state JSON does not contain '"title": "Message"'

  Scenario: The filters come from the server's filter values, as the page changes them
    Given I open the "runs" page
    # The server offers Inbound and Status; the page drops Inbound and adds Suite.
    Then the filter bar offers the filters "Suite, Status"
    # The server's null ("no value") is not an option.
    And the "Status" filter offers "Queued, Running, Success, Failed"
    And the "Suite" filter offers "Nightly regression, Smoke suite, Migration check"

  Scenario: No filters and no rows until the server answers
    Given I open the "runs" page
    Then the filter bar offers the filters ""
    And the table has 0 rows
    When the server has had time to answer
    Then the filter bar offers the filters "Suite, Status"
    And the table has 5 rows

  Scenario: A filter re-requests the rows and the count, from the first page
    Given I open the "runs" page
    And I expand the "events" panel
    When I go to page 2 of the pagination
    Then the pagination shows page 2
    When I pick "Failed" in the "Status" filter
    Then the event log shows widget "antd-filter-bar" event "changed" with payload '{"value":{"state":["Failed"]}}'
    And the "Status" filter holds "Failed"
    And the pagination shows page 1
    And the table row "123456" shows "Failed" for "state"
    And the table row "123460" shows "Failed" for "state"
    And the state JSON contains '"filterIn": {'
    # 6 runs fail from the start; by this third request the 5 queued ones have run and failed too.
    And the pagination counts 11 rows

  Scenario: A filter of the page's own values works like the server's
    Given I open the "runs" page
    When I pick "Nightly regression" in the "Suite" filter
    Then the table has 1 row
    And the table row "123459" shows "Nightly regression" for "name"
    And the pagination counts 1 rows

  Scenario: Clearing a filter brings all rows back
    Given I open the "runs" page
    When I pick "Smoke suite" in the "Suite" filter
    Then the table has 1 row
    When I pick "Smoke suite" in the "Suite" filter
    Then the table has 5 rows
    And the pagination counts 23 rows
    And the state JSON contains '"filterIn": {}'

  Scenario: In the builder an action asks for its parameters
    Given I open the "builder" page
    When I choose the "antd-refresher" widget
    And I set the reaction for "refresh" to call "reset-counter"
    Then the reaction for "refresh" asks for no action parameters
    When I set the reaction for "refresh" to call "table-view/load"
    Then the action parameters for "refresh" include "url, into, metadata, pageSize, columns, filters, request"

  Scenario: The metadata flag is a checkbox of the load action: not set, yes or no
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the reaction for "load" to call "table-view/load"
    # Not set: the action decides (it asks when the call has a url, or no columns are known yet).
    Then the action parameter "metadata" for "load" is "unset"
    When I click the action parameter "metadata" for "load"
    Then the action parameter "metadata" for "load" is "yes"
    When I click the action parameter "metadata" for "load"
    Then the action parameter "metadata" for "load" is "no"
    When I click the action parameter "metadata" for "load"
    Then the action parameter "metadata" for "load" is "unset"

  Scenario: With the metadata flag on, the server describes the table
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the reaction for "load" to call "table-view/load"
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "builder.table"
    And I set the action parameter "pageSize" for "load" to "5"
    And I click the action parameter "metadata" for "load"
    And I add the widget
    Then the table has 5 rows
    # The server's headers, without the column the server hides.
    And the table has the columns "#, Name, Reference, Inbound, Status"
    And the state JSON contains '"metadata": true'

  Scenario: With the metadata flag off, only rows are asked for
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the reaction for "load" to call "table-view/load"
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "builder.table"
    And I set the action parameter "pageSize" for "load" to "5"
    And I click the action parameter "metadata" for "load"
    And I click the action parameter "metadata" for "load"
    And I add the widget
    Then the table has 5 rows
    # Nothing describes the table: one column per field of the first row, the server's hidden one too.
    And the table has the columns "id, name, reference, inbound, state, message"
    And the state JSON contains '"metadata": false'
    And the state JSON does not contain '"title": "Reference"'

  Scenario: A widget cannot be added until the action's required parameters are given
    Given I open the "builder" page
    When I choose the "antd-refresher" widget
    And I set the "input" port "schedule" to "jobs.autoRefresh"
    And I set the reaction for "changed" to set "jobs.autoRefresh" from ""
    And I set the reaction for "refresh" to call "table-view/load"
    Then the add widget button is disabled
    When I set the action parameter "into" for "refresh" to "jobs"
    Then the add widget button is enabled
    When I set the action parameter "columns" for "refresh" to "{ not json"
    Then the add widget button is disabled
    When I set the action parameter "columns" for "refresh" to '{ "inbound": { "hidden": true } }'
    Then the add widget button is enabled

  Scenario: A refresher added in the builder loads a table the server describes
    Given I open the "builder" page
    When I choose the "antd-refresher" widget
    And I set the "input" port "schedule" to "jobs.autoRefresh"
    And I set the "input" port "busy" to "jobs.loading"
    And I set the reaction for "changed" to set "jobs.autoRefresh" from ""
    And I set the reaction for "refresh" to call "table-view/load"
    And I set the action parameter "url" for "refresh" to "/api/v1/view/runs"
    And I set the action parameter "into" for "refresh" to "jobs"
    And I set the action parameter "pageSize" for "refresh" to "5"
    And I set the action parameter "columns" for "refresh" to '{ "inbound": { "hidden": true } }'
    And I add the widget
    And I choose the "antd-table" widget
    And I set the "input" port "rows" to "jobs.data"
    And I set the "input" port "columns" to "jobs.columns"
    And I add the widget
    Then the table has 0 rows
    When I click Refresh
    Then the table has 5 rows
    And the table has the columns "#, Name, Reference, Status"
    And the state JSON contains '"url": "/api/v1/view/runs"'
    And no widget has crashed

  Scenario: The action's parameters come back when the widget is edited
    Given I open the "builder" page
    When I choose the "antd-refresher" widget
    And I set the "input" port "schedule" to "jobs.autoRefresh"
    And I set the reaction for "changed" to set "jobs.autoRefresh" from ""
    And I set the reaction for "refresh" to call "table-view/load"
    And I set the action parameter "url" for "refresh" to "/api/v1/view/runs"
    And I set the action parameter "into" for "refresh" to "jobs"
    And I set the action parameter "pageSize" for "refresh" to "5"
    And I add the widget
    And I edit the page
    And I edit the cell "custom-1"
    Then the action parameter "url" for "refresh" holds "/api/v1/view/runs"
    And the action parameter "pageSize" for "refresh" holds "5"
    When I set the action parameter "pageSize" for "refresh" to "10"
    And I save the widget
    And I save the page
    Then the state JSON contains '"pageSize": 10'
