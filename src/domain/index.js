const GRID_SIZE = 9;
const BOX_SIZE = 3;

class DomainValidationError extends Error {
	/**
	 * Represent one domain-level input failure.
	 *
	 * @param {string} message
	 */
	constructor(message) {
		super(message);
		this.name = 'DomainValidationError';
	}
}

/**
	 * Validate one sudoku cell value.
	 *
	 * @param {unknown} value
	 */
function assertCellValue(value) {
	if (!Number.isInteger(value) || value < 0 || value > 9) {
		throw new DomainValidationError('Sudoku cell value must be an integer between 0 and 9');
	}
}

/**
	 * Create a deep copy of a 9x9 grid.
	 *
	 * @param {number[][]} grid
	 * @returns {number[][]}
	 */
function cloneGrid(grid) {
	return grid.map((row) => [...row]);
}

/**
	 * Create a givens grid from one puzzle grid.
	 * Non-zero cells are treated as fixed clues.
	 *
	 * @param {number[][]} grid
	 * @returns {number[][]}
	 */
function deriveGivens(grid) {
	return grid.map((row) => row.map((value) => (value === 0 ? 0 : value)));
}

/**
	 * Validate a 9x9 sudoku grid.
	 *
	 * @param {unknown} grid
	 * @param {string} label
	 */
function assertGrid(grid, label = 'Sudoku grid') {
	if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
		throw new DomainValidationError(`${label} must contain 9 rows`);
	}

	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== GRID_SIZE) {
			throw new DomainValidationError(`${label} must contain rows with 9 cells`);
		}

		for (const value of row) {
			assertCellValue(value);
		}
	}
}

/**
	 * Ensure current grid and givens grid are compatible.
	 *
	 * @param {number[][]} grid
	 * @param {number[][]} givens
	 */
function assertGivensCompatibility(grid, givens) {
	for (let row = 0; row < GRID_SIZE; row += 1) {
		for (let col = 0; col < GRID_SIZE; col += 1) {
			const given = givens[row][col];
			if (given !== 0 && grid[row][col] !== given) {
				throw new DomainValidationError('Current grid must preserve all givens');
			}
		}
	}
}

/**
	 * Normalize one move object and convert null into 0.
	 *
	 * @param {{ row: unknown, col: unknown, value: unknown }} move
	 * @returns {{ row: number, col: number, value: number }}
	 */
function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new DomainValidationError('Move must be an object with row, col and value');
	}

	const row = move.row;
	const col = move.col;
	const value = move.value === null ? 0 : move.value;

	if (!Number.isInteger(row) || row < 0 || row >= GRID_SIZE) {
		throw new DomainValidationError('Move row must be an integer between 0 and 8');
	}

	if (!Number.isInteger(col) || col < 0 || col >= GRID_SIZE) {
		throw new DomainValidationError('Move col must be an integer between 0 and 8');
	}

	assertCellValue(value);

	return { row, col, value };
}

function assertCellCoordinates(row, col) {
	if (!Number.isInteger(row) || row < 0 || row >= GRID_SIZE) {
		throw new DomainValidationError('Row must be an integer between 0 and 8');
	}

	if (!Number.isInteger(col) || col < 0 || col >= GRID_SIZE) {
		throw new DomainValidationError('Col must be an integer between 0 and 8');
	}
}

function normalizeHintOptions(options = {}) {
	const detailLevel = options.detailLevel ?? 3;

	if (!Number.isInteger(detailLevel) || detailLevel < 1 || detailLevel > 3) {
		throw new DomainValidationError('Hint detailLevel must be 1, 2 or 3');
	}

	return { detailLevel };
}

/**
	 * Collect every conflicting cell in the given grid.
	 *
	 * @param {number[][]} grid
	 * @returns {string[]}
	 */
