Feature: Roles — one page, different for an admin and for everybody else
  A user holds ROLES, listed by the session from the broadest to the most
  specific (a QA; a QA who is also an admin; a Wirework admin who is both). The
  configuration says per role what differs about a page — which view of it
  the role sees, which template a widget uses for it, a setting — and the
  page is read through the base, then the roles in that order, then the
  user's own overlay: the later wins, per thing. A role's layout is a page
  view; a role's wiring is a widget template; one more widget for a
  stronger role is a condition on the user's roles. What the server answers
  stays the server's decision from the session. (doc/ADR/0012-roles.md)

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
    # Deleting is a server call the session must be allowed; the button asks first; the list is asked again and the row is gone.
    When I click the button "Delete run"
    And I confirm
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

  Scenario: The roles page is one card — everyone's template with the note, the admin's with a button and its echo as well
    Given I open the "roles" page
    And the server has had time to answer
    Then the page has 3 cells
    # A QA sees the card as everyone does: the note and how it works.
    And the container "card-roles" holds the cells "input-note, label-how"
    When I type "hello" into the input
    Then the state JSON contains '"note": "hello"'
    # The same page as admin: roles.json picks the card's "admin" template, which holds two widgets more.
    When I sign in as "admin"
    And the server has had time to answer
    Then the container "card-roles" holds the cells "input-note, button-approve, echo-approval, label-how"
    When I click the button "Approve — admin only"
    Then the echo widget at "roles.approval" shows '"approved by the admin"'
    # Back as QA the card is everyone's again — nothing else changed.
    When I sign in as "qa"
    And the server has had time to answer
    Then the container "card-roles" holds the cells "input-note, label-how"
    And the state JSON contains '"note": "hello"'

  Scenario: On the shared page an admin turns the admin's tools on with a switch — conditions, no view of the admin's own
    Given I open the "roles" page
    And the server has had time to answer
    # A QA has neither the switch nor what it shows: both wait for the role.
    Then the cell "switch-admin-mode" is hidden
    And the cell "button-clear-note" is hidden
    When I type "hello" into the input
    And I sign in as "admin"
    And the server has had time to answer
    # The admin has the switch, off: the tool waits for it too.
    Then the cell "switch-admin-mode" is shown
    And the switch is off
    And the cell "button-clear-note" is hidden
    When I flip the switch
    Then the cell "button-clear-note" is shown
    When I click the button "Clear the note — admin mode"
    Then the state JSON contains '"note": ""'
    When I flip the switch
    Then the cell "button-clear-note" is hidden
    # The mode is a setting, not a right: left on, it shows a QA nothing.
    When I flip the switch
    And I sign in as "qa"
    And the server has had time to answer
    Then the state JSON contains '"adminMode": true'
    And the cell "switch-admin-mode" is hidden
    And the cell "button-clear-note" is hidden

  Scenario: In the builder, a widget for the admin alone can also be a condition on the roles — no template of its own
    Given I open the "builder" page
    And the store holds at "app.user.roles":
      """
      ["qa"]
      """
    When I choose the "antd-input" widget
    And I set the setting "label" to "Your note"
    And I add the widget
    And I choose the "antd-button" widget
    And I set the setting "label" to "Approve"
    And I set the reaction for "clicked" to set "roles.approval"
    # "Show when": the host's check by its phrase, the role as its value.
    And I add a condition
    And I set the condition to "app.user.roles" "has the role" "admin"
    Then the condition reads 'when app.user.roles has the role "admin"'
    When I add the widget
    Then the page has 2 cells
    And the cell "custom-2" is hidden
    When the store holds at "app.user.roles":
      """
      ["qa", "admin"]
      """
    Then the cell "custom-2" is shown

  Scenario: A personal view saved as QA is still mine as admin; choosing none shows the admin's page
    Given I open the "settings" page
    And the server has had time to answer
    When I save the view as "my-settings"
    Then the page uses the "my-settings" view, which is "mine"
    # An admin starts with the overlay off — their edits are their role's — and has their own views with it on.
    When I sign in as "admin"
    Then the page uses the "admin" view, which is "role: admin"
    When I enable the user overlay
    Then the page uses the "my-settings" view, which is "mine"
    And the view list offers "admin" as "role: admin"
    When I delete the view
    Then the page uses the "admin" view, which is "role: admin"

  Scenario: The builder grants two roles from the start, and a builder adds the roles the application has
    Given I open the "builder" page
    When I edit for the role "app-user"
    Then the edit target is "role: app-user"
    When I edit for the role "admin"
    Then the edit target is "role: admin"
    When I edit for everyone
    And I add the role "reviewer"
    And I edit for the role "reviewer"
    Then the edit target is "role: reviewer"
    And the state JSON contains '"reviewer"'
    # A role name is kebab-case, like the actions' and the predicates' — and never twice.
    When I add the role "App User"
    Then the new role name is refused
    When I add the role "admin"
    Then the new role name is refused

  Scenario: In the builder, a widget added while editing for a role is the role's alone — its template shared, its cell in the role's view
    Given I open the "builder" page
    When I choose the "antd-input" widget
    And I set the setting "label" to "Your note"
    And I add the widget
    Then the page has 1 cell
    When I edit for the role "admin"
    And I choose the "antd-echo" widget
    And I set the "input" port "value" to "demo.note"
    And I add the widget
    # The admin's page: the shared input and the echo, in a view of the admin's own made from the shared layout.
    Then the page has 2 cells
    And the page uses the "admin" view, which is "role: admin"
    And I see a widget "antd-echo"
    And the state JSON contains '"custom-2"'
    # Everyone else: the page as it was.
    When I edit for everyone
    Then the page has 1 cell
    And the page uses the "default" view, which is "prebuilt"

  Scenario: On a demo page an admin adds a widget for a role, in edit mode — the role's page has it, everyone else's is as it was
    Given I open the "overview" page
    And the server has had time to answer
    Then the page has 8 cells
    # A QA may edit the page, and gets no palette: widgets are an admin's to add.
    When I edit for the role "admin"
    And I edit the page
    Then widgets cannot be added to the page
    When I cancel the page edit
    And I sign in as "admin"
    And the server has had time to answer
    And I edit for the role "admin"
    # The admin has the palette in edit mode only.
    Then widgets cannot be added to the page
    When I edit the page
    And I drag the cell "counter-main" onto the cell "label-main"
    And I choose the "antd-label" widget
    And I set the setting "text" to "Admins only"
    And I add the widget
    # Add saved what was pending, placed the widget and left the admin in edit mode.
    Then the page has 9 cells
    And the page mode is "editing"
    And the cell "custom-1" reads "Admins only"
    And the cell "counter-main" is placed at x 0 y 0 w 6 h 2
    When I cancel the page edit
    Then the page has 9 cells
    And the page uses the "admin" view, which is "role: admin"
    And widgets cannot be added to the page
    # The file another admin imports carries it: the role's view and the widget's template.
    When I export the page
    Then the exported page JSON contains '"widgets.custom.custom-1": {'
    And the exported page JSON contains '"admin": {'
    When I close the export panel
    # For everyone, a page's own layout is its configuration: no palette, edit mode or not.
    And I edit for everyone
    Then the page has 8 cells
    When I edit the page
    Then widgets cannot be added to the page

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

  Scenario: An admin's edits are their role's from the start — the layout, and a widget's wiring for everyone
    Given I open the "overview" page
    And the server has had time to answer
    When I sign in as "admin"
    And the server has had time to answer
    Then the edit target is "role: admin"
    And the user overlay is available and off
    When I edit the page
    And I edit the cell "echo-counter"
    # The wiring is not locked for an admin: it goes into the shared template, the settings stay the role's.
    And I set the "input" port "value" to "app.settings.note"
    And I save the widget
    And I save the page
    Then the state editor "views" contains '"value": "app.settings.note"'
    # A QA, whose edits are their own view, sees the rewired widget too: the template is everyone's.
    When I sign in as "qa"
    And the server has had time to answer
    Then the edit target is "me"
    And the state editor "views" contains '"value": "app.settings.note"'

  Scenario: An admin seeing the admin's view with the overlay on edits it as their own copy — the shared page and the role's view untouched
    Given I open the "settings" page
    And the server has had time to answer
    When I sign in as "admin"
    Then the page uses the "admin" view, which is "role: admin"
    When I enable the user overlay
    And I edit the page
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
