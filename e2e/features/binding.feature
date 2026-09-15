Feature: Store binding
  Widgets read and observe data exclusively through the Store, and write it
  only through declared reactions; a write is observed by every widget bound
  to that path, including widgets bound to an ANCESTOR of the written path.

  Scenario: Widgets communicate through the store
    Given I open the "demo" page
    Then the echo widget at "demo.counter" shows "0"
    When I click the counter 3 times
    Then the echo widget at "demo.counter" shows "3"

  Scenario: A write notifies widgets bound to a parent path
    Given I open the "demo" page
    Then the echo widget at "demo" shows '{"counter":0}'
    When I click the counter 2 times
    Then the echo widget at "demo" shows '{"counter":2}'

  Scenario: The runs table renders rows from the store by stable id
    Given I open the "demo" page
    Then the runs table has 2 rows
    And the runs table row "123456" shows "Failed" for "status.state"
    And the runs table row "123457" shows "Success" for "status.state"
