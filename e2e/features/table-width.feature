Feature: A table scrolls sideways when its box is narrower than its columns need
  Every column has a width — 110 pixels, an id column 88, or its own — and
  their sum is the least the table needs. In a wider box the table
  stretches to fill it; in a narrower one it keeps that width and scrolls
  sideways, its header with it.

  Scenario: The runs table fills a wide page and scrolls sideways in a narrow one
    Given I open the "runs" page
    # The id column and three more: 88 + 3 × 110.
    Then the table needs 418 pixels for its columns
    And the table fills its box without a sideways scroll
    When the browser window is 440 pixels wide
    Then the table scrolls sideways
    When the browser window is 1280 pixels wide
    Then the table fills its box without a sideways scroll

  Scenario: The infinite list does the same, and a hidden column needs no room
    Given I open the "history" page
    Then the table needs 528 pixels for its columns
    And the table fills its box without a sideways scroll
    When the browser window is 440 pixels wide
    Then the table scrolls sideways
    When I open the column menu of the table
    And I hide the column "Inbound"
    Then the table needs 418 pixels for its columns