function collectInvalidCells(grid) {
	const invalid = new Set();

	const addInvalid = (row, col) => {
		invalid.add(`${col},${row}`);
	};

	for (let row = 0; row < GRID_SIZE; row += 1) {
		for (let col = 0; col < GRID_SIZE; col += 1) {
			const value = grid[row][col];

			if (value === 0) {
				continue;
			}

			for (let index = 0; index < GRID_SIZE; index += 1) {
				if (index !== col && grid[row][index] === value) {
					addInvalid(row, col);
					addInvalid(row, index);
				}

				if (index !== row && grid[index][col] === value) {
					addInvalid(row, col);
					addInvalid(index, col);
				}
			}

			const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
			const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

			for (let boxRow = startRow; boxRow < startRow + BOX_SIZE; boxRow += 1) {
				for (let boxCol = startCol; boxCol < startCol + BOX_SIZE; boxCol += 1) {
					if ((boxRow !== row || boxCol !== col) && grid[boxRow][boxCol] === value) {
						addInvalid(row, col);
						addInvalid(boxRow, boxCol);
					}
				}
			}
		}
	}

	return Array.from(invalid);
}

/**
	 * Check whether every cell is filled.
	 *
	 * @param {number[][]} grid
	 * @returns {boolean}
	 */
function isFilled(grid) {
	for (let row = 0; row < GRID_SIZE; row += 1) {
		for (let col = 0; col < GRID_SIZE; col += 1) {
			if (grid[row][col] === 0) {
				return false;
			}
		}
	}

	return true;
}

/**
	 * Check whether an object behaves like one Sudoku instance.
	 *
	 * @param {unknown} sudoku
	 */
function assertSudokuLike(sudoku) {
	if (!sudoku || typeof sudoku !== 'object') {
		throw new DomainValidationError('Game requires a Sudoku-like object');
	}

	const requiredMethods = [
		'clone',
		'guess',
		'canGuess',
		'getGrid',
		'getGivens',
		'getCandidates',
		'getNextHint',
		'getInvalidCells',
		'isWon',
		'toJSON',
	];

	for (const methodName of requiredMethods) {
		if (typeof sudoku[methodName] !== 'function') {
			throw new DomainValidationError('Game requires a complete Sudoku-like object');
		}
	}
}

/**
	 * Clone every sudoku snapshot in one history stack.
	 *
	 * @param {Array<{ clone(): any }>} stack
	 * @returns {Array<any>}
	 */
function cloneSnapshotStack(stack) {
	return stack.map((snapshot) => snapshot.clone());
}

function cloneExplorePath(path) {
	return path.map((entry) => ({
		decisionKey: entry.decisionKey,
		value: entry.value,
	}));
}

function cloneExploreHistoryStack(stack) {
	return stack.map((checkpoint) => ({
		sudoku: checkpoint.sudoku.clone(),
		path: cloneExplorePath(checkpoint.path ?? []),
		focusedDecisionKey: checkpoint.focusedDecisionKey ?? null,
	}));
}

function cloneDecisionPointRecord(record) {
	return {
		key: record.key,
		row: record.row,
		col: record.col,
		candidates: [...record.candidates],
		triedValues: [...(record.triedValues ?? [])],
		failedValues: [...(record.failedValues ?? [])],
		snapshot: record.snapshot.clone(),
	};
}

function serializeSudokuState(sudoku) {
	return JSON.stringify(sudoku.toJSON());
}

/**
	 * Build one Sudoku domain object around current grid and givens.
	 *
	 * @param {number[][]} input
	 * @param {{ givens?: number[][] }} options
	 * @returns {{
	 *   readonly grid: number[][],
	 *   readonly givens: number[][],
	 *   getGrid(): number[][],
	 *   getGivens(): number[][],
	 *   isFixedCell(row: number, col: number): boolean,
	 *   canGuess(move: { row: number, col: number, value: number | null }): boolean,
	 *   guess(move: { row: number, col: number, value: number | null }): void,
	 *   getInvalidCells(): string[],
	 *   isWon(): boolean,
	 *   clone(): any,
	 *   toJSON(): { grid: number[][], givens: number[][] },
	 *   toString(): string,
	 * }}
	 */
