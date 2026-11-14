Feature: Cells of a table are selected like a spreadsheet's, copied and exported
  Both tables select CELLS: a click selects one — outlined, with a small
  square at its bottom-right corner that says it can be dragged —, a drag
  from it, a drag of that square or a Shift+click a RECTANGLE of cells. A
  right click opens a menu: Copy, Copy with headers, Export as CSV. What is
  copied pastes into a spreadsheet as cells: a line per row, tabs between;
  a tag copies its text, a link cell the address it leads to. Ctrl/Cmd+C
  copies too. The export saves every row the table holds, in the columns
  it shows. (doc/ADR/0007-row-window-and-header-filters.md, "Cells are selected and copied")

  Scenario: A click selects a cell, a drag a rectangle, and the menu copies it with its headers
    Given I open the "history" page
    Then the table has 10 rows
    And the table has no cells selected
    When I select the cell "inbound" of the table row "123456"
    Then the table has the cells "1-4/1-4" selected
    And the cell "inbound" of the table row "123456" carries the selection's corner
    When I select the cells from "name" of the table row "123456" to "state" of the table row "123457"
    Then the table has the cells "1-2/2-5" selected
    And the cell "state" of the table row "123457" carries the selection's corner
    When I open the cell menu on "inbound" of the table row "123457"
    Then the cell menu offers "Copy, Copy with headers, Export as CSV"
    # The selection stands: the right click was inside it. Name is a link — its address is what is copied.
    When I choose "Copy with headers" in the cell menu
    Then the table copied the cells:
      """
      Name | Reference | Inbound | Status
      {origin}/demo/runs/123456 | REF55456735 | IND539363 | Failed
      {origin}/demo/runs/123457 | REF59456736 | IND557328 | Success
      """
    And the table has the cells "1-2/2-5" selected

  Scenario: Shift+click and the corner's square reach further, the keyboard copies, Escape lets go
    Given I open the "history" page
    Then the table has 10 rows
    When I select the cell "inbound" of the table row "123456"
    And I extend the selection to "state" of the table row "123457"
    Then the table has the cells "1-4/2-5" selected
    When I copy the selected cells with the keyboard
    Then the table copied the cells:
      """
      IND539363 | Failed
      IND557328 | Success
      """
    When I drag the corner of the selection to "state" of the table row "123459"
    Then the table has the cells "1-4/4-5" selected
    # A right click outside the selection selects that cell: the menu is about what is under the pointer.
    When I open the cell menu on "reference" of the table row "123456"
    Then the table has the cells "1-3/1-3" selected
    When I choose "Copy" in the cell menu
    Then the table copied "REF55456735"
    When I let the selection go with Escape
    Then the table has no cells selected

  Scenario: The menu exports the rows the list holds as a CSV file
    Given I open the "history" page
    Then the table has 10 rows
    When I open the cell menu on "inbound" of the table row "123456"
    And I choose "Export as CSV" in the cell menu and keep the file
    # The titles, then the ten rows held — not the 23 the server has.
    Then the exported file is "history-data.csv" with 11 lines, the first "#,Name,Reference,Inbound,Status"
    # Both # and Name are links to the run: each is exported as the address it leads to.
    And line 2 of the exported file is "{origin}/demo/runs/123456,{origin}/demo/runs/123456,REF55456735,IND539363,Failed"

  Scenario: The plain table selects and copies the same way, and a row click still selects the run
    Given I open the "runs" page
    And the server has had time to answer
    When I select the cell "state" of the table row "123456"
    Then the table has the cells "1-4/1-4" selected
    And the cell "echo-selected-run" reads 'Selected run:"123456"'
    When I open the cell menu on "state" of the table row "123456"
    And I choose "Copy" in the cell menu
    Then the table copied "Failed"
