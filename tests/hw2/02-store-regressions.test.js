import { describe, expect, it } from 'vitest'
import { candidates } from '../../src/node_modules/@sudoku/stores/candidates.js'

function readStore(store) {
	let value
	const unsubscribe = store.subscribe(($value) => {
		value = $value
	})
	unsubscribe()
	return value
}

describe('HW2 store regressions', () => {
	it('ignores note candidates without a selected cell', () => {
		candidates.clearAll()

		candidates.add({ x: null, y: null }, 1)

		expect(readStore(candidates)).toEqual({})
	})

	it('toggles note candidates without leaving sparse arrays', () => {
		candidates.clearAll()

		candidates.add({ x: 1, y: 2 }, 3)
		candidates.add({ x: 1, y: 2 }, 4)
		candidates.add({ x: 1, y: 2 }, 3)

		expect(readStore(candidates)).toEqual({
			'1,2': [4],
		})
		expect(0 in readStore(candidates)['1,2']).toBe(true)
	})
})
