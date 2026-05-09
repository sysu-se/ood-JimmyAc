import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeEmptyPuzzle() {
	return Array.from({ length: 9 }, () => Array(9).fill(0))
}

let mockGrid = makeEmptyPuzzle()

vi.hoisted(() => {
	globalThis.localStorage = {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {},
	}
	return null
})

vi.mock('@sudoku/sencode', () => ({
	decodeSencode: () => mockGrid.map((row) => [...row]),
	encodeSudoku: () => 'mock-code',
}))

vi.mock('@sudoku/sudoku', () => ({
	generateSudoku: () => mockGrid.map((row) => [...row]),
}))

vi.mock('@sudoku/constants', () => ({
	DEFAULT_SETTINGS: {
		hintsLimited: false,
		hints: 3,
		highlightCells: true,
		highlightSame: true,
		highlightConflicting: true,
	},
}))

import {
	exploreFailureReason,
	knownFailedExploreBoard,
	userGrid,
} from '../../src/node_modules/@sudoku/stores/grid.js'

function readStore(store) {
	let value
	const unsubscribe = store.subscribe(($value) => {
		value = $value
	})
	unsubscribe()
	return value
}

describe('HW2 grid store integration', () => {
	beforeEach(() => {
		mockGrid = makeEmptyPuzzle()
		userGrid.startCustomGame('mock')
		userGrid.discardExplore()
	})

	it('keeps first explore failure separate from known failed board state', () => {
		expect(userGrid.enterExplore()).toMatchObject({ ok: true })
		expect(userGrid.guess({ x: 0, y: 0 }, 1)).toMatchObject({ ok: true })
		expect(userGrid.guess({ x: 1, y: 0 }, 1)).toMatchObject({
			ok: false,
			reason: 'invalid-cells',
		})

		expect(readStore(exploreFailureReason)).toBe('invalid-cells')
		expect(readStore(knownFailedExploreBoard)).toBe(false)
	})

	it('rejects entering explore from a conflicted main board', () => {
		mockGrid = makeEmptyPuzzle()
		mockGrid[0][0] = 1
		mockGrid[0][1] = 1
		userGrid.startCustomGame('mock')

		expect(userGrid.enterExplore()).toMatchObject({
			ok: false,
			reason: 'invalid-main-board',
		})
	})
})
