Feature: Generic table
  The table knows nothing about what a row is: it shows ANY array of
  objects from the store. Each row is identified by one of its properties
  (the row key, "id" unless configured), never by its position. Columns are
  configured, or — when none are — one per field of the first row. A click
  on a row emits the row's key and the row itself.

  Scenario: A table added without columns shows one column per field
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "runs.data"
    And I add the widget
    Then the table has 5 rows
    And the table has a column "name"
    And the table has a column "reference"
    And the table row "123457" shows "E2E Run # 98766" for "name"

  Scenario: Any rows from the store, keyed by a chosen property
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "filters.applicationOptions"
    And I set the setting "rowKey" to "value"
    And I add the widget
    Then the table has 3 rows
    And the table has a column "label"
    And the table row "search" shows "Search" for "label"

  Scenario: A row click can store any field of the row
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "runs.data"
    And I set the reaction for "row-selected" to set "runs.pickedName" from "row"
    And I add the widget
    And I choose the "antd-echo" widget
    And I set the "input" port "value" to "runs.pickedName.name"
    And I add the widget
    When I click the table row "123458"
    Then the echo widget at "runs.pickedName.name" shows '"E2E Run # 98767"'
