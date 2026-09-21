Feature: Demo application — routes and global state
  The demo is a small application behind a router: an overview, the runs
  list, one run's page and the user's settings. Two kinds of state sit in
  ONE tree. A page's own data starts over with every visit. The
  application's GLOBAL state — who the user is, what they may do, their
  settings, lists every page needs, and the configuration with the user's
  overlay — stays for as long as the user is in the application, and
  arrives, like everything else, through a visible (mock) request. What a
  page needs from the address comes through the router: the host puts the
  matched parameters at `route`.

  Scenario: The global state arrives with the application's session request
    Given I open the "overview" page
    Then the cell "label-user" reads "Signing in…"
    When the server has had time to answer
    Then the cell "label-user" reads "Alex Tester"
    And the tag reads "QA engineer"
    And the state JSON contains '"editPages": true'

  Scenario: The overview requests its own numbers when it opens
    Given I open the "overview" page
    Then the alert reads "Loading the latest results…" as a "warning"
    When the server has had time to answer
    Then the alert reads "6 of 23 runs failed, 6 still running" as a "warning"
    And the progress shows 50 percent

  Scenario: A setting made on one page is seen on another
    Given I open the "settings" page
    When I type "Sergey" into the input
    And I switch to the "overview" page
    Then the cell "label-welcome" reads "Sergey"
    And the echo widget at "demo.counter" shows "0"

  Scenario: The runs list follows the user's page size setting
    Given I open the "settings" page
    When I choose "10" in the select
    And I switch to the "runs" page
    Then the table has 10 rows
    And the state JSON contains '"pageSize": 10'

  Scenario: The runs list starts refreshing by itself when the user's setting says so
    Given I open the "settings" page
    When I tick the checkbox
    And I switch to the "runs" page
    Then auto-refresh is on

  Scenario: A global list feeds a widget on a page
    Given I open the "runs" page
    When I pick "Billing" in the "Applications" multi-select
    Then the "Test suites" multi-select offers "Billing smoke, Billing regression"

  Scenario: The selected run opens on its own address, and the page reads the id from the route
    Given I open the "runs" page
    When I click the table row "123456"
    And I click the button "Open run"
    Then the address is "/demo/runs/123456"
    And the "run" page is shown
    And the state JSON contains '"runId": "123456"'
    And the cell "label-run-name" reads "E2E Run # 98765"
    And the status badge reads "Status: Failed"
    When I click the button "Back to runs"
    Then the address is "/demo/runs"
    And the state JSON does not contain '"runId"'

  Scenario: Nothing opens while no run is selected
    Given I open the "runs" page
    When I click the button "Open run"
    Then the address is "/demo/runs"

  Scenario: A run's address can be opened directly
    Given I open the address "/demo/runs/123459"
    Then the "run" page is shown
    And the cell "label-run-name" reads "Nightly regression"

  Scenario: An unknown run says so
    Given I open the address "/demo/runs/nope"
    Then the cell "label-run-error" reads "There is no run nope"

  Scenario: An unknown address opens the overview
    Given I open the address "/no/such/page"
    Then the "overview" page is shown
    And the address is "/demo"

  Scenario: The browser's Back button opens the previous page as a new visit
    Given I open the "overview" page
    When I click the counter 2 times
    And I switch to the "runs" page
    And I go back in the browser
    Then the "overview" page is shown
    And the echo widget at "demo.counter" shows "0"

  Scenario: The user's own view of a page survives a visit to another page
    Given I open the "overview" page
    When I edit the page
    And I remove the cell "echo-demo"
    And I save the page
    Then the page has 10 cells
    When I switch to the "runs" page
    And I switch to the "overview" page
    Then the page has 10 cells

  Scenario: Coming back from the builder starts the application over
    Given I open the "settings" page
    When I type "Sergey" into the input
    Then the state JSON contains '"displayName": "Sergey"'
    When I switch to the "builder" page
    And I switch to the "settings" page
    Then the state JSON does not contain '"displayName": "Sergey"'

  Scenario: A permission in global state decides whether pages can be edited
    Given I open the "overview" page
    When the server has had time to answer
    Then the page can be edited
    When the store holds at "app.permissions":
      """
      { "editPages": false }
      """
    Then the page cannot be edited