function createSudokuInstance(input, { givens } = {}) {
	assertGrid(input);
	const grid = cloneGrid(input);
	const givenGrid = cloneGrid(givens ?? deriveGivens(input));
	assertGrid(givenGrid, 'Sudoku givens grid');
	assertGivensCompatibility(grid, givenGrid);

	function getGrid() {
		return cloneGrid(grid);
	}

	function getGivens() {
		return cloneGrid(givenGrid);
	}

	function isFixedCell(row, col) {
		return givenGrid[row][col] !== 0;
	}

	function canGuess(move) {
		try {
			const normalizedMove = normalizeMove(move);
			return !isFixedCell(normalizedMove.row, normalizedMove.col);
		} catch (error) {
			if (error instanceof DomainValidationError) {
				return false;
			}

			throw error;
		}
	}

	function guess(move) {
		const normalizedMove = normalizeMove(move);

		if (isFixedCell(normalizedMove.row, normalizedMove.col)) {
			throw new DomainValidationError('Cannot modify a given sudoku cell');
		}

		grid[normalizedMove.row][normalizedMove.col] = normalizedMove.value;
	}

	function getCandidates(row, col) {
		assertCellCoordinates(row, col);

		if (isFixedCell(row, col) || grid[row][col] !== 0) {
			return [];
		}

		const usedValues = new Set();

		for (let index = 0; index < GRID_SIZE; index += 1) {
			if (grid[row][index] !== 0) {
				usedValues.add(grid[row][index]);
			}

			if (grid[index][col] !== 0) {
				usedValues.add(grid[index][col]);
			}
		}

		const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
		const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

		for (let boxRow = startRow; boxRow < startRow + BOX_SIZE; boxRow += 1) {
			for (let boxCol = startCol; boxCol < startCol + BOX_SIZE; boxCol += 1) {
				if (grid[boxRow][boxCol] !== 0) {
					usedValues.add(grid[boxRow][boxCol]);
				}
			}
		}

		const candidates = [];
		for (let value = 1; value <= GRID_SIZE; value += 1) {
			if (!usedValues.has(value)) {
				candidates.push(value);
			}
		}

		return candidates;
	}

	function createHint(row, col, candidates, detailLevel) {
		const candidateCount = candidates.length;
		const isSingle = candidateCount === 1;
		const hasNoCandidate = candidateCount === 0;
		const fullHint = {
			row,
			col,
			detailLevel,
			type: hasNoCandidate ? 'dead-end' : (isSingle ? 'single-candidate' : 'minimum-candidates'),
			kind: isSingle ? 'deterministic' : 'exploratory',
			candidateCount,
			candidates: [...candidates],
			suggestedValue: isSingle ? candidates[0] : null,
			canApplyDirectly: isSingle,
			reason: hasNoCandidate ? {
				code: 'no-candidates',
				message: 'This cell has no legal candidates; the current path is blocked.',
			} : (isSingle ? {
				code: 'single-candidate',
				message: 'This cell has only one legal candidate and can be filled directly.',
			} : {
				code: 'minimum-candidates',
				message: 'This empty cell has the fewest candidates and is a good next focus.',
			}),
		};

		if (detailLevel === 1) {
			return {
				row: fullHint.row,
				col: fullHint.col,
				detailLevel: fullHint.detailLevel,
				type: fullHint.type,
				kind: fullHint.kind,
				canApplyDirectly: fullHint.canApplyDirectly,
				reason: fullHint.reason,
			};
		}

		if (detailLevel === 2) {
			return {
				row: fullHint.row,
				col: fullHint.col,
				detailLevel: fullHint.detailLevel,
				type: fullHint.type,
				kind: fullHint.kind,
				candidateCount: fullHint.candidateCount,
				canApplyDirectly: fullHint.canApplyDirectly,
				reason: fullHint.reason,
			};
		}

		return fullHint;
	}

	function getNextHint(options = {}) {
		const { detailLevel } = normalizeHintOptions(options);
		let bestHint = null;

		for (let row = 0; row < GRID_SIZE; row += 1) {
			for (let col = 0; col < GRID_SIZE; col += 1) {
				if (grid[row][col] !== 0 || isFixedCell(row, col)) {
					continue;
				}

				const candidates = getCandidates(row, col);
				if (!bestHint || candidates.length < bestHint.candidates.length) {
					bestHint = { row, col, candidates };
				}
			}
		}

		if (!bestHint) {
			return null;
		}

		return createHint(bestHint.row, bestHint.col, bestHint.candidates, detailLevel);
	}

	function getInvalidCells() {
		return collectInvalidCells(grid);
	}

	function isWon() {
		return isFilled(grid) && getInvalidCells().length === 0;
	}

	function clone() {
		return createSudokuInstance(getGrid(), { givens: getGivens() });
	}

	function toJSON() {
		return {
			grid: getGrid(),
			givens: getGivens(),
		};
	}

	function toString() {
		let out = '╔═══════╤═══════╤═══════╗\n';

		for (let row = 0; row < GRID_SIZE; row += 1) {
			if (row !== 0 && row % BOX_SIZE === 0) {
				out += '╟───────┼───────┼───────╢\n';
			}

			for (let col = 0; col < GRID_SIZE; col += 1) {
				if (col === 0) {
					out += '║ ';
				} else if (col % BOX_SIZE === 0) {
					out += '│ ';
				}

				out += (grid[row][col] === 0 ? '·' : grid[row][col]) + ' ';

				if (col === GRID_SIZE - 1) {
					out += '║';
				}
			}

			out += '\n';
		}

		out += '╚═══════╧═══════╧═══════╝';
		return out;
	}

	return {
		get grid() {
			return getGrid();
		},
		get givens() {
			return getGivens();
		},
		getGrid,
		getGivens,
		isFixedCell,
		canGuess,
		guess,
		getCandidates,
		getNextHint,
		getInvalidCells,
		isWon,
		clone,
		toJSON,
		toString,
	};
}

