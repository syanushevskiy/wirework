Feature: Generic table
  The table knows nothing about what a row is: it shows ANY array of
  objects from the store. Each row is identified by one of its properties
  (the row key, "id" unless configured), never by its position. Columns are
  configured, or — when none are — one per field of the first row. A click
  on a row emits the row's key and the row itself.

  Background:
    Given I open the "builder" page
    And the store holds at "sample.runs":
      """
      [
        { "id": "123456", "name": "E2E Run # 98765", "reference": "REF55456735", "status": { "state": "Failed" } },
        { "id": "123457", "name": "E2E Run # 98766", "reference": "REF59456736", "status": { "state": "Success" } },
        { "id": "123458", "name": "E2E Run # 98767", "reference": "REF59456737", "status": { "state": "Running" } }
      ]
      """

  Scenario: A table added without columns shows one column per field
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "sample.runs"
    And I add the widget
    Then the table has 3 rows
    And the table has a column "name"
    And the table has a column "reference"
    And the table row "123457" shows "E2E Run # 98766" for "name"

  Scenario: Any rows from the store, keyed by a chosen property
    Given the store holds at "sample.applications":
      """
      [
        { "value": "billing", "label": "Billing" },
        { "value": "search", "label": "Search" }
      ]
      """
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "sample.applications"
    And I set the setting "rowKey" to "value"
    And I add the widget
    Then the table has 2 rows
    And the table has a column "label"
    And the table row "search" shows "Search" for "label"

  Scenario: A row click can store any field of the row
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "sample.runs"
    And I set the reaction for "row-selected" to set "sample.picked" from "row"
    And I add the widget
    And I choose the "antd-echo" widget
    And I set the "input" port "value" to "sample.picked.name"
    And I add the widget
    When I click the table row "123458"
    Then the echo widget at "sample.picked.name" shows '"E2E Run # 98767"'
