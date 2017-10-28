/* eslint-disable import/prefer-default-export */
/* eslint-disable react/no-multi-comp */

import React, { Component } from 'react'
import { join } from 'path-extra'
import { connect } from 'react-redux'
import _, { sortBy, isEqual, map, values, keyBy, get, last, range } from 'lodash'
import FontAwesome from 'react-fontawesome'
import { createSelector } from 'reselect'
import memoize from 'fast-memoize'

import { FormControl, FormGroup, ControlLabel, Grid, Col, Table, InputGroup, Button, DropdownButton, MenuItem } from 'react-bootstrap'

import {
  configLayoutSelector,
  configDoubleTabbedSelector,
  fleetShipsIdSelectorFactory,
  shipDataSelectorFactory,
  constSelector,
  shipsSelector,
  stateSelector,
} from 'views/utils/selectors'

const { i18n } = window
const __ = i18n['poi-plugin-exp-calc'].__.bind(i18n['poi-plugin-exp-calc'])

const MAX_LEVEL = 165

let successFlag = false

const exp = [
  0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500,
  5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000,
  21000, 23100, 25300, 27600, 30000, 32500, 35100, 37800, 40600, 43500,
  46500, 49600, 52800, 56100, 59500, 63000, 66600, 70300, 74100, 78000,
  82000, 86100, 90300, 94600, 99000, 103500, 108100, 112800, 117600, 122500,
  127500, 132700, 138100, 143700, 149500, 155500, 161700, 168100, 174700, 181500,
  188500, 195800, 203400, 211300, 219500, 228000, 236800, 245900, 255300, 265000,
  275000, 285400, 296200, 307400, 319000, 331000, 343400, 356200, 369400, 383000,
  397000, 411500, 426500, 442000, 458000, 474500, 491500, 509000, 527000, 545500,
  564500, 584500, 606500, 631500, 661500, 701500, 761500, 851500, 1000000, 1000000,
  1010000, 1011000, 1013000, 1016000, 1020000, 1025000, 1031000, 1038000, 1046000, 1055000,
  1065000, 1077000, 1091000, 1107000, 1125000, 1145000, 1168000, 1194000, 1223000, 1255000,
  1290000, 1329000, 1372000, 1419000, 1470000, 1525000, 1584000, 1647000, 1714000, 1785000,
  1860000, 1940000, 2025000, 2115000, 2210000, 2310000, 2415000, 2525000, 2640000, 2760000,
  2887000, 3021000, 3162000, 3310000, 3465000, 3628000, 3799000, 3978000, 4165000, 4360000,
  4564000, 4777000, 4999000, 5230000, 5470000, 5720000, 5780000, 5860000, 5970000, 6120000,
  6320000, 6580000, 6910000, 7320000, 7820000,
]

exp.unshift(exp[0])
exp.push(exp[exp.length - 1])

const expMap = [
  __('Customized'),
  '1-1 鎮守府正面海域', '1-2 南西諸島沖', '1-3 製油所地帯沿岸', '1-4 南西諸島防衛線', '1-5 [Extra] 鎮守府近海', '1-6 [Extra Operation] 鎮守府近海航路',
  '2-1 カムラン半島', '2-2 バシー島沖', '2-3 東部オリョール海', '2-4 沖ノ島海域', '2-5 [Extra] 沖ノ島沖',
  '3-1 モーレイ海', '3-2 キス島沖', '3-3 アルフォンシーノ方面', '3-4 北方海域全域', '3-5 [Extra] 北方AL海域',
  '4-1 ジャム島攻略作戦', '4-2 カレー洋制圧戦', '4-3 リランカ島空襲', '4-4 カスガダマ沖海戦', '4-5 [Extra] カレー洋リランカ島沖',
  '5-1 南方海域前面', '5-2 珊瑚諸島沖', '5-3 サブ島沖海域', '5-4 サーモン海域', '5-5 [Extra] サーモン海域北方',
  '6-1 中部海域哨戒線', '6-2 MS諸島沖', '6-3 グアノ環礁沖海域',
]