export function createSudoku(input) {
	return createSudokuInstance(input);
}

export function createSudokuFromJSON(json) {
	if (Array.isArray(json)) {
		return createSudoku(json);
	}

	if (!json || typeof json !== 'object' || !Array.isArray(json.grid)) {
		throw new DomainValidationError('Sudoku JSON must contain a grid');
	}

	return createSudokuInstance(json.grid, {
		givens: json.givens,
	});
}

function createGameInstance({ sudoku, undoStack = [], redoStack = [], explore = null }) {
	assertSudokuLike(sudoku);

	let currentSudoku = sudoku.clone();
	const historyUndo = cloneSnapshotStack(undoStack);
	const historyRedo = cloneSnapshotStack(redoStack);
	const decisionPointBook = new Map();

	for (const decisionPoint of explore?.decisionPoints ?? []) {
		decisionPointBook.set(decisionPoint.key, cloneDecisionPointRecord(decisionPoint));
	}

	let exploreSession = explore?.session ? {
		origin: explore.session.origin.clone(),
		current: explore.session.current.clone(),
		undoStack: cloneExploreHistoryStack(explore.session.undoStack ?? []),
		redoStack: cloneExploreHistoryStack(explore.session.redoStack ?? []),
		path: cloneExplorePath(explore.session.path ?? []),
		focusedDecisionKey: explore.session.focusedDecisionKey ?? null,
	} : null;

	if (exploreSession && exploreSession.focusedDecisionKey === null && exploreSession.path.length > 0) {
		exploreSession.focusedDecisionKey = exploreSession.path[exploreSession.path.length - 1].decisionKey;
	}

	function getSudoku() {
		return currentSudoku.clone();
	}

	function isExploring() {
		return exploreSession !== null;
	}

	function assertExploring() {
		if (!isExploring()) {
			throw new DomainValidationError('Explore mode is not active');
		}
	}

	function getActiveSudokuInstance() {
		return isExploring() ? exploreSession.current : currentSudoku;
	}

	function getActiveSudoku() {
		return getActiveSudokuInstance().clone();
	}

	function getInvalidCells() {
		return getActiveSudokuInstance().getInvalidCells();
	}

	function isWon() {
		return getActiveSudokuInstance().isWon();
	}

	function getHint(options = {}) {
		return getActiveSudokuInstance().getNextHint(options);
	}

	function canUndo() {
		return historyUndo.length > 0;
	}

	function canRedo() {
		return historyRedo.length > 0;
	}

	function getDecisionKey(snapshot, row, col) {
		return `${serializeSudokuState(snapshot)}|${row},${col}`;
	}

	function getActiveBranchValue(decisionKey) {
		if (!isExploring()) {
			return null;
		}

		for (let index = exploreSession.path.length - 1; index >= 0; index -= 1) {
			if (exploreSession.path[index].decisionKey === decisionKey) {
				return exploreSession.path[index].value;
			}
		}

		return null;
	}

	function getCurrentDecisionKey() {
		if (!isExploring()) {
			return null;
		}

		return exploreSession.focusedDecisionKey;
	}

	function getCurrentDecisionRecord() {
		const decisionKey = getCurrentDecisionKey();
		return decisionKey ? (decisionPointBook.get(decisionKey) ?? null) : null;
	}

	function createExploreCheckpoint() {
		return {
			sudoku: exploreSession.current.clone(),
			path: cloneExplorePath(exploreSession.path),
			focusedDecisionKey: exploreSession.focusedDecisionKey,
		};
	}

	function restoreExploreCheckpoint(checkpoint) {
		exploreSession.current = checkpoint.sudoku.clone();
		exploreSession.path = cloneExplorePath(checkpoint.path ?? []);
		exploreSession.focusedDecisionKey = checkpoint.focusedDecisionKey
			?? (exploreSession.path.length > 0 ? exploreSession.path[exploreSession.path.length - 1].decisionKey : null);
	}

	function setActiveBranch(decisionKey, value) {
		const existingIndex = exploreSession.path.findIndex((entry) => entry.decisionKey === decisionKey);
		if (existingIndex !== -1) {
			exploreSession.path = exploreSession.path.slice(0, existingIndex);
		}

		exploreSession.path.push({ decisionKey, value });
		exploreSession.focusedDecisionKey = decisionKey;
	}

	function pruneExplorePathForCell(row, col) {
		if (!isExploring()) {
			return;
		}

		for (let index = 0; index < exploreSession.path.length; index += 1) {
			const decisionPoint = decisionPointBook.get(exploreSession.path[index].decisionKey);
			if (decisionPoint && decisionPoint.row === row && decisionPoint.col === col) {
				exploreSession.path = exploreSession.path.slice(0, index);
				exploreSession.focusedDecisionKey = exploreSession.path.length > 0
					? exploreSession.path[exploreSession.path.length - 1].decisionKey
					: null;
				return;
			}
		}
	}

	function guess(move) {
		if (!currentSudoku.canGuess(move)) {
			throw new DomainValidationError('Illegal game move');
		}

		historyUndo.push(currentSudoku.clone());
		currentSudoku.guess(move);
		historyRedo.length = 0;
	}

	function getImmediateExploreFailureReason() {
		if (!isExploring()) {
			return null;
		}

		if (exploreSession.current.getInvalidCells().length > 0) {
			return 'invalid-cells';
		}

		const hint = exploreSession.current.getNextHint({ detailLevel: 3 });
		if (hint?.type === 'dead-end') {
			return 'dead-end';
		}

		return null;
	}

	function rememberFailedExploreBranch() {
		if (!isExploring() || getImmediateExploreFailureReason() === null || exploreSession.path.length === 0) {
			return;
		}

		const latestBranch = exploreSession.path[exploreSession.path.length - 1];
		const decisionPoint = decisionPointBook.get(latestBranch.decisionKey);
		if (!decisionPoint || decisionPoint.failedValues.includes(latestBranch.value)) {
			return;
		}

		decisionPoint.failedValues.push(latestBranch.value);
	}

	function createDecisionPoint(move, candidates, snapshot) {
		const normalizedMove = normalizeMove(move);

		if (normalizedMove.value === 0 || candidates.length <= 1) {
			return null;
		}

		const decisionKey = getDecisionKey(snapshot, normalizedMove.row, normalizedMove.col);
		let decisionPoint = decisionPointBook.get(decisionKey);
		if (!decisionPoint) {
			decisionPoint = {
				key: decisionKey,
				row: normalizedMove.row,
				col: normalizedMove.col,
				candidates: [...candidates],
				triedValues: [],
				failedValues: [],
				snapshot: snapshot.clone(),
			};
			decisionPointBook.set(decisionKey, decisionPoint);
		}

		if (!decisionPoint.triedValues.includes(normalizedMove.value)) {
			decisionPoint.triedValues.push(normalizedMove.value);
		}

		setActiveBranch(decisionKey, normalizedMove.value);
		return decisionPoint;
	}

	function enterExplore() {
		if (isExploring()) {
			return false;
		}

		const origin = currentSudoku.clone();
		exploreSession = {
			origin,
			current: origin.clone(),
			undoStack: [],
			redoStack: [],
			path: [],
			focusedDecisionKey: null,
		};
		return true;
	}

	function exploreGuess(move) {
		assertExploring();

		if (!exploreSession.current.canGuess(move)) {
			throw new DomainValidationError('Illegal explore move');
		}

		const normalizedMove = normalizeMove(move);
		const snapshot = exploreSession.current.clone();
		const candidates = snapshot.getCandidates(normalizedMove.row, normalizedMove.col);

		exploreSession.undoStack.push(createExploreCheckpoint());
		pruneExplorePathForCell(normalizedMove.row, normalizedMove.col);
		exploreSession.current.guess(normalizedMove);
		exploreSession.redoStack.length = 0;
		createDecisionPoint(normalizedMove, candidates, snapshot);
		rememberFailedExploreBranch();
		return true;
	}

	function canUndoExplore() {
		return isExploring() && exploreSession.undoStack.length > 0;
	}

	function canRedoExplore() {
		return isExploring() && exploreSession.redoStack.length > 0;
	}

	function undoExplore() {
		if (!canUndoExplore()) {
			return false;
		}

		exploreSession.redoStack.push(createExploreCheckpoint());
		restoreExploreCheckpoint(exploreSession.undoStack.pop());
		rememberFailedExploreBranch();
		return true;
	}

	function redoExplore() {
		if (!canRedoExplore()) {
			return false;
		}

		exploreSession.undoStack.push(createExploreCheckpoint());
		restoreExploreCheckpoint(exploreSession.redoStack.pop());
		rememberFailedExploreBranch();
		return true;
	}

	function resetExploreToOrigin() {
		assertExploring();
		exploreSession.current = exploreSession.origin.clone();
		exploreSession.undoStack.length = 0;
		exploreSession.redoStack.length = 0;
		exploreSession.path = [];
		exploreSession.focusedDecisionKey = null;
		rememberFailedExploreBranch();
		return true;
	}

	function undoExploreToDecision() {
		assertExploring();

		const decisionPoint = getCurrentDecisionRecord();
		if (!decisionPoint) {
			return false;
		}

		exploreSession.current = decisionPoint.snapshot.clone();
		exploreSession.undoStack.length = 0;
		exploreSession.redoStack.length = 0;
		const pathIndex = exploreSession.path.findIndex((entry) => entry.decisionKey === decisionPoint.key);
		exploreSession.path = pathIndex === -1 ? [] : exploreSession.path.slice(0, pathIndex);
		exploreSession.focusedDecisionKey = decisionPoint.key;
		rememberFailedExploreBranch();
		return true;
	}

	function getCurrentDecisionPoint() {
		const decisionPoint = getCurrentDecisionRecord();

		if (!decisionPoint) {
			return null;
		}

		return {
			row: decisionPoint.row,
			col: decisionPoint.col,
			candidates: [...decisionPoint.candidates],
			triedValues: [...decisionPoint.triedValues],
			remainingValues: decisionPoint.candidates.filter((value) => !decisionPoint.triedValues.includes(value)),
			failedValues: [...decisionPoint.failedValues],
			activeValue: getActiveBranchValue(decisionPoint.key),
			snapshot: decisionPoint.snapshot.clone(),
		};
	}

	function getExploreDecisionPath() {
		if (!isExploring()) {
			return [];
		}

		return exploreSession.path.map((entry) => {
			const decisionPoint = decisionPointBook.get(entry.decisionKey);
			if (!decisionPoint) {
				return null;
			}

			return {
				row: decisionPoint.row,
				col: decisionPoint.col,
				value: entry.value,
				candidates: [...decisionPoint.candidates],
				triedValues: [...decisionPoint.triedValues],
				failedValues: [...decisionPoint.failedValues],
			};
		}).filter(Boolean);
	}

	function discardExplore() {
		if (!isExploring()) {
			return false;
		}

		exploreSession = null;
		return true;
	}

	function commitExplore() {
		assertExploring();

		if (getExploreFailureReason() !== null) {
			throw new DomainValidationError('Cannot commit a failed explore state');
		}

		historyUndo.push(currentSudoku.clone());
		currentSudoku = exploreSession.current.clone();
		historyRedo.length = 0;
		exploreSession = null;
		return true;
	}

	function getExploreFailureReason() {
		const immediateFailureReason = getImmediateExploreFailureReason();
		if (immediateFailureReason !== null) {
			return immediateFailureReason;
		}

		if (hasSeenFailedExplorePath()) {
			return 'known-failed-path';
		}

		return null;
	}

	function hasSeenFailedExplorePath() {
		if (!isExploring()) {
			return false;
		}

		for (const entry of exploreSession.path) {
			const decisionPoint = decisionPointBook.get(entry.decisionKey);
			if (decisionPoint && decisionPoint.failedValues.includes(entry.value)) {
				return true;
			}
		}

		return false;
	}

	function isExploreFailed() {
		return getExploreFailureReason() !== null;
	}

	function applyHint() {
		const hint = getHint({ detailLevel: 3 });

		if (!hint) {
			return {
				applied: false,
				reason: 'no-hint',
				hint: null,
			};
		}

		if (!hint.canApplyDirectly) {
			return {
				applied: false,
				reason: 'explore-required',
				hint,
			};
		}

		const move = {
			row: hint.row,
			col: hint.col,
			value: hint.suggestedValue,
		};

		if (isExploring()) {
			exploreGuess(move);
		} else {
			guess(move);
		}

		return {
			applied: true,
			hint,
		};
	}

	function propagateHint() {
		const appliedHints = [];
		let stoppedReason = 'no-hint';

		for (let step = 0; step < GRID_SIZE * GRID_SIZE; step += 1) {
			if (isExploring() && isExploreFailed()) {
				stoppedReason = 'failed';
				break;
			}

			if (isWon()) {
				stoppedReason = 'solved';
				break;
			}

			const result = applyHint();
			if (!result.applied) {
				stoppedReason = result.reason === 'explore-required' ? 'branch' : result.reason;
				break;
			}

			appliedHints.push(result.hint);
		}

		return {
			appliedCount: appliedHints.length,
			stoppedReason,
			hints: appliedHints,
		};
	}

	function undo() {
		if (!canUndo()) {
			return;
		}

		historyRedo.push(currentSudoku.clone());
		currentSudoku = historyUndo.pop();
	}

	function redo() {
		if (!canRedo()) {
			return;
		}

		historyUndo.push(currentSudoku.clone());
		currentSudoku = historyRedo.pop();
	}

	function toJSON() {
		const serializedDecisionPoints = Array.from(decisionPointBook.values()).map((decisionPoint) => ({
			key: decisionPoint.key,
			row: decisionPoint.row,
			col: decisionPoint.col,
			candidates: [...decisionPoint.candidates],
			triedValues: [...decisionPoint.triedValues],
			failedValues: [...decisionPoint.failedValues],
			snapshot: decisionPoint.snapshot.toJSON(),
		}));

		return {
			sudoku: currentSudoku.toJSON(),
			history: {
				undo: historyUndo.map((snapshot) => snapshot.toJSON()),
				redo: historyRedo.map((snapshot) => snapshot.toJSON()),
			},
			explore: exploreSession || serializedDecisionPoints.length > 0 ? {
				active: isExploring(),
				decisionPoints: serializedDecisionPoints,
				session: exploreSession ? {
					origin: exploreSession.origin.toJSON(),
					current: exploreSession.current.toJSON(),
					undo: exploreSession.undoStack.map((checkpoint) => ({
						sudoku: checkpoint.sudoku.toJSON(),
						path: cloneExplorePath(checkpoint.path ?? []),
						focusedDecisionKey: checkpoint.focusedDecisionKey ?? null,
					})),
					redo: exploreSession.redoStack.map((checkpoint) => ({
						sudoku: checkpoint.sudoku.toJSON(),
						path: cloneExplorePath(checkpoint.path ?? []),
						focusedDecisionKey: checkpoint.focusedDecisionKey ?? null,
					})),
					path: cloneExplorePath(exploreSession.path),
					focusedDecisionKey: exploreSession.focusedDecisionKey,
				} : null,
			} : null,
		};
	}

	return {
		get sudoku() {
			return getSudoku();
		},
		get history() {
			return {
				undo: cloneSnapshotStack(historyUndo),
				redo: cloneSnapshotStack(historyRedo),
			};
		},
		get undoAvailable() {
			return canUndo();
		},
		get redoAvailable() {
			return canRedo();
		},
		get invalidCells() {
			return getInvalidCells();
		},
		get won() {
			return isWon();
		},
		getSudoku,
		getActiveSudoku,
		getInvalidCells,
		isWon,
		getHint,
		propagateHint,
		canUndo,
		canRedo,
		guess,
		applyHint,
		undo,
		redo,
		enterExplore,
		isExploring,
		exploreGuess,
		undoExplore,
		redoExplore,
		canUndoExplore,
		canRedoExplore,
		resetExploreToOrigin,
		undoExploreToDecision,
		getCurrentDecisionPoint,
		getExploreDecisionPath,
		discardExplore,
		commitExplore,
		getExploreFailureReason,
		isExploreFailed,
		hasSeenFailedExplorePath,
		toJSON,
	};
}

