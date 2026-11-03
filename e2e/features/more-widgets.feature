Feature: More widgets
  Six more of what every UI library has, each a standard contract with an
  antd implementation: a switch, a slider, a radio group, a rating, a
  statistic and a divider. The controls store what the user picks at their
  port with nothing wired (their `changed` writes back by default); the
  statistic and the divider only show.

  Scenario: Every new widget has a live preview in the palette
    Given I open the "builder" page
    When I open the widget palette
    Then the preview of "antd-switch" reads "Notifications"
    And the preview of "antd-slider" reads "Volume"
    And the preview of "antd-radio-group" reads "Priority"
    And the preview of "antd-rate" reads "Quality"
    And the preview of "antd-statistic" reads "Active runs"
    And the preview of "antd-divider" reads "Section"

  Scenario: A button has a variant: primary by default, or secondary, dashed, danger
    Given I open the "overview" page
    Then the button "Reset counter" has the variant "danger"
    Given I open the "builder" page
    When I choose the "antd-button" widget
    And I set the setting "label" to "Clear"
    And I set the setting "variant" to "dashed"
    And I set the reaction for "clicked" to call "log-event"
    And I add the widget
    Then the button "Clear" has the variant "dashed"

  Scenario: A switch stores on or off
    Given I open the "builder" page
    When I choose the "antd-switch" widget
    And I set the "input" port "checked" to "form.notify"
    And I add the widget
    Then the switch is off
    When I flip the switch
    Then the switch is on
    And the state JSON contains '"notify": true'

  Scenario: A radio group stores the option picked
    Given I open the "builder" page
    When I choose the "antd-radio-group" widget
    And I set the "input" port "value" to "form.priority"
    And I add the widget
    Then the radio group holds ""
    When I pick "High" in the radio group
    Then the radio group holds "high"
    And the state JSON contains '"priority": "high"'

  Scenario: A rating stores the stars picked
    Given I open the "builder" page
    When I choose the "antd-rate" widget
    And I set the "input" port "value" to "form.stars"
    And I add the widget
    Then the rating is 0
    When I rate 4 stars
    Then the rating is 4
    And the state JSON contains '"stars": 4'

  Scenario: A slider stores the number it is moved to
    Given I open the "builder" page
    When I choose the "antd-slider" widget
    And I set the "input" port "value" to "form.volume"
    And I set the setting "step" to "10"
    And I add the widget
    Then the slider holds 0
    When I nudge the slider up 3 times
    Then the slider holds 30
    And the state JSON contains '"volume": 30'

  Scenario: A statistic shows a stored number with its title, and a divider its title on the line
    Given I open the "builder" page
    And the store holds at "form.total":
      """
      1128
      """
    When I choose the "antd-statistic" widget
    And I set the "input" port "value" to "form.total"
    And I set the setting "title" to "Runs today"
    And I add the widget
    And I choose the "antd-divider" widget
    And I set the setting "text" to "Details"
    And I add the widget
    Then the statistic reads "Runs today" and "1,128"
    And the divider reads "Details"
