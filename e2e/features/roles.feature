Feature: Roles — one page, different for an admin and for everybody else
  A user holds ROLES, listed by the session from the broadest to the most
  specific (a QA; a QA who is also an admin; a Wirework admin who is both). The
  configuration says per role what differs about a page — which view of it
  the role sees, which template a widget uses for it, a setting — and the
  page is read through the base, then the roles in that order, then the
  user's own overlay: the later wins, per thing. A role's layout is a page
  view; a role's wiring is a widget template; one more widget for a
  stronger role is a condition on the user's roles. What the server answers
  stays the server's decision from the session. (doc/roles-design.md)

  Scenario: As QA the runs table is the page's; signed in as admin it loads every owner's runs, with an Owner column and filter — and back as QA it is the page's again
    Given I open the "runs" page
    And the server has had time to answer
    Then the table has the columns "#, Name, Reference, Status"
    And the server was asked for "/api/v1/view/runs"
    And the server was not asked for "/api/v1/view/runs/all"
    When I sign in as "admin"
    And the server has had time to answer
    Then the server was asked for "/api/v1/view/runs/all"
    And the table has the columns "Owner, #, Name, Reference, Status"
    And the filter bar offers the filters "Owner, Suite, Status"
    # The Delete button is the Wirework admin's: in the shared layout, hidden by its condition even with a run selected.
    When I click the table row "123456"
    Then the cell "button-open-run" is shown
    And the cell "button-delete-run" is hidden
    # The choice goes into the request as filterIn.owner: twelve of the twenty-three runs are Alice's.
    When I pick "alice" in the "Owner" filter
    And the server has had time to answer
    Then the state JSON contains '"total": 12'
    And the table has 5 rows
    And the first table row is "123456"
    # Signed in as QA again the page starts over: the owner filter is gone with it.
    When I sign in as "qa"
    And the server has had time to answer
    Then the table has the columns "#, Name, Reference, Status"
    And the table has 5 rows
    And the state JSON contains '"total": 23'

  Scenario: The session decides the data — a QA's request for the admin's view is refused
    Given I open the "runs" page
    And the server has had time to answer
    # The next visit of the page asks for the admin's view as a QA.
    When the shared runs table is made to ask for the admin's view
    And I switch to the "overview" page
    And I switch to the "runs" page
    And the server has had time to answer
    Then the server was asked for "/api/v1/view/runs/all"
    And the table has 0 rows
    And the cell "label-runs-error" reads "/api/v1/view/runs/all answered 403 Forbidden: your session may not see this view"

  Scenario: The admin's settings page has a Danger zone of its own; QA's is the page as it is, with no blank
    Given I open the "settings" page
    And the server has had time to answer
    Then the page uses the "default" view, which is "prebuilt"
    And the page has 4 cells
    When I type "Sergey" into the input
    Then the state JSON contains '"displayName": "Sergey"'
    When I sign in as "admin"
    Then the page uses the "admin" view, which is "role: admin"
    And the page has 5 cells
    And the container "card-danger" holds the cells "button-reset-settings"
    When I click the button "Reset every setting"
    Then the state JSON does not contain '"displayName"'

  Scenario: A Wirework admin gets the admin's runs page with the Delete button, and a settings page with both cards — the later role wins where both set the page
    Given I open the "runs" page
    And the server has had time to answer
    When I sign in as "wirework-admin"
    And the server has had time to answer
    Then the server was asked for "/api/v1/view/runs/all"
    And the cell "button-delete-run" is hidden
    When I click the table row "123456"
    Then the cell "button-delete-run" is shown
    # Deleting is a server call the session must be allowed; the list is asked again and the row is gone.
    When I click the button "Delete run"
    And the server has had time to answer
    Then the first table row is "123457"
    And the cell "button-delete-run" is hidden
    When I switch to the "settings" page
    Then the page uses the "wirework-admin" view, which is "role: wirework-admin"
    And the page has 6 cells
    And the container "card-danger" holds the cells "button-reset-settings"
    And the container "card-sessions" holds the cells "table-sessions"
    When the server has had time to answer
    Then the table has 3 rows
    And the server was asked for "/api/v1/view/sessions"
    # Signed in as admin again, the Wirework admin's card is gone and the admin's page is as it was.
    When I sign in as "admin"
    Then the page uses the "admin" view, which is "role: admin"
    And the page has 5 cells

  Scenario: A personal view saved as QA is still mine as admin; choosing none shows the admin's page
    Given I open the "settings" page
    And the server has had time to answer
    When I save the view as "my-settings"
    Then the page uses the "my-settings" view, which is "mine"
    When I sign in as "admin"
    Then the page uses the "my-settings" view, which is "mine"
    And the view list offers "admin" as "role: admin"
    When I delete the view
    Then the page uses the "admin" view, which is "role: admin"

  Scenario: In the builder, editing for a role writes the role's configuration and shows the page as the role sees it
    Given I open the "builder" page
    And the store holds at "app.lists.roles":
      """
      ["qa", "admin"]
      """
    When I choose the "antd-label" widget
    And I set the setting "text" to "Everyone"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "Admins too"
    And I add the widget
    Then the page has 2 cells
    When I edit for the role "admin"
    Then the edit target is "role: admin"
    And adding widgets waits for the edits to be for everyone
    When I save the view as "admin"
    Then the page uses the "admin" view, which is "role: admin"
    And the state JSON contains '"roles": {'
    When I edit the page
    And I remove the cell "custom-1"
    And I save the page
    Then the page has 1 cell
    And the cell "custom-2" reads "Admins too"
    When I edit for everyone
    Then the edit target is "everyone"
    And the page uses the "default" view, which is "prebuilt"
    And the page has 2 cells

  Scenario: Editing for a role, a widget's template is the role's choice; the shared page keeps its own
    Given I open the "overview" page
    And the server has had time to answer
    # Choosing a role turns the user overlay off: edits are the role's.
    When I edit for the role "admin"
    Then the user overlay is available and off
    When I edit the page
    And I edit the cell "label-main"
    And I choose the template "loud" for the cell
    And I save the widget
    And I save the page
    Then the cell "label-main" reads "WIREWORK PLAYGROUND!!!"
    And the state JSON contains '"roles": {'
    When I edit for everyone
    Then the cell "label-main" reads "Wirework playground"

  Scenario: An admin seeing the admin's view edits it as their own copy — the shared page and the role's view untouched
    Given I open the "settings" page
    And the server has had time to answer
    When I sign in as "admin"
    Then the page uses the "admin" view, which is "role: admin"
    When I edit the page
    And I remove the cell "echo-permissions"
    And I save the page
    Then the page uses the "my-own" view, which is "mine"
    And the page has 4 cells
    And the container "card-danger" holds the cells "button-reset-settings"
    When I choose the view "admin"
    Then the page has 5 cells

  Scenario: Validation names a role's view that does not exist, and a role the application does not grant
    Given I open the "overview" page
    And the server has had time to answer
    Then the boot validation status is "view models: OK"
    When the store holds at "viewModels.roles.ops":
      """
      { "pages": { "overview": { "view": "nowhere" } } }
      """
    And I expand the "validation" panel
    Then the boot validation status is "view models: OK, 2 warning(s)"
    And the validation report mentions "roles.ops pages.overview"
    And the validation report mentions 'page view "nowhere" does not exist'
    And the validation report mentions 'role "ops" is held by nobody'
