Feature: Containers — a card that holds other widgets
  A card is a widget whose template holds a LAYOUT of its own: the cells
  inside sit on a grid of their own, stored with the card, so a page with
  cards is still one page. The widgets inside read the store, emit and
  react exactly as on the page; a card's content is edited where a page is
  edited — the builder shows it as the page, with a breadcrumb back.
  (doc/ADR/0009-containers.md)

  Scenario: The settings page keeps its controls in a card, and they work inside it
    Given I open the "settings" page
    # The title, the card and the two echoes: the five controls inside the card are the card's cells, not the page's.
    Then the page has 4 cells
    And the container "card-preferences" holds the cells "input-name, select-page-size, checkbox-auto-refresh, number-refresh-seconds, date-report-day"
    When I type "Sergey" into the input
    Then the input is valid
    And the state JSON contains '"displayName": "Sergey"'
    When I tick the checkbox
    Then the state JSON contains '"autoRefresh": true'

  Scenario: A view with a card in it shares as one layout, the card's content being the page's
    Given I open the "settings" page
    And the server has had time to answer
    When I share the view
    Then the shared view JSON contains '"id": "card-preferences"'
    And the shared view JSON does not contain '"input-name"'

  Scenario: The containers have live previews in the palette
    Given I open the "builder" page
    When I open the widget palette
    Then the preview of "antd-card" reads "Card"
    And the preview of "antd-tabs" reads "Runs"
    And the preview of "antd-collapse" reads "Details"

  Scenario: The builder adds a card, which opens at once to be filled, and comes back to it through "Edit content"
    Given I open the "builder" page
    When I choose the "antd-card" widget
    And I set the setting "title" to "Controls"
    And I add the widget
    # A placed container OPENS: its empty layout is the page, so the next widgets go inside it. Its cell
    # on the page is twice the usual height — a layout needs the room.
    Then the breadcrumb reads "builder › custom-1"
    And the page mode is "view"
    And the page has 0 cells
    And the state JSON contains '"h": 4'
    When I choose the "antd-label" widget
    And I set the setting "text" to "Inside"
    And I add the widget
    Then the page has 1 cell
    And the cell "custom-2" reads "Inside"
    When I follow the breadcrumb "builder"
    Then there is no breadcrumb
    And the page has 1 cell
    And the container "custom-1" holds the cells "custom-2"
    And the cell "custom-2" reads "Inside"
    # Back in later: "Edit content" saves the page (one session is one layout's) and opens the content
    # in EDIT mode — pressed to edit, it edits; Add waits for Save page, as on any page being edited.
    When I edit the page
    And I edit the content of the cell "custom-1"
    Then the breadcrumb reads "builder › custom-1"
    And the page mode is "editing"
    And the page has 1 cell
    And adding widgets waits for the page edit to end
    When I save the page
    And I choose the "antd-label" widget
    And I set the setting "text" to "Second"
    And I add the widget
    Then the page has 2 cells
    And the cell "custom-3" reads "Second"

  Scenario: A card on a demo page opens its content in edit mode, where the widgets inside move and resize
    Given I open the "settings" page
    And the server has had time to answer
    When I disable the user overlay
    And I edit the page
    And I edit the content of the cell "card-preferences"
    Then the breadcrumb reads "settings › card-preferences"
    And the page mode is "editing"
    And the page has 5 cells
    And the cell "select-page-size" is placed at x 6 y 0 w 3 h 2
    When I widen the cell "select-page-size" by 1 column
    Then the cell "select-page-size" is placed at x 6 y 0 w 4 h 2
    When I save the page
    Then the cell "select-page-size" is placed at x 6 y 0 w 4 h 2
    When I follow the breadcrumb "settings"
    Then there is no breadcrumb
    And the page mode is "view"
    And the page has 4 cells

  Scenario: On a demo page an admin adds a widget inside a card, in edit mode — a QA editing the same card has no palette
    Given I open the "settings" page
    And the server has had time to answer
    When I disable the user overlay
    And I edit the page
    And I edit the content of the cell "card-preferences"
    Then the page mode is "editing"
    And widgets cannot be added to the page
    When I follow the breadcrumb "settings"
    And I sign in as "admin"
    And the server has had time to answer
    # Inside a card widgets are added to the shared page: the admin edits for everyone.
    And I edit for everyone
    And I edit the page
    And I edit the content of the cell "card-preferences"
    And I choose the "antd-label" widget
    And I set the setting "text" to "Added by the admin"
    And I add the widget
    Then the page has 6 cells
    And the page mode is "editing"
    And the cell "custom-1" reads "Added by the admin"
    # Out of edit mode the palette is gone.
    When I save the page
    Then widgets cannot be added to the page
    And the page has 6 cells

  Scenario: With the user overlay on, a card's content is edited into the user's own view — layout and widgets inside — and the shared page is untouched
    Given I open the "cards" page
    And the server has had time to answer
    When I edit the page
    And I edit the content of the cell "card-profile"
    Then the breadcrumb reads "cards › card-profile"
    And the page mode is "editing"
    And the page has 3 rows
    # The greeting joins the row of the name field; the user's copy of the card's layout holds it.
    When I drop the cell "label-greeting" after the cell "switch-profile-refresh"
    Then the page has 2 rows
    And row 2 holds the cells "input-profile-name, switch-profile-refresh, label-greeting"
    When I set the flex classes of the cell "label-greeting" to "w-full order-first"
    # A widget inside is customised under the card's key as well: its settings, never its wiring.
    And I edit the cell "label-greeting"
    And I set the setting "text" to "Nobody yet"
    And I save the widget
    And I save the page
    Then the cell "label-greeting" has the flex classes "w-full order-first"
    And the cell "label-greeting" reads "Nobody yet"
    And the state JSON contains '"card-profile/label-greeting"'
    When I follow the breadcrumb "cards"
    Then the page layout uses the "flexlayout" engine
    # The DOM order is the user's layout (the greeting in the second row); order-first only draws it first.
    And the container "card-profile" holds the cells "button-name-alice, button-name-bob, button-name-clear, input-profile-name, switch-profile-refresh, label-greeting"
    And the cell "label-greeting" has the flex classes "w-full order-first"
    And the cell "label-greeting" reads "Nobody yet"
    # The shared page is as it was: without the overlay the card shows its own layout and text.
    When I disable the user overlay
    Then the cell "label-greeting" has the flex classes "w-full"
    And the cell "label-greeting" reads "Type a name to be greeted"
    And the cell "label-greeting" sits below the cell "input-profile-name"
    When I enable the user overlay
    Then the cell "label-greeting" has the flex classes "w-full order-first"

  Scenario: A view holds the layouts inside its cards — Save as keeps what was changed, another view shows the cards as they were, and a card resets to the original
    Given I open the "cards" page
    And the server has had time to answer
    When I edit the page
    And I edit the content of the cell "card-profile"
    And I set the flex classes of the cell "label-greeting" to "w-full order-first"
    # Save as with the change still pending: the new view takes it, nothing is lost.
    And I save the view as "mine"
    Then the cell "label-greeting" has the flex classes "w-full order-first"
    When I follow the breadcrumb "cards"
    Then the page uses the "mine" view, which is "mine"
    And the cell "label-greeting" has the flex classes "w-full order-first"
    # The card's layout belongs to the view: the prebuilt one shows the card as it was, mine as I left it.
    When I choose the view "default"
    Then the cell "label-greeting" has the flex classes "w-full"
    When I choose the view "mine"
    Then the cell "label-greeting" has the flex classes "w-full order-first"
    # Every card has "Reset to original" in edit mode; it has something to do only where the view holds a layout of its own.
    When I edit the page
    Then the content of the cell "card-profile" can be reset to the original
    And the content of the cell "card-counter" is the original
    When I reset the content of the cell "card-profile" to the original
    And I save the page
    Then the cell "label-greeting" has the flex classes "w-full"
    And the page uses the "mine" view, which is "mine"

  Scenario: A card's content may run on another layout engine, chosen while it is empty
    Given I open the "builder" page
    When I choose the "antd-card" widget
    And I add the widget
    Then the breadcrumb reads "builder › custom-1"
    And the page layout uses the "react-grid-layout" engine
    # The engine of the layout inside is a choice until its first widget, as a page's is.
    When I select the "gridstack" layout engine
    Then the page layout uses the "gridstack" engine
    When I choose the "antd-label" widget
    And I set the setting "text" to "On gridstack"
    And I add the widget
    Then the engine is locked as "gridstack"
    And the cell "custom-2" reads "On gridstack"
    When I follow the breadcrumb "builder"
    Then the page layout uses the "react-grid-layout" engine
    And the container "custom-1" holds the cells "custom-2"
    And the cell "custom-2" reads "On gridstack"

  Scenario: The widgets inside a card are moved and resized where its content is the page
    Given I open the "builder" page
    When I choose the "antd-card" widget
    And I set the setting "title" to "Controls"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "First"
    And I add the widget
    And I choose the "antd-label" widget
    And I set the setting "text" to "Second"
    And I add the widget
    Then the breadcrumb reads "builder › custom-1"
    And the cell "custom-3" is placed at x 0 y 2 w 12 h 2
    # Inside the card the layout is the page: Edit page gives its cells the same handles as any page's.
    When I edit the page
    And I drag the cell "custom-3" onto the cell "custom-2"
    Then the cell "custom-3" is placed at x 0 y 0 w 12 h 2
    When I save the page
    Then the cell "custom-3" is placed at x 0 y 0 w 12 h 2
    And the cell "custom-2" is placed at x 0 y 2 w 12 h 2
    When I follow the breadcrumb "builder"
    # The card still lists its cells in template order; the move changed their places on the grid, not the list.
    Then the container "custom-1" holds the cells "custom-2, custom-3"

  Scenario: Tabs are named and added in the form, each with a layout of its own
    Given I open the "builder" page
    When I choose the "antd-tabs" widget
    # The form starts from the contract's default: one tab, to be named.
    Then the setting "tabs" has 1 entry
    When I name entry 1 of the setting "tabs" "Runs"
    And I add an entry to the setting "tabs"
    And I name entry 2 of the setting "tabs" "History"
    And I add the widget
    # A placed tabs widget opens on its first tab's layout; the tab's key is made from its label.
    Then the breadcrumb reads "builder › custom-1 · tabs.0.content"
    When I follow the breadcrumb "builder"
    Then the cell "custom-1" has the tabs "Runs, History"
    And the state JSON contains '"key": "history"'
    # The editor adds a third tab and removes the first; the new tab gets an empty layout of its own on save.
    When I edit the page
    And I edit the cell "custom-1"
    Then the setting "tabs" has 2 entries
    When I add an entry to the setting "tabs"
    And I name entry 3 of the setting "tabs" "More"
    And I remove entry 1 of the setting "tabs"
    And I save the widget
    And I save the page
    Then the cell "custom-1" has the tabs "History, More"
    When I edit the page
    And I edit the layout "tabs.1.content" of the cell "custom-1"
    Then the breadcrumb reads "builder › custom-1 · tabs.1.content"
    And the page has 0 cells

  Scenario: Wrap in a card puts a placed widget into a new card, with its wiring intact
    Given I open the "builder" page
    When I choose the "antd-counter" widget
    And I set the "input" port "value" to "demo.custom"
    And I add the widget
    And I edit the page
    And I wrap the cell "custom-1" in a card
    Then there are at least 1 pending change
    When I save the page
    Then the page has 1 cell
    And the container "custom-2" holds the cells "custom-1"
    When I click the counter 2 times
    Then the state JSON contains '"custom": 2'