// base exp for maps
const expValue = [
  -100,
  30, 50, 80, 100, 150, 50,
  120, 150, 200, 300, 250,
  310, 320, 330, 350, 400,
  310, 320, 330, 340, 200,
  360, 380, 400, 420, 450,
  380, 420, 100,
]

const expMap2 = {
  11: 30,
  12: 50,
  13: 80,
  14: 100,
  15: 150,
  16: 50,
  21: 120,
  22: 150,
  23: 200,
  24: 300,
  25: 250,
  31: 310,
  32: 320,
  33: 330,
  34: 350,
  35: 400,
  41: 310,
  42: 320,
  43: 330,
  44: 340,
  45: 200,
  51: 360,
  52: 380,
  53: 400,
  54: 420,
  55: 450,
  61: 380,
  62: 420,
}

// battle result
const expLevel = [
  'S', 'A', 'B', 'C', 'D',
]

// exp effect for battle results
const expPercent = [
  1.2, 1.0, 1.0, 0.8, 0.7,
]

// bonus for training crusier as flagship
const bonusExpScaleFlagship = [
  [5, 8, 11, 15, 20],
  [10, 13, 16, 20, 25],
]

// bonus for training crusier as flagship
const bonusExpScaleNonFlagship = [
  [3, 5, 7, 10, 15],
  [4, 6, 8, 12, 17.5],
]

const getBonusType = (lv) => {
  if (lv < 10) {
    return 0
  }
  if (lv >= 10 && lv < 30) {
    return 1
  }
  if (lv >= 30 && lv < 60) {
    return 2
  }
  if (lv >= 60 && lv < 100) {
    return 3
  }
  return 4
}

const remodelLvSelector = createSelector([
  constSelector,
], ({ $ships = {} }) => _($ships)
  .filter(ship => typeof ship.api_aftershipid !== 'undefined') // filter enemies
  .map((ship) => {
    let remodelLvs = [ship.api_afterlv]
    let nextShipId = +ship.api_aftershipid
    while (nextShipId !== 0 && last(remodelLvs) < $ships[nextShipId].api_afterlv) {
      remodelLvs = [...remodelLvs, $ships[nextShipId].api_afterlv]
      nextShipId = +(get($ships, [nextShipId, 'api_aftershipid'], 0))
    }
    remodelLvs = last(remodelLvs) < 100
      ? [...remodelLvs, 99, MAX_LEVEL]
      : [...remodelLvs, MAX_LEVEL]
    return [ship.api_id, remodelLvs]
  })
  .fromPairs()
  .value())

const expInfoSelectorFactory = memoize(shipId =>
  createSelector(
    [shipDataSelectorFactory(shipId)],
    ([ship, $ship] = []) =>
      typeof ship !== 'undefined' && typeof $ship !== 'undefined' ?
        {
          ...$ship,
          ...ship,
        }
        : undefined
  ))

const shipExpDataSelector = createSelector(
  [
    stateSelector,
    shipsSelector,
  ], (state, ships) => _(ships)
    .mapValues(ship => expInfoSelectorFactory(ship.api_id)(state))
    .value()
)

const mapDataSelctor = createSelector(
  [
    constSelector,
  ], ({ $maps = {} } = {}) => $maps
)

const nullShip = { api_id: 0, api_name: __('NULL') }

const expClass = [
  'Basic',
  'Flagship',
  'MVP',
  'MVP and flagship',
]

