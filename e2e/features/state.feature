Feature: State inspector
  The left side of the playground shows the store as editable JSON. On a
  demo page it is FOUR editors: this page's own data (what starts over when
  the page opens), this page's own views (its part of viewModels and
  userViewModels — nothing of another page's), the global settings
  (app.settings) and the global session (the rest of app); the builder has
  one. Widget interactions appear live, and applying an edit updates the
  widgets on the right.

  Scenario: Widget interactions are reflected in the state JSON
    Given I open the "settings" page
    When I click the counter 2 times
    Then the state JSON contains '"counter": 2'

  Scenario: A demo page's data, its views, the settings and the session are four editors, each holding only its own
    Given I open the "settings" page
    And the server has had time to answer
    Then the state panel has 4 editors
    And the state editor "page" contains '"route"'
    And the state editor "page" does not contain '"viewModels"'
    And the state editor "page" does not contain '"settings"'
    # The page's views: its layouts, the widget templates its cells point at, what the roles say about it — this page's alone.
    And the state editor "views" contains '"card-preferences"'
    And the state editor "views" contains '"sessions": {'
    And the state editor "views" contains '"wirework-admin"'
    And the state editor "views" does not contain '"table-main"'
    And the state editor "views" does not contain '"pagination": {'
    And the state editor "views" does not contain '"card-roles"'
    And the state editor "settings" contains '"pageSize": "5"'
    And the state editor "settings" does not contain '"user"'
    And the state editor "session" contains '"editPages": true'
    And the state editor "session" does not contain '"viewModels"'
    # The settings' values live in the settings editor alone.
    And the state editor "session" does not contain '"autoRefresh": false'
    When I type "Sergey" into the input
    Then the state editor "settings" contains '"displayName": "Sergey"'
    And the state editor "page" does not contain '"displayName"'
    # The builder's store is one editor: no global state there.
    Given I open the "builder" page
    Then the state panel has 1 editor

  Scenario: Editing a page's views changes that page alone, and the other pages keep theirs
    Given I open the "settings" page
    And the server has had time to answer
    When I edit the state JSON setting "viewModels.widgets.settings.banner.loud.text" to "HELLO FROM STATE"
    Then the label reads "HELLO FROM STATE"
    And the boot validation status is "view models: OK"
    When I switch to the "pagination" page
    And the server has had time to answer
    Then the table has 5 rows
    And the state editor "views" does not contain '"HELLO FROM STATE"'

  Scenario: Editing a data value updates the widgets
    Given I open the "settings" page
    When I edit the state JSON setting "demo.counter" to 41
    Then the echo widget at "demo.counter" shows "41"

  Scenario: Editing a view model updates the widgets
    Given I open the "settings" page
    When I edit the state JSON setting "viewModels.widgets.settings.banner.loud.text" to "HELLO FROM STATE"
    Then the label reads "HELLO FROM STATE"

  Scenario: Invalid JSON is rejected with an error and never reaches the store
    Given I open the "settings" page
    When I replace the state JSON with "not json at all"
    Then the state error is shown
    And I see a widget "antd-label"

  Scenario: A structurally invalid view-model tree is rejected and never reaches the store
    Given I open the "settings" page
    When I replace the state JSON with '{"viewModels": {"pages": {"settings": {"default": 5}}}}'
    Then the state error is shown
    And I see a widget "antd-label"
