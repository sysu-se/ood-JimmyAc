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

describe('HW2 hint and explore behavior', () => {
  it('returns legal candidates for an empty cell', () => {
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.getCandidates(0, 2)).toEqual([1, 2, 4])
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
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(game.enterExplore()).toBe(true)
    expect(game.exploreGuess({ row: 0, col: 2, value: 1 })).toBe(true)
    expect(game.getCurrentDecisionPoint()).toMatchObject({
      row: 0,
      col: 2,
      triedValues: [1],
      remainingValues: [2, 4],
      failedValues: [],
      activeValue: 1,
    })

    expect(game.undoExploreToDecision()).toBe(true)
    expect(game.getActiveSudoku().getGrid()[0][2]).toBe(0)
    expect(game.getCurrentDecisionPoint()).toMatchObject({
      failedValues: [],
      activeValue: null,
    })

    expect(game.exploreGuess({ row: 0, col: 2, value: 2 })).toBe(true)
    expect(game.getCurrentDecisionPoint()).toMatchObject({
      triedValues: [1, 2],
      remainingValues: [4],
      failedValues: [],
      activeValue: 2,
    })
  })

  it('records dead-end candidates and detects known failed explore paths', () => {
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 2, value: 1 })

    expect(game.propagateHint()).toMatchObject({
      appliedCount: 3,
      stoppedReason: 'failed',
    })
    expect(game.getExploreFailureReason()).toBe('dead-end')
    expect(game.getCurrentDecisionPoint()).toMatchObject({
      failedValues: [1],
      activeValue: 1,
    })

    expect(game.undoExploreToDecision()).toBe(true)
    expect(game.exploreGuess({ row: 0, col: 2, value: 1 })).toBe(true)
    expect(game.hasSeenFailedExplorePath()).toBe(true)
    expect(game.getExploreFailureReason()).toBe('known-failed-path')

    expect(game.undoExploreToDecision()).toBe(true)
    expect(game.exploreGuess({ row: 0, col: 2, value: 2 })).toBe(true)
    expect(game.hasSeenFailedExplorePath()).toBe(false)
    expect(game.getExploreFailureReason()).toBe(null)
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
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 2, value: 2 })

    expect(game.commitExplore()).toBe(true)
    expect(game.isExploring()).toBe(false)
    expect(game.getSudoku().getGrid()[0][2]).toBe(2)

    game.undo()
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
  })

  it('serializes and restores explore session state and failure memory', () => {
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.enterExplore()
    game.exploreGuess({ row: 0, col: 2, value: 1 })
    game.propagateHint()
    game.undoExploreToDecision()
    game.exploreGuess({ row: 0, col: 2, value: 1 })

    const restored = createGameFromJSON(game.toJSON())

    expect(restored.isExploring()).toBe(true)
    expect(restored.hasSeenFailedExplorePath()).toBe(true)
    expect(restored.getExploreFailureReason()).toBe('known-failed-path')
    expect(restored.getCurrentDecisionPoint()).toMatchObject({
      row: 0,
      col: 2,
      triedValues: [1],
      failedValues: [1],
      activeValue: 1,
    })

    expect(restored.undoExploreToDecision()).toBe(true)
    expect(restored.getActiveSudoku().getGrid()[0][2]).toBe(0)
    expect(restored.getCurrentDecisionPoint()).toMatchObject({
      failedValues: [1],
      activeValue: null,
    })
  })
})