const ExpCalc = connect(
  state => ({
    horizontal: configLayoutSelector(state),
    doubleTabbed: configDoubleTabbedSelector(state),
    ships: shipExpDataSelector(state),
    fleets: [...Array(4).keys()].map(fleetId => fleetShipsIdSelectorFactory(fleetId)(state)),
    remodelLvs: remodelLvSelector(state),
    maps: mapDataSelctor(state),
  }),
)(class ExpCalc extends Component {
  state = {
    shipId: 0,
    mspId: 11,
    result: 0, // 'S'
    startLevel: 0,
    lockGoal: false,
  }

  handleCurrentLevelChange = () => {
    console.log(arguments)
  }

  handleMapChange = (value) => {
    this.setState({
      mapId: value,
    })
  }

  render() {
    const {
      shipId, startLevel, goalLevel, lockGoal, mapId, result,
    } = this.state
    const {
      horizontal, doubleTabbed, ships, maps,
    } = this.props

    const nextExp = get(ships, [shipId, 'api_exp', 1], 0)
    const totalExp = exp[goalLevel] - get(ships, [shipId, 'api_exp', 0], 0)

    const mapExp = expMap2[mapId] || 100
    const mapPercent = expPercent[result]

    const baseExp = mapExp * mapPercent
    const baseCount = totalExp / baseExp
    const counts = [
      Math.ceil(baseCount),
      Math.ceil(baseCount / 1.5),
      Math.ceil(baseCount / 2.0),
      Math.ceil(baseCount / 3.0),
    ]
    const perBattle = [
      baseExp,
      baseExp * 1.5,
      baseExp * 2.0,
      baseExp * 3.0,
    ]

    const rowSize = (horizontal === 'horizontal' || doubleTabbed) ? 6 : 3
    const shipRowSize = (horizontal === 'horizontal' || doubleTabbed) ? 12 : 5
    const mapRowSize = (horizontal === 'horizontal' || doubleTabbed) ? 7 : 4
    const rankRowSize = (horizontal === 'horizontal' || doubleTabbed) ? 5 : 3
    return (
      <div id="exp-calc" className="exp-calc">
        <link rel="stylesheet" href={join(__dirname, 'assets', 'exp-calc.css')} />
        <Grid>
          <Col xs={shipRowSize}>
            <FormGroup>
              <ControlLabel>{__('Ship')}</ControlLabel>
              <InputGroup>
                <FormControl
                  componentClass="select"
                  value={shipId}
                  onChange={this.handleShipChange}
                >
                  <option value={nullShip.api_id}>{nullShip.api_name}</option>
                  {
                    _(ships)
                    .map(ship => (
                      <option value={ship.api_id} key={ship.api_id}>
                        Lv.{ship.api_lv} - {window.i18n.resources.__(ship.api_name || '')}
                      </option>
                    ))
                    .value()
                  }
                </FormControl>
              </InputGroup>
            </FormGroup>
          </Col>
          <Col xs={mapRowSize}>
            <FormGroup>
              <ControlLabel>{__('Map')}</ControlLabel>
              <FormControl
                componentClass="select"
                onChange={this.handleMapChange}
              >
                {
                  _(maps)
                  .filter(world => world.api_id < 63)
                  .map(world => (
                    <option
                      value={world.api_id}
                      key={world.api_id}
                    >
                      {`${world.api_maparea_id}-${world.api_no} ${world.api_no > 4 ? '[EO] ' : ''}${world.api_name}`}
                    </option>
                  ))
                  .value()
                }
              </FormControl>
            </FormGroup>
          </Col>
          <Col xs={rankRowSize}>
            <FormGroup>
              <ControlLabel>
                {__('Result')}
              </ControlLabel>
              <FormControl
                componentClass="select"
                onChange={this.handleExpLevelChange}
              >
                {
                  range(expLevel.length).map(idx => (
                    <option
                      value={expPercent[idx]}
                      key={idx}
                    >
                      {expLevel[idx]}
                    </option>
                  ))
                }
              </FormControl>
            </FormGroup>

          </Col>
          <Col xs={rowSize}>
            <FormGroup>
              <ControlLabel>{__('Starting level')}</ControlLabel>
              <FormControl
                type="number"
                value={startLevel || get(ships, [shipId, 'api_level'], 1)}
                onChange={this.handleCurrentLevelChange}
              />
            </FormGroup>
          </Col>
          <Col xs={rowSize}>
            <FormGroup>
              <ControlLabel>{__('To next')}</ControlLabel>
              <FormControl
                type="number"
                value={nextExp}
                onChange={this.handleNextExpChange}
              />
            </FormGroup>
          </Col>
          <Col xs={rowSize}>
            <FormGroup>
              <ControlLabel>{__('Goal')}</ControlLabel>
              <InputGroup>
                <FormControl
                  type="number"
                  value={goalLevel}
                  onChange={this.handleGoalLevelChange}
                />
                <InputGroup.Button>
                  <Button
                    bsStyle={lockGoal ? 'warning' : 'link'}
                    onClick={this.handleLock}
                    title={lockGoal ? __('Unlock') : __('Lock the goal level')}
                  >
                    <FontAwesome name={lockGoal ? 'lock' : 'unlock'} />
                  </Button>
                </InputGroup.Button>
              </InputGroup>
            </FormGroup>
          </Col>
          <Col xs={rowSize}>
            <FormGroup>
              <ControlLabel>{__('Total exp')}</ControlLabel>
              <FormControl
                type="number"
                value={totalExp}
                readOnly
              />

            </FormGroup>
          </Col>
        </Grid>
        <Table>
          <tbody>
            <tr key={0}>
              <td />
              <td>{__('Per attack')}</td>
              <td>{__('Remainder')}</td>
            </tr>
            {
              range(expClass.length).map(idx => (
                <tr key={idx}>
                  <td>{__(expClass[idx])}</td>
                  <td>{counts[idx]}</td>
                  <td>{perBattle[idx]}</td>
                </tr>
                ))
            }
          </tbody>
        </Table>
      </div>
    )
  }
})

