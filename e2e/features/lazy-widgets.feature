Feature: A heavy widget's code is loaded only by the pages that show it
  The Editor page shows a code editor — a stand-in for a heavy library.
  Its code is not part of what every page downloads: a page asks for it
  when it shows the editor, the cell shows a placeholder until the code
  arrives, and code that does not arrive is that one cell's problem, which
  can be asked for again.

  Scenario: A page that does not show the editor never loads its code
    Given I open the "settings" page
    When the server has had time to answer
    Then the code of the widget "demo-code-editor" was not loaded
    When I switch to the "pagination" page
    And the server has had time to answer
    Then the code of the widget "demo-code-editor" was not loaded

  Scenario: The editor's page shows a placeholder until its code arrives
    Given the server is slow to answer
    And I open the "editor" page
    Then the cell "editor-main" is loading
    # The widgets beside it do not wait for it.
    And the cell "label-editor-source" reads '{ "hello": "world" }'
    When the server has had time to answer
    Then the cell "editor-main" shows its widget
    And the code editor has 3 lines
    And the code of the widget "demo-code-editor" was loaded once
    And no widget has crashed

  Scenario: What is typed into the editor reaches the store, like any widget's value
    Given I open the "editor" page
    When I replace the code in the editor with "[1, 2]"
    Then the cell "label-editor-source" reads "[1, 2]"
    And the code editor has 1 lines

  Scenario: Code that fails to load is one cell's problem, and can be asked for again
    Given the code of the widgets cannot be fetched
    And I open the "editor" page
    Then the cell "editor-main" says its widget could not be loaded
    And the cell "label-editor-source" reads '{ "hello": "world" }'
    And the code of the widget "demo-code-editor" was not loaded
    When the code of the widgets can be fetched again
    And I load the widget of the cell "editor-main" again
    Then the cell "editor-main" shows its widget
    And the code of the widget "demo-code-editor" was loaded once

  Scenario: Coming back to the editor's page does not load its code a second time
    Given I open the "editor" page
    Then the cell "editor-main" shows its widget
    When I switch to the "settings" page
    And I switch to the "editor" page
    Then the cell "editor-main" shows its widget
    And the code of the widget "demo-code-editor" was loaded once
