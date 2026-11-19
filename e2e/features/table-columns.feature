Feature: The column menu of a table
  A table with the column menu on has a "Columns" button above it: the
  user hides columns, drags them into another order and pins them to the
  table's left or right edge, the browser keeps that across a reload, and
  Reset brings the columns back as configured. A column the page calls
  required is listed and cannot be hidden. (A table with the setting off has
  no such button: the `NoToolbar` story.)

  Scenario: Hidden columns and their order are kept across a reload
    Given I open the "pagination" page
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
    When I open the "pagination" page
    Then the table has the columns "Status, #, Name"
    And the table has 5 rows

  Scenario: Reset brings the columns back and forgets what was kept
    Given I open the "pagination" page
    When I open the column menu of the table
    And I hide the column "Name"
    And I drag the column "#" below the column "Status"
    Then the table has the columns "Reference, Status, #"
    And the columns of the table can be reset
    When I reset the columns of the table
    Then the table has the columns "#, Name, Reference, Status"
    When I open the "pagination" page
    Then the table has the columns "#, Name, Reference, Status"

  Scenario: A hidden column comes back with its checkbox
    Given I open the "pagination" page
    When I open the column menu of the table
    And I hide the column "Status"
    Then the table has the columns "#, Name, Reference"
    When I show the column "Status"
    Then the table has the columns "#, Name, Reference, Status"
    And the columns of the table cannot be reset

  Scenario: The infinite list has the same menu, kept apart from the runs table's
    Given I open the "pagination" page
    When I open the column menu of the table
    And I hide the column "Name"
    And I open the "infinite-list" page
    Then the table has the columns "#, Name, Reference, Inbound, Status, Started, Runner, Branch, Duration"
    When I open the column menu of the table
    And I hide the column "Inbound"
    And I drag the column "Reference" above the column "#"
    Then the table has the columns "Reference, #, Name, Status, Started, Runner, Branch, Duration"
    When I open the "infinite-list" page
    Then the table has the columns "Reference, #, Name, Status, Started, Runner, Branch, Duration"
    And the list holds the rows 1 to 200
    When I open the "pagination" page
    Then the table has the columns "#, Reference, Status"

  Scenario: A required column is listed and cannot be hidden
    Given I open the "infinite-list" page
    Then the table has the columns "#, Name, Reference, Inbound, Status, Started, Runner, Branch, Duration"
    When I open the column menu of the table
    Then the column "#" cannot be hidden
    # Every column at once: the required one stays.
    When I hide every column of the table
    Then the table has the columns "#"
    And the columns of the table can be reset
    When I reset the columns of the table
    Then the table has the columns "#, Name, Reference, Inbound, Status, Started, Runner, Branch, Duration"

  # A long scenario of hovered menus over a list of two hundred rows: beside five other workers it needs more than
  # the default half a minute.
  @timeout:90000
  Scenario: Columns are pinned to the left and to the right, and the menu shows them in sections
    Given I open the "infinite-list" page
    When I open the column menu of the table
    # Nothing is pinned: the menu is one section.
    Then the column menu has the sections "COLUMNS"
    And the actions of the column "Status" are "Pin left, Pin right"
    When I pin the column "Status" to the left
    Then the column menu has the sections "PINNED LEFT, COLUMNS"
    # A pinned column offers the way back, and the other edge.
    And the actions of the column "Status" are "Unpin, Pin right"
    When I pin the column "Name" to the right
    Then the column menu has the sections "PINNED LEFT, COLUMNS, PINNED RIGHT"
    And the actions of the column "Name" are "Unpin, Pin left"
    # Pinned left stands first, pinned right last — in the table and in the menu.
    Then the table has the columns "Status, #, Reference, Inbound, Started, Runner, Branch, Duration, Name"
    And the column "Status" is pinned to the left
    And the column "Name" is pinned to the right
    And the column "#" is not pinned
    And the column menu lists "Status, #, Reference, Inbound, Started, Runner, Branch, Duration, Name"
    And the column menu shows "Status" pinned to the left
    And the column menu shows "Name" pinned to the right
    # Kept like the rest of the column state: a reload opens the table the same way.
    When I open the "infinite-list" page
    Then the table has the columns "Status, #, Reference, Inbound, Started, Runner, Branch, Duration, Name"
    And the column "Status" is pinned to the left
    When I open the column menu of the table
    And I unpin the column "Status"
    Then the table has the columns "#, Reference, Inbound, Status, Started, Runner, Branch, Duration, Name"
    And the column "Status" is not pinned
    # The last column pinned left was let go: its section is gone.
    And the column menu has the sections "COLUMNS, PINNED RIGHT"
    # From one edge to the other in one step.
    When I pin the column "Name" to the left
    Then the column menu has the sections "PINNED LEFT, COLUMNS"
    And the column "Name" is pinned to the left
    When I reset the columns of the table
    Then the table has the columns "#, Name, Reference, Inbound, Status, Started, Runner, Branch, Duration"
    And the column "Name" is not pinned

  Scenario: A column dragged beside a pinned one is pinned with it
    Given I open the "infinite-list" page
    When I open the column menu of the table
    And I pin the column "Status" to the left
    And I drag the column "Runner" above the column "Status"
    Then the column menu shows "Runner, Status" pinned to the left
    And the column "Runner" is pinned to the left
    And the table has the columns "Runner, Status, #, Name, Reference, Inbound, Started, Branch, Duration"