export const reactClass = connect((state) => {
  const ships = get(state, 'info.ships', {})

  return ({
    horizontal: configLayoutSelector(state),
    doubleTabbed: configDoubleTabbedSelector(state),
    ships: keyBy(Object.keys(ships).map(shipId => expInfoSelectorFactory(parseInt(shipId))(state)), 'api_id'),
    fleets: [...Array(4).keys()].map(fleetId => fleetShipsIdSelectorFactory(fleetId)(state)),
    remodelLvs: remodelLvSelector(state),
  })
})(class PoiPluginExpCalc extends Component {
  constructor(props) {
    super(props)
    this.state = {
      lastShipId: 0,
      currentLevel: 1,
      nextExp: 100,
      goalLevel: 99,
      mapValue: -100,
      userDefinedValue: -100,
      mapPercent: 1.2,
      totalExp: 1000000,
      lockGoal: false,
      expSecond: [
        Math.ceil(1000000 / 100),
      ],
      perExp: [
        100,
      ],
      expType: [
        __('Customized'),
      ],

      message: null,
    }
  }

  componentDidMount = () => {
    window.addEventListener('game.response', this.handleResponse)
  }

  componentWillReceiveProps(nextProps) {
    // if the goalLevel not lock, update the component
    if (this.state.lastShipId) {
      const { ships } = nextProps
      const { currentLevel, nextExp, goalLevel } = this.state

      let [_currentLevel, _nextExp, _goalLevel] = this.getExpInfo(this.state.lastShipId, ships)
      _goalLevel = this.state.lockGoal ? goalLevel : _goalLevel

      if (!isEqual([_currentLevel, _nextExp, _goalLevel], [currentLevel, nextExp, goalLevel])) { // prevent changes from other props
        this.handleExpChange(_currentLevel, _nextExp, _goalLevel, this.state.mapValue, this.state.mapPercent)
      }
    }
  }

  componentDidUpdate = () => {
    if (successFlag) {
      successFlag = false
      window.success(this.state.message, {
        priority: 2,
        stickyFor: 1000,
      })
    }
  }

  componentWillUnmount = () => {
    window.removeEventListener('game.response', this.handleResponse)
  }

  getExpInfo(shipId, ships = this.props.ships) {
    const {
      api_lv, api_afterlv, api_ship_id, api_exp,
    } = (ships[shipId] || {})
    if (shipId <= 0) {
      return [1, 100, 99]
    }
    let goalLevel = 99
    if (api_lv > 99) {
      goalLevel = MAX_LEVEL
    } else if (api_afterlv != 0) {
      const { remodelLvs } = this.props
      const remodelLv = remodelLvs[api_ship_id] || []
      for (const lv of remodelLv) {
        if (lv > api_lv) {
          goalLevel = lv
          break
        }
      }
    }
    return [api_lv, (api_exp || [])[1], goalLevel]
  }

  updateShip = (shipId = this.state.lastShipId) => {
    const [_currentLevel, _nextExp, _goalLevel] = this.getExpInfo(shipId)
    this.handleExpChange(_currentLevel, _nextExp, _goalLevel, this.state.mapValue, this.state.mapPercent)
  }

  handleShipChange = (e) => {
    if (e && e.target && e.target.value != null) {
      if (e.target.value != this.state.lastShipId) {
        this.setState({ lastShipId: e.target.value, message: null })
      }
      const [currentLevel, nextExp, goalLevel] = this.getExpInfo(e.target.value)
      this.handleExpChange(currentLevel, nextExp, goalLevel, this.state.mapValue, this.state.mapPercent)
    }
  }

  handleExpChange = (_currentLevel = 1, _nextExp = 100, _goalLevel = 99, _mapValue, _mapPercent) => {
    const currentLevel = parseInt(_currentLevel)
    const nextExp = parseInt(_nextExp)
    const goalLevel = parseInt(_goalLevel)
    const mapValue = parseInt(_mapValue)
    const mapPercent = parseFloat(_mapPercent)
    const totalExp = exp[goalLevel] - exp[currentLevel + 1] + nextExp

    let userDefinedValue = this.state.userDefinedValue
    let noneType
    let noneRank
    let expSecond
    let expType
    let perExp
    const message = null
    if (mapValue > 0) { // represented value
      noneType = totalExp / mapValue / mapPercent
      noneRank = mapValue * mapPercent
      expSecond = [
        Math.ceil(noneType),
        Math.ceil(noneType / 1.5),
        Math.ceil(noneType / 2.0),
        Math.ceil(noneType / 3.0),
      ]
      expType = [
        __('Basic'),
        __('Flagship'),
        __('MVP'),
        __('MVP and flagship'),
      ]
      perExp = [
        noneRank,
        noneRank * 1.5,
        noneRank * 2.0,
        noneRank * 3.0,
      ]
    } else { // Customized value
      userDefinedValue = mapValue
      noneType = -totalExp / mapValue
      noneRank = -mapValue
      expSecond = [
        Math.ceil(noneType),
      ]
      perExp = [
        noneRank,
      ]
      expType = [
        __('Customized'),
      ]
    }
    this.setState({
      currentLevel,
      nextExp,
      goalLevel,
      mapValue,
      totalExp,
      expSecond,
      expType,
      perExp,
      message,
      userDefinedValue,
      mapPercent,
    })
  }
  handleResponse = (e) => {
    const { path, body } = e.detail
    if (path == '/kcsapi/api_req_member/get_practice_enemyinfo') {
      const enemyShips = body.api_deck.api_ships
      let baseExp = exp[enemyShips[0].api_level] / 100 + exp[enemyShips[1].api_level != null ? enemyShips[1].api_level : 0] / 300
      baseExp = baseExp <= 500 ? baseExp : 500 + Math.floor(Math.sqrt(baseExp - 500))
      const bonusScale = {}
      const bonusStr = []
      let bonusFlag = false
      let message = null
      const { fleets, ships } = this.props
      for (const index in fleets) {
        const fleetShips = fleets[index]
        if (typeof fleetShips === 'undefined') continue
        let flagshipFlag = false
        let trainingLv = 0
        let trainingCount = 0
        for (const idx in fleetShips) {
          const shipId = fleetShips[idx]
          const ship = ships[shipId]
          if (ship.api_stype == 21) {
            trainingCount += 1
            if (!flagshipFlag) {
              if (ship.api_lv > trainingLv) {
                trainingLv = ship.api_lv
              }
            }
            if (idx == 0) {
              flagshipFlag = true
            }
          }
        }
        if (trainingCount >= 2) {
          trainingCount = 2
        }
        if (trainingCount != 0) {
          bonusFlag = true
          const bonusType = getBonusType(trainingLv)
          if (flagshipFlag) {
            bonusScale[index] = bonusExpScaleFlagship[trainingCount - 1][bonusType]
          } else {
            bonusScale[index] = bonusExpScaleNonFlagship[trainingCount - 1][bonusType]
          }
          bonusStr.push(`${bonusScale[index]}%`)
        } else {
          bonusScale[index] = 0
          bonusStr.push('0%')
        }
      }
      message = `${__('Exp')}: [A/B] ${Math.floor(baseExp)}, [S] ${Math.floor(baseExp * 1.2)}`
      if (bonusFlag) {
        message = `${message}, ${__('+ %s for each fleet', bonusStr.join(' '))}`
      }
      if (message != null) {
        successFlag = true
        this.setState({ message })
      }
    }
  }
  handleCurrentLevelChange = (e) => {
    this.handleExpChange(Math.max(1, e.target.value), this.state.nextExp, this.state.goalLevel, this.state.mapValue, this.state.mapPercent)
  }
  handleNextExpChange = (e) => {
    this.handleExpChange(this.state.currentLevel, e.target.value, this.state.goalLevel, this.state.mapValue, this.state.mapPercent)
  }
  handleGoalLevelChange = (e) => {
    this.handleExpChange(this.state.currentLevel, this.state.nextExp, Math.max(1, e.target.value), this.state.mapValue, this.state.mapPercent)
  }
  handleExpMapChange = (e) => {
    this.handleExpChange(this.state.currentLevel, this.state.nextExp, this.state.goalLevel, e.target.value, this.state.mapPercent)
  }
  handleExpLevelChange = (e) => {
    this.handleExpChange(this.state.currentLevel, this.state.nextExp, this.state.goalLevel, this.state.mapValue, e.target.value)
  }
  handleUserDefinedExpChange = (e) => {
    this.handleExpChange(this.state.currentLevel, this.state.nextExp, this.state.goalLevel, -Math.max(1, e.target.value), this.state.mapPercent)
  }

  handleShipChange = (e) => {
    if (e && e.target.value != this.state.lastShipId) {
      this.setState({ lastShipId: e.target.value })
      this.updateShip(e.target.value)
    }
  }

  handleLock = (e) => {
    if (this.state.lockGoal) { // need to unlock and update state
      this.setState({ lockGoal: !this.state.lockGoal })
      this.updateShip()
    } else {
      this.setState({ lockGoal: !this.state.lockGoal })
    }
  }

  handleSetFirstFleet = (eventKey, e) => {
    if (eventKey && eventKey != this.state.lastShipId) {
      this.setState({ lastShipId: eventKey })
      this.updateShip(eventKey)
    }
  }

  render() {
    const { horizontal, doubleTabbed, fleets } = this.props
    const row = (horizontal == 'horizontal' || doubleTabbed) ? 6 : 3
    const shipRowSize = (horizontal == 'horizontal' || doubleTabbed) ? 12 : 5
    const mapRowSize = (horizontal == 'horizontal' || doubleTabbed) ? 7 : 4
    const rankRowSize = (horizontal == 'horizontal' || doubleTabbed) ? 5 : 3
    const nullShip = { api_id: 0, text: __('NULL') }
    const _ships = this.props.ships
    let ships = values(_ships)
    ships = sortBy(ships, [e => -e.api_lv, e => get(e, 'api_exp.1', 0)])
    const firstFleet = map(fleets[0], shipId => _ships[shipId])
    return [
      <ExpCalc />,
      <div id="ExpCalcView" className="ExpCalcView">
        <link rel="stylesheet" href={join(__dirname, 'assets', 'exp-calc.css')} />
        <Grid>
          <Col xs={shipRowSize}>
            <FormGroup>
              <ControlLabel>{__('Ship')}</ControlLabel>
              <InputGroup>
                <FormControl
                  componentClass="select"
                  value={this.state.lastShipId}
                  onChange={this.handleShipChange}
                >
                  <option value={nullShip.api_id}>{nullShip.text}</option>
                  { ships &&
                    ships.map(ship =>
                      (<option value={ship.api_id} key={ship.api_id}>
                        Lv.{ship.api_lv} - {window.i18n.resources.__(ship.api_name || '')}
                       </option>))
                  }
                </FormControl>
                <DropdownButton
                  componentClass={InputGroup.Button}
                  bsStyle="link"
                  title={__('First fleet')}
                  id="first-fleet-select"
                  onSelect={this.handleSetFirstFleet}
                >
                  {
                    firstFleet &&
                    map(firstFleet, ship => typeof ship !== undefined ?
                      <MenuItem
                        key={ship.api_id}
                        eventKey={ship.api_id}
                      >
                        {window.i18n.resources.__(ship.api_name || '')}
                      </MenuItem>
                      :
                      '')
                  }
                </DropdownButton>
              </InputGroup>
            </FormGroup>
          </Col>
          <Col xs={mapRowSize}>
            <FormGroup>
              <ControlLabel>{__('Map')}</ControlLabel>
              <FormControl
                componentClass="select"
                onChange={this.handleExpMapChange}
              >
                {
                  Array.from({ length: expMap.length }, (v, k) => k).map(idx =>
                    (<option
                      value={expValue[idx] > 0 ? expValue[idx] : this.state.userDefinedValue}
                      key={idx}
                    >
                      {expMap[idx]}
                     </option>))
                }
              </FormControl>
            </FormGroup>
          </Col>
          <Col xs={rankRowSize}>
            <FormGroup>
              <ControlLabel>
                {this.state.mapValue >= 0 ? __('Result') : __('Customized Exp')}
              </ControlLabel>
              {
                this.state.mapValue >= 0 ?
                  <FormControl
                    componentClass="select"
                    onChange={this.handleExpLevelChange}
                  >
                    {
                      Array.from({ length: expLevel.length }, (v, k) => k).map(idx =>
                        (<option
                          value={expPercent[idx]}
                          key={idx}
                        >
                          {expLevel[idx]}
                         </option>))
                    }
                  </FormControl>
                : // Customized exp
                  <FormControl
                    type="number"
                    value={-this.state.userDefinedValue}
                    onChange={this.handleUserDefinedExpChange}
                  />
              }
            </FormGroup>


          </Col>
          <Col xs={row}>
            <FormGroup>
              <ControlLabel>{__('Actual level')}</ControlLabel>
              <FormControl
                type="number"
                value={this.state.currentLevel}
                onChange={this.handleCurrentLevelChange}
              />
            </FormGroup>
          </Col>
          <Col xs={row}>
            <FormGroup>
              <ControlLabel>{__('To next')}</ControlLabel>
              <FormControl
                type="number"
                value={this.state.nextExp}
                onChange={this.handleNextExpChange}
              />
            </FormGroup>
          </Col>
          <Col xs={row}>
            <FormGroup>
              <ControlLabel>{__('Goal')}</ControlLabel>
              <InputGroup>
                <FormControl
                  type="number"
                  value={this.state.goalLevel}
                  onChange={this.handleGoalLevelChange}
                />
                <InputGroup.Button>
                  <Button
                    bsStyle={this.state.lockGoal ? 'warning' : 'link'}
                    onClick={this.handleLock}
                    title={this.state.lockGoal ? __('Unlock') : __('Lock the goal level')}
                  >
                    <FontAwesome name={this.state.lockGoal ? 'lock' : 'unlock'} />
                  </Button>
                </InputGroup.Button>
              </InputGroup>
            </FormGroup>
          </Col>
          <Col xs={row}>
            <FormGroup>
              <ControlLabel>{__('Total exp')}</ControlLabel>
              <FormControl
                type="number"
                value={this.state.totalExp}
                readOnly
              />

            </FormGroup>
          </Col>
        </Grid>
        <Table>
          <tbody>
            <tr key={0}>
              <td />
              <td>{__('Per attack')}</td>
              <td>{__('Remainder')}</td>
            </tr>
            {
              Array.from({ length: this.state.expType.length }, (v, k) => k).map(idx =>
                (<tr key={idx}>
                  <td>{this.state.expType[idx]}</td>
                  <td>{this.state.perExp[idx]}</td>
                  <td>{this.state.expSecond[idx]}</td>
                 </tr>))
            }
          </tbody>
        </Table>
      </div>
    ]
  }
})
