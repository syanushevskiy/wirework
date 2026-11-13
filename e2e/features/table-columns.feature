Feature: The column menu of a table
  A table with the column menu on has a settings button above it: the
  user hides columns and drags them into another order, the browser keeps
  that across a reload, and Reset brings the columns back as configured.

  Scenario: Hidden columns and their order are kept across a reload
    Given I open the "runs" page
    Then the table has the columns "#, Name, Reference, Status"
    When I open the column menu of the table
    Then the column menu lists "#, Name, Reference, Status"
    And the columns of the table cannot be reset
    When I hide the column "Reference"
    Then the table has the columns "#, Name, Status"
    When I drag the column "Status" above the column "#"
    Then the table has the columns "Status, #, Name"
    And the column menu lists "Status, #, Name, Reference"
    # A reload: the page opens as a fresh application, the browser's storage stays.
    When I open the "runs" page
    Then the table has the columns "Status, #, Name"
    And the table has 5 rows

  Scenario: Reset brings the columns back and forgets what was kept
    Given I open the "runs" page
    When I open the column menu of the table
    And I hide the column "Name"
    And I drag the column "#" below the column "Status"
    Then the table has the columns "Reference, Status, #"
    And the columns of the table can be reset
    When I reset the columns of the table
    Then the table has the columns "#, Name, Reference, Status"
    When I open the "runs" page
    Then the table has the columns "#, Name, Reference, Status"

  Scenario: A hidden column comes back with its checkbox
    Given I open the "runs" page
    When I open the column menu of the table
    And I hide the column "Status"
    Then the table has the columns "#, Name, Reference"
    When I show the column "Status"
    Then the table has the columns "#, Name, Reference, Status"
    And the columns of the table cannot be reset

  Scenario: The infinite list has the same menu, kept apart from the runs table's
    Given I open the "runs" page
    When I open the column menu of the table
    And I hide the column "Name"
    And I open the "history" page
    Then the table has the columns "#, Name, Reference, Inbound, Status"
    When I open the column menu of the table
    And I hide the column "Inbound"
    And I drag the column "Reference" above the column "#"
    Then the table has the columns "Reference, #, Name, Status"
    When I open the "history" page
    Then the table has the columns "Reference, #, Name, Status"
    And the table has 10 rows
    When I open the "runs" page
    Then the table has the columns "#, Reference, Status"

  Scenario: A table without the setting has no menu
    Given I open the "archive" page
    Then the table has no column menu