export function createGame({ sudoku }) {
	return createGameInstance({ sudoku });
}

export function createGameFromJSON(json) {
	if (Array.isArray(json) || (json && typeof json === 'object' && Array.isArray(json.grid) && !json.sudoku)) {
		return createGame({ sudoku: createSudokuFromJSON(json) });
	}

	if (!json || typeof json !== 'object' || !json.sudoku) {
		throw new DomainValidationError('Game JSON must contain a sudoku field');
	}

	const sudoku = createSudokuFromJSON(json.sudoku);
	const undoStack = (json.history?.undo ?? []).map((snapshot) => createSudokuFromJSON(snapshot));
	const redoStack = (json.history?.redo ?? []).map((snapshot) => createSudokuFromJSON(snapshot));
	const explore = json.explore ? {
		decisionPoints: (json.explore.decisionPoints ?? []).map((decisionPoint) => ({
			key: decisionPoint.key,
			row: decisionPoint.row,
			col: decisionPoint.col,
			candidates: [...(decisionPoint.candidates ?? [])],
			triedValues: [...(decisionPoint.triedValues ?? [])],
			failedValues: [...(decisionPoint.failedValues ?? [])],
			snapshot: createSudokuFromJSON(decisionPoint.snapshot),
		})),
		session: json.explore.active && json.explore.session ? {
			origin: createSudokuFromJSON(json.explore.session.origin),
			current: createSudokuFromJSON(json.explore.session.current),
			undoStack: (json.explore.session.undo ?? []).map((checkpoint) => ({
				sudoku: createSudokuFromJSON(checkpoint.sudoku),
				path: cloneExplorePath(checkpoint.path ?? []),
				focusedDecisionKey: checkpoint.focusedDecisionKey ?? null,
			})),
			redoStack: (json.explore.session.redo ?? []).map((checkpoint) => ({
				sudoku: createSudokuFromJSON(checkpoint.sudoku),
				path: cloneExplorePath(checkpoint.path ?? []),
				focusedDecisionKey: checkpoint.focusedDecisionKey ?? null,
			})),
			path: cloneExplorePath(json.explore.session.path ?? []),
			focusedDecisionKey: json.explore.session.focusedDecisionKey ?? null,
		} : null,
	} : null;

	return createGameInstance({ sudoku, undoStack, redoStack, explore });
}

export { DomainValidationError };
