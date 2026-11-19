Feature: Page views
  A page has VIEWS: the team's prebuilt layouts (its "default" and any
  other the configuration ships) and the user's own. One list above the page
  offers them all, each labelled "prebuilt" or "mine"; choosing one is a
  personal preference and needs no permission. Save as copies the shown
  view under a new name — the user's own with the overlay on, a prebuilt
  one with it off (how an administrator ships alternatives); Rename and
  Delete work on the user's own only; Share shows the view as a JSON text a
  colleague imports under Import. Creating, renaming, deleting and importing
  a view change a page, so they wait for the editing permission like Edit
  page does.

  Scenario: The settings page offers the team's two views, both labelled prebuilt
    Given I open the "settings" page
    Then the page uses the "default" view, which is "prebuilt"
    And the view list offers "default" as "prebuilt"
    And the view list offers "compact" as "prebuilt"
    When I choose the view "compact"
    Then the page uses the "compact" view, which is "prebuilt"
    And the page has 3 cells
    And the cell "echo-counter" is placed at x 6 y 1 w 6 h 2
    When I choose the view "default"
    Then the page has 12 cells

  Scenario: Saving my own view and switching between it and the team's
    Given I open the "settings" page
    When I choose the view "compact"
    And I save the view as "my-compact"
    Then the view panel is closed
    And the page uses the "my-compact" view, which is "mine"
    And the view list offers "my-compact" as "mine"
    And the page has 3 cells
    When I edit the page
    And I remove the cell "echo-counter"
    And I save the page
    Then the page uses the "my-compact" view, which is "mine"
    And the page has 2 cells
    When I choose the view "compact"
    Then the page has 3 cells
    When I choose the view "my-compact"
    Then the page has 2 cells
    When I switch to the "pagination" page
    And I switch to the "settings" page
    Then the page uses the "my-compact" view, which is "mine"
    And the page has 2 cells

  Scenario: Editing a prebuilt view while "my-own" exists makes a numbered copy
    Given I open the "settings" page
    When I edit the page
    And I remove the cell "echo-demo"
    And I save the page
    Then the page uses the "my-own" view, which is "mine"
    When I choose the view "default"
    And I edit the page
    And I remove the cell "echo-demo"
    And I save the page
    Then the page uses the "my-own-2" view, which is "mine"
    And the view list offers "my-own" as "mine"
    And the view list offers "my-own-2" as "mine"

  Scenario: Renaming and deleting my own view
    Given I open the "settings" page
    When I save the view as "temporary"
    Then the page uses the "temporary" view, which is "mine"
    When I rename the view to "kept"
    Then the page uses the "kept" view, which is "mine"
    And the view list offers "kept" as "mine"
    And the view list does not offer "temporary"
    When I delete the view
    Then the page uses the "default" view, which is "prebuilt"
    And the view list does not offer "kept"

  Scenario: A name a view already has is refused, with the reason
    Given I open the "settings" page
    When I save the view as "compact"
    Then the view panel says 'There is already a view named "compact"'
    When I save the view as "v1.0"
    Then the view panel says "cannot contain a dot"

  Scenario: Sharing a view as JSON
    Given I open the "settings" page
    When I choose the view "compact"
    And I share the view
    Then the shared view JSON contains '"kind": "wirework-page-view"'
    And the shared view JSON contains '"page": "settings"'
    And the shared view JSON contains '"name": "compact"'
    And the shared view JSON contains '"engine": "react-grid-layout"'

  Scenario: Importing a shared view makes it one of mine
    Given I open the "settings" page
    When I import the view:
      """
      {
        "kind": "wirework-page-view",
        "version": 1,
        "page": "settings",
        "name": "pasted",
        "template": {
          "engine": "react-grid-layout",
          "cells": [
            { "id": "label-main", "widget": "antd-label", "model": "widgets.settings.banner", "template": "default", "x": 0, "y": 0, "w": 12, "h": 1 }
          ]
        }
      }
      """
    Then the view panel is closed
    And the page uses the "pasted" view, which is "mine"
    And the page has 1 cell
    And the label reads "WIREWORK PLAYGROUND!!!"

  Scenario: An import is refused when the text is not a view, is for another page, or takes a name in use
    Given I open the "settings" page
    When I import the view:
      """
      { "hello": "world" }
      """
    Then the view panel says "This is not a Wirework page view"
    When I import the view:
      """
      { "kind": "wirework-page-view", "version": 1, "page": "pagination", "name": "x", "template": { "engine": "react-grid-layout", "cells": [] } }
      """
    Then the view panel says 'This view is for the page "pagination"'
    When I import the view as "default":
      """
      { "kind": "wirework-page-view", "version": 1, "page": "settings", "name": "x", "template": { "engine": "react-grid-layout", "cells": [] } }
      """
    Then the view panel says 'There is already a view named "default"'

  Scenario: With the overlay off a saved view is prebuilt — how an administrator ships one
    Given I open the "builder" page
    Then no view can be chosen
    When I choose the "antd-label" widget
    And I set the setting "text" to "Shared text"
    And I add the widget
    And I save the view as "team-wide"
    Then the view panel is closed
    And the page uses the "default" view, which is "prebuilt"
    And no view can be chosen
    When I enable the user overlay
    Then the view list offers "team-wide" as "prebuilt"
    When I choose the view "team-wide"
    Then the page uses the "team-wide" view, which is "prebuilt"
    And the page has 1 cell

  Scenario: Without the editing permission a view can be chosen but not saved
    Given I open the "settings" page
    When the server has had time to answer
    And the store holds at "app.permissions":
      """
      { "editPages": false }
      """
    Then views cannot be saved
    When I choose the view "compact"
    Then the page uses the "compact" view, which is "prebuilt"
