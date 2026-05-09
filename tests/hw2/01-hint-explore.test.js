import { describe, expect, it } from 'vitest'
import { createGame, createGameFromJSON, createSudoku, DomainValidationError } from '../../src/domain/index.js'

function makePuzzle() {
  return [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ]
}

function makeOneMovePuzzle() {
  return [
    [1, 2, 3, 4, 5, 6, 7, 8, 0],
    [4, 5, 6, 7, 8, 9, 1, 2, 3],
    [7, 8, 9, 1, 2, 3, 4, 5, 6],
    [2, 3, 4, 5, 6, 7, 8, 9, 1],
    [5, 6, 7, 8, 9, 1, 2, 3, 4],
    [8, 9, 1, 2, 3, 4, 5, 6, 7],
    [3, 4, 5, 6, 7, 8, 9, 1, 2],
    [6, 7, 8, 9, 1, 2, 3, 4, 5],
    [9, 1, 2, 3, 4, 5, 6, 7, 8],
  ]
}

function makeEmptyPuzzle() {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

function makeExploreJSON({ currentGrid, failedBoardStates = [], failedExplorePaths = [], failedValues = [] }) {
	const empty = makeEmptyPuzzle()
	const snapshot = { grid: empty, givens: empty }
	const key = `${JSON.stringify(snapshot)}|0,0`

  return {
    sudoku: snapshot,
    history: { undo: [], redo: [] },
		explore: {
			active: true,
			failedBoardStates,
			failedExplorePaths,
			decisionPoints: [{
        key,
        row: 0,
        col: 0,
        candidates: [1, 2],
        triedValues: [1],
        failedValues,
        snapshot,
      }],
      session: {
        origin: snapshot,
        current: { grid: currentGrid, givens: empty },
        undo: [],
        redo: [],
        path: [{ decisionKey: key, value: 1 }],
        focusedDecisionKey: key,
      },
    },
	}
}

function makeTwoStepExploreJSON({ failedExplorePaths = [] } = {}) {
  const empty = makeEmptyPuzzle()
  const snapshot = { grid: empty, givens: empty }
  const afterFirstGrid = makeEmptyPuzzle()
  afterFirstGrid[0][0] = 1
  const firstKey = `${JSON.stringify(snapshot)}|0,0`
  const secondKey = `${JSON.stringify({ grid: afterFirstGrid, givens: empty })}|0,1`

  return {
    sudoku: snapshot,
    history: { undo: [], redo: [] },
    explore: {
      active: true,
      failedExplorePaths,
      decisionPoints: [{
        key: firstKey,
        row: 0,
        col: 0,
        candidates: [1, 2],
        triedValues: [1],
        failedValues: [1],
        snapshot,
      }, {
        key: secondKey,
        row: 0,
        col: 1,
        candidates: [2, 3],
        triedValues: [2],
        failedValues: [2],
        snapshot: { grid: afterFirstGrid, givens: empty },
      }],
      session: {
        origin: snapshot,
        current: { grid: afterFirstGrid, givens: empty },
        undo: [],
        redo: [],
        path: [{ decisionKey: firstKey, value: 1 }],
        focusedDecisionKey: firstKey,
      },
    },
  }
}

function deadEndMovesInOrderA() {
  return [
    { row: 0, col: 1, value: 1 },
    { row: 0, col: 2, value: 2 },
    { row: 0, col: 3, value: 3 },
    { row: 0, col: 4, value: 4 },
    { row: 0, col: 5, value: 5 },
    { row: 0, col: 6, value: 6 },
    { row: 0, col: 7, value: 7 },
    { row: 0, col: 8, value: 8 },
    { row: 1, col: 0, value: 9 },
  ]
}

function deadEndMovesInOrderB() {
  return [
    { row: 1, col: 0, value: 9 },
    { row: 0, col: 8, value: 8 },
    { row: 0, col: 7, value: 7 },
    { row: 0, col: 6, value: 6 },
    { row: 0, col: 5, value: 5 },
    { row: 0, col: 4, value: 4 },
    { row: 0, col: 3, value: 3 },
    { row: 0, col: 2, value: 2 },
    { row: 0, col: 1, value: 1 },
  ]
}

function applyMoves(game, moves) {
  for (const move of moves) {
    game.exploreGuess(move)
  }
}

describe('HW2 hint and explore behavior', () => {
  it('returns legal candidates for an empty cell', () => {
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.getCandidates(0, 2)).toEqual([1, 2, 4])
  })

  it('keeps hint detail levels aligned with their field contracts', () => {
    const sudoku = createSudoku(makePuzzle())

    const l1 = sudoku.getNextHint({ detailLevel: 1 })
    const l2 = sudoku.getNextHint({ detailLevel: 2 })
    const l3 = sudoku.getNextHint({ detailLevel: 3 })

		expect(l1).not.toHaveProperty('candidateCount')
		expect(l1).not.toHaveProperty('candidates')
		expect(l1).not.toHaveProperty('type')
		expect(l1).not.toHaveProperty('kind')
		expect(l1).not.toHaveProperty('canApplyDirectly')
		expect(l1).not.toHaveProperty('reason')
		expect(l2).toHaveProperty('candidateCount')
		expect(l2).not.toHaveProperty('candidates')
		expect(l2).not.toHaveProperty('type')
		expect(l2).not.toHaveProperty('kind')
		expect(l2).not.toHaveProperty('canApplyDirectly')
		expect(l2).not.toHaveProperty('reason')
		expect(l3).toHaveProperty('candidateCount')
		expect(l3).toHaveProperty('candidates')
	})

  it('applies a direct single-candidate hint through game history', () => {
    const game = createGame({ sudoku: createSudoku(makeOneMovePuzzle()) })

    const result = game.applyHint()

    expect(result.applied).toBe(true)
    expect(result.hint).toMatchObject({ row: 0, col: 8, suggestedValue: 9 })
    expect(game.isWon()).toBe(true)
    expect(game.canUndo()).toBe(true)
  })

  it('tracks explore decision points and can return to the branch snapshot', () => {
    const game = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })

    expect(game.enterExplore()).toBe(true)
    expect(game.exploreGuess({ row: 0, col: 0, value: 1 })).toBe(true)
    expect(game.getCurrentDecisionPoint()).toMatchObject({
      row: 0,
      col: 0,
      triedValues: [1],
      remainingValues: [2, 3, 4, 5, 6, 7, 8, 9],
      failedValues: [],
      activeValue: 1,
    })

    expect(game.undoExploreToDecision()).toBe(true)
    expect(game.getActiveSudoku().getGrid()[0][0]).toBe(0)
    expect(game.getCurrentDecisionPoint()).toMatchObject({
      failedValues: [],
      activeValue: null,
    })

    expect(game.exploreGuess({ row: 0, col: 0, value: 2 })).toBe(true)
    expect(game.getCurrentDecisionPoint()).toMatchObject({
      triedValues: [1, 2],
      remainingValues: [3, 4, 5, 6, 7, 8, 9],
      failedValues: [],
      activeValue: 2,
    })
  })

  it('records dead-end candidates without marking invalid moves as failed branch values', () => {
    const game = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })

    game.enterExplore()
    applyMoves(game, deadEndMovesInOrderA())

    expect(game.getExploreFailureReason()).toBe('dead-end')
    expect(game.getExploreFailureReason()).toBe('dead-end')
		expect(game.getCurrentDecisionPoint()).toMatchObject({
      failedValues: [9],
      activeValue: 9,
    })

    expect(game.undoExploreToDecision()).toBe(true)
    expect(game.exploreGuess({ row: 1, col: 0, value: 9 })).toBe(true)
		expect(game.getExploreFailureReason()).toBe('known-failed-path')

    const invalidGame = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })
    invalidGame.enterExplore()
    invalidGame.exploreGuess({ row: 0, col: 0, value: 1 })
    invalidGame.exploreGuess({ row: 0, col: 1, value: 1 })
    expect(invalidGame.getExploreFailureReason()).toBe('invalid-cells')
		expect(invalidGame.getCurrentDecisionPoint()).toMatchObject({
			failedValues: [],
			activeValue: 1,
		})
	})

	it('returns known-failed-board when a different path reaches the same failed board', () => {
		const game = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })

		game.enterExplore()
		applyMoves(game, deadEndMovesInOrderA())
		expect(game.getExploreFailureReason()).toBe('dead-end')

		expect(game.resetExploreToOrigin()).toBe(true)
		applyMoves(game, deadEndMovesInOrderB())
		expect(game.getExploreFailureReason()).toBe('known-failed-board')
	})

	it('does not record invalid-cell failures as failed explore paths', () => {
		const game = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })

		game.enterExplore()
		game.exploreGuess({ row: 0, col: 0, value: 1 })
		game.exploreGuess({ row: 0, col: 1, value: 1 })

		expect(game.getExploreFailureReason()).toBe('invalid-cells')
		expect(game.hasSeenFailedExplorePath()).toBe(false)

		expect(game.undo()).toBe(true)
		expect(game.getActiveSudoku().getGrid()[0].slice(0, 2)).toEqual([1, 0])
		expect(game.getExploreFailureReason()).toBe(null)
		expect(game.hasSeenFailedExplorePath()).toBe(false)
	})

	it('preserves first-failure reason after serialization restore', () => {
		const game = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })

		game.enterExplore()
		applyMoves(game, deadEndMovesInOrderA())

		expect(game.getExploreFailureReason()).toBe('dead-end')
		expect(game.hasSeenFailedExploreBoard()).toBe(false)

		const restored = createGameFromJSON(game.toJSON())
		expect(restored.getExploreFailureReason()).toBe('dead-end')
		expect(restored.hasSeenFailedExploreBoard()).toBe(false)
	})

	it('does not treat a failed path prefix as a known failed path', () => {
		const json = makeTwoStepExploreJSON()
		const failedPath = JSON.stringify([
			...json.explore.session.path,
			{ decisionKey: json.explore.decisionPoints[1].key, value: 2 },
		])
		const game = createGameFromJSON(makeTwoStepExploreJSON({ failedExplorePaths: [failedPath] }))

		expect(game.hasSeenFailedExplorePath()).toBe(false)
		expect(game.getExploreFailureReason()).toBe(null)
	})

	it('does not track non-candidate explore inputs as decision branches', () => {
    const game = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 0, value: 1 })
    game.exploreGuess({ row: 0, col: 1, value: 1 })

    expect(game.getExploreFailureReason()).toBe('invalid-cells')
    expect(game.getExploreDecisionPath()).toEqual([
      expect.objectContaining({ row: 0, col: 0, value: 1 }),
    ])
    expect(game.getExploreDecisionPath()).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 0, col: 1, value: 1 }),
    ]))
    expect(game.getCurrentDecisionPoint()).toMatchObject({
      row: 0,
      col: 0,
      activeValue: 1,
    })
  })

  it('rejects failed explore commits and reports invalid-cell failures', () => {
    const game = createGame({ sudoku: createSudoku(Array.from({ length: 9 }, () => Array(9).fill(0))) })

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 0, value: 1 })
    game.exploreGuess({ row: 0, col: 1, value: 1 })

    expect(game.isExploreFailed()).toBe(true)
    expect(game.getExploreFailureReason()).toBe('invalid-cells')
    expect(() => game.commitExplore()).toThrowError(DomainValidationError)

    game.discardExplore()
    expect(game.getSudoku().getGrid()[0][0]).toBe(0)
    expect(game.isExploring()).toBe(false)
  })

  it('commits healthy explore states into main history', () => {
    const game = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 0, value: 2 })

    expect(game.commitExplore()).toBe(true)
    expect(game.isExploring()).toBe(false)
    expect(game.getSudoku().getGrid()[0][0]).toBe(2)

    game.undo()
    expect(game.getSudoku().getGrid()[0][0]).toBe(0)
  })

  it('serializes and restores explore session state and failure memory', () => {
    const currentGrid = makeEmptyPuzzle()
    currentGrid[0][0] = 1
		const empty = makeEmptyPuzzle()
		const snapshot = { grid: empty, givens: empty }
		const key = `${JSON.stringify(snapshot)}|0,0`
		const failedPath = JSON.stringify([{ decisionKey: key, value: 1 }])
		const game = createGameFromJSON(makeExploreJSON({ currentGrid, failedExplorePaths: [failedPath], failedValues: [1] }))

    expect(game.hasSeenFailedExplorePath()).toBe(true)
    expect(game.getExploreFailureReason()).toBe('known-failed-path')

    const restored = createGameFromJSON(game.toJSON())

    expect(restored.isExploring()).toBe(true)
    expect(restored.hasSeenFailedExplorePath()).toBe(true)
    expect(restored.getExploreFailureReason()).toBe('known-failed-path')
    expect(restored.getCurrentDecisionPoint()).toMatchObject({
      row: 0,
      col: 0,
      triedValues: [1],
      failedValues: [1],
      activeValue: 1,
    })

    expect(restored.undoExploreToDecision()).toBe(true)
    expect(restored.getActiveSudoku().getGrid()[0][0]).toBe(0)
    expect(restored.getCurrentDecisionPoint()).toMatchObject({
      failedValues: [1],
      activeValue: null,
    })
  })

  it('exposes game candidates and blocks explore while deterministic hints exist', () => {
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(game.getCandidates(0, 2)).toEqual([1, 2, 4])
    expect(() => game.enterExplore()).toThrowError(DomainValidationError)
  })

	it('rejects entering explore from conflicted or solved main boards', () => {
		const conflicted = createGame({ sudoku: createSudoku(makeEmptyPuzzle()) })
		conflicted.guess({ row: 0, col: 0, value: 1 })
		conflicted.guess({ row: 0, col: 1, value: 1 })
		expect(() => conflicted.enterExplore()).toThrowError(DomainValidationError)

		const solved = createGame({ sudoku: createSudoku(makeOneMovePuzzle()) })
		solved.applyHint()
		expect(() => solved.enterExplore()).toThrowError(DomainValidationError)
	})

	it('prioritizes exact known failed paths over known failed boards', () => {
		const currentGrid = makeEmptyPuzzle()
		currentGrid[0][0] = 1
		const failedState = JSON.stringify({ grid: currentGrid, givens: makeEmptyPuzzle() })
		const game = createGameFromJSON(makeExploreJSON({
			currentGrid,
			failedBoardStates: [failedState],
			failedExplorePaths: [JSON.stringify([{ decisionKey: `${JSON.stringify({ grid: makeEmptyPuzzle(), givens: makeEmptyPuzzle() })}|0,0`, value: 1 }])],
			failedValues: [1],
		}))

		expect(game.hasSeenFailedExploreBoard()).toBe(true)
		expect(game.hasSeenFailedExplorePath()).toBe(true)
		expect(game.getExploreFailureReason()).toBe('known-failed-path')
	})

})
