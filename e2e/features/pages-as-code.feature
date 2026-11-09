Feature: Pages as code — the whole page as a file
  A page built in the builder reaches the application's source as a FILE
  (doc/pages-as-code-design.md). The first step of that road is Export page:
  an admin downloads the whole SHARED page as one JSON file —
  "<page>.page.json": its prebuilt views, what it loads, the widgets its
  cells reference down into its cards, and its address — and sends it to a
  developer, who merges it into the application's view models. The user's
  own views are never in the file; exporting waits for the editing
  permission, like Edit page.

  Scenario: The overview is exported whole — both prebuilt views, what it loads, its widgets and its address — but not my own view
    Given I open the "overview" page
    And the server has had time to answer
    When I save the view as "mine-only"
    Then the page uses the "mine-only" view, which is "mine"
    When I export the page
    Then the exported page JSON contains '"kind": "wirework-page"'
    And the exported page JSON contains '"page": "overview"'
    And the exported page JSON contains '"path": "/demo"'
    And the exported page JSON contains '"default": {'
    And the exported page JSON contains '"compact": {'
    And the exported page JSON contains '"call": "overview/load"'
    And the exported page JSON contains '"widgets.overview.title": {'
    And the exported page JSON does not contain '"mine-only"'
    When I download the exported page
    Then the downloaded file is "overview.page.json" and holds the page "overview"

  Scenario: A page of cards is exported with the widgets inside its cards, three engines deep
    Given I open the "cards" page
    And the server has had time to answer
    When I export the page
    Then the exported page JSON contains '"engine": "flexlayout"'
    And the exported page JSON contains '"engine": "flex-rows"'
    And the exported page JSON contains '"engine": "css-grid"'
    And the exported page JSON contains '"widgets.cards.nameAlice": {'
    And the exported page JSON contains '"widgets.cards.sessionName": {'
    And the exported page JSON contains '"widgets.cards.reset": {'
    And the exported page JSON contains '"path": "/demo/cards"'
    When I close the export panel
    Then the export panel is closed

  Scenario: A page the roles say something about is exported with what every role says, and the widgets their views use
    Given I open the "settings" page
    And the server has had time to answer
    When I export the page
    Then the exported page JSON contains '"templates": {'
    And the exported page JSON contains '"roles": {'
    And the exported page JSON contains '"wirework-admin": {'
    And the exported page JSON contains '"widgets.settings.danger": {'
    And the exported page JSON contains '"widgets.settings.sessionsTable": {'

  Scenario: A page built in the builder exports with the widgets it was given
    Given I open the "builder" page
    When I choose the "antd-label" widget
    And I set the setting "text" to "Built here"
    And I add the widget
    And I export the page
    Then the exported page JSON contains '"page": "builder"'
    And the exported page JSON contains '"id": "custom-1"'
    And the exported page JSON contains '"widgets.custom.custom-1": {'
    And the exported page JSON contains '"text": "Built here"'

  Scenario: Without the editing permission the page cannot be exported
    Given I open the "overview" page
    When the server has had time to answer
    And the store holds at "app.permissions":
      """
      { "editPages": false }
      """
    Then the page cannot be exported
