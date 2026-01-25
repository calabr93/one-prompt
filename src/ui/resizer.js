/**
 * Resizer Module for webview-wrapper panels
 *
 * Allows manual resizing of individual webview panels in all layout modes.
 * - Horizontal/Vertical: Uses flex-grow ratios between adjacent wrappers
 * - Grid: Uses global column/row resizers that affect entire columns/rows
 *
 * Persists sizes to localStorage per layout mode.
 *
 * @module @ui/resizer
 */

import { logger } from '../utils/logger-renderer.js';

// Storage key prefix for wrapper sizes
const STORAGE_KEY_PREFIX = 'oneprompt-wrapper-sizes';

// Module state for flex-based resize (horizontal/vertical modes)
let isResizing = false;
let currentWrapper = null;
let nextWrapper = null;
let startPos = { x: 0, y: 0 };
let startSizes = { current: 0, next: 0 };
let resizeDirection = null; // 'horizontal' or 'vertical'
let overlay = null;

// Module state for grid resize
let gridResizeState = {
  isResizing: false,
  type: null, // 'column' or 'row'
  index: null, // which column/row divider (0 = between col 0 and 1)
  startPos: 0,
  startSizes: [], // sizes of all columns or rows
  grid: null
};

// ResizeObserver for grid container
let gridResizeObserver = null;

/**
 * Get current layout mode from the grid element
 * @returns {string} 'horizontal', 'vertical', or 'grid'
 */
function getCurrentLayoutMode() {
  const grid = document.getElementById('webviewGrid');
  if (!grid) return 'horizontal';

  if (grid.classList.contains('layout-vertical')) return 'vertical';
  if (grid.classList.contains('layout-grid')) return 'grid';
  return 'horizontal';
}

/**
 * Get storage key for current layout mode
 * @returns {string} Storage key
 */
function getStorageKey() {
  return `${STORAGE_KEY_PREFIX}-${getCurrentLayoutMode()}`;
}

/**
 * Get all visible wrappers in order
 * @returns {HTMLElement[]} Array of visible wrappers
 */
function getVisibleWrappers() {
  const wrappers = Array.from(document.querySelectorAll('.webview-wrapper'));
  return wrappers
    .filter(w => w.style.display !== 'none')
    .sort((a, b) => {
      const orderA = parseInt(a.style.order) || 0;
      const orderB = parseInt(b.style.order) || 0;
      return orderA - orderB;
    });
}

/**
 * Get the next visible wrapper after the given one
 * @param {HTMLElement} wrapper - Current wrapper
 * @returns {HTMLElement|null} Next wrapper or null
 */
function getNextWrapper(wrapper) {
  const wrappers = getVisibleWrappers();
  const index = wrappers.indexOf(wrapper);
  if (index === -1 || index >= wrappers.length - 1) return null;
  return wrappers[index + 1];
}

/**
 * Apply flex-grow values to all visible wrappers (for horizontal/vertical modes)
 * @param {Object} ratios - Map of aiKey to flex-grow value
 */
function applyFlexRatios(ratios) {
  const wrappers = getVisibleWrappers();
  const layoutMode = getCurrentLayoutMode();

  if (layoutMode === 'grid') return; // Grid mode uses different approach

  wrappers.forEach(wrapper => {
    const aiKey = wrapper.dataset.aiKey;
    const ratio = ratios[aiKey] || 1;

    if (layoutMode === 'horizontal') {
      wrapper.style.flex = `${ratio} 1 0%`;
      wrapper.style.minWidth = '150px';
    } else if (layoutMode === 'vertical') {
      wrapper.style.flex = `${ratio} 1 0%`;
      wrapper.style.minHeight = '150px';
    }
  });
}

/**
 * Calculate current flex ratios from wrapper sizes (for horizontal/vertical modes)
 * @returns {Object} Map of aiKey to flex ratio
 */
function calculateCurrentRatios() {
  const wrappers = getVisibleWrappers();
  const layoutMode = getCurrentLayoutMode();
  const ratios = {};

  if (wrappers.length === 0 || layoutMode === 'grid') return ratios;

  // Get total size
  let totalSize = 0;
  const sizes = wrappers.map(wrapper => {
    const rect = wrapper.getBoundingClientRect();
    const size = layoutMode === 'vertical' ? rect.height : rect.width;
    totalSize += size;
    return { wrapper, size };
  });

  // Calculate ratios (normalize to make smallest = 1)
  const minSize = Math.min(...sizes.map(s => s.size));
  sizes.forEach(({ wrapper, size }) => {
    const aiKey = wrapper.dataset.aiKey;
    ratios[aiKey] = size / minSize;
  });

  return ratios;
}

// ============================================================
// GRID MODE: Column/Row structure detection and resizing
// ============================================================

/**
 * Get grid structure (number of columns, rows, and which wrapper is where)
 * @returns {Object} { cols, rows, grid: 2D array of wrappers }
 */
function getGridStructure() {
  const grid = document.getElementById('webviewGrid');
  const wrappers = getVisibleWrappers();

  if (!grid || wrappers.length === 0) {
    return { cols: 0, rows: 0, grid: [], colWidths: [], rowHeights: [] };
  }

  // Get positions of all wrappers
  const positions = wrappers.map(wrapper => {
    const rect = wrapper.getBoundingClientRect();
    return {
      wrapper,
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: rect.width,
      height: rect.height
    };
  });

  // Find unique column positions (by left edge)
  const uniqueLefts = [...new Set(positions.map(p => p.left))].sort((a, b) => a - b);
  const uniqueTops = [...new Set(positions.map(p => p.top))].sort((a, b) => a - b);

  const cols = uniqueLefts.length;
  const rows = uniqueTops.length;

  // Build 2D grid array
  const gridArray = Array(rows).fill(null).map(() => Array(cols).fill(null));

  positions.forEach(pos => {
    const colIndex = uniqueLefts.indexOf(pos.left);
    const rowIndex = uniqueTops.indexOf(pos.top);
    if (colIndex !== -1 && rowIndex !== -1) {
      gridArray[rowIndex][colIndex] = pos.wrapper;
    }
  });

  // Calculate column widths and row heights from actual wrapper sizes
  const colWidths = uniqueLefts.map((left, colIndex) => {
    // Find a wrapper in this column to get width
    for (let row = 0; row < rows; row++) {
      if (gridArray[row][colIndex]) {
        return gridArray[row][colIndex].getBoundingClientRect().width;
      }
    }
    return 0;
  });

  const rowHeights = uniqueTops.map((top, rowIndex) => {
    // Find a wrapper in this row to get height
    for (let col = 0; col < cols; col++) {
      if (gridArray[rowIndex][col]) {
        return gridArray[rowIndex][col].getBoundingClientRect().height;
      }
    }
    return 0;
  });

  return { cols, rows, grid: gridArray, colWidths, rowHeights };
}

/**
 * Apply explicit grid template columns and rows
 * @param {number[]} colWidths - Array of column widths in pixels
 * @param {number[]} rowHeights - Array of row heights in pixels
 */
function applyGridTemplate(colWidths, rowHeights) {
  const grid = document.getElementById('webviewGrid');
  if (!grid) return;

  // Convert to fr units for flexibility, using ratios
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const totalHeight = rowHeights.reduce((a, b) => a + b, 0);

  const colTemplate = colWidths.map(w => `${(w / totalWidth * colWidths.length).toFixed(3)}fr`).join(' ');
  const rowTemplate = rowHeights.map(h => `${(h / totalHeight * rowHeights.length).toFixed(3)}fr`).join(' ');

  grid.style.gridTemplateColumns = colTemplate;
  grid.style.gridTemplateRows = rowTemplate;

  logger.log('[Resizer] Grid template applied:', colTemplate, rowTemplate);
}

/**
 * Create grid resizers (column and row dividers)
 */
function createGridResizers() {
  const grid = document.getElementById('webviewGrid');
  if (!grid) return;

  // Remove existing grid resizers
  grid.querySelectorAll('.grid-col-resizer, .grid-row-resizer').forEach(r => r.remove());

  const structure = getGridStructure();
  const { cols, rows, colWidths, rowHeights } = structure;

  if (cols <= 1 && rows <= 1) return;

  const gridRect = grid.getBoundingClientRect();

  // Create column resizers (between columns)
  let accumulatedWidth = 0;
  for (let i = 0; i < cols - 1; i++) {
    accumulatedWidth += colWidths[i];
    const resizer = document.createElement('div');
    resizer.className = 'grid-col-resizer';
    resizer.style.left = `${accumulatedWidth - 4}px`;
    resizer.style.height = `${gridRect.height}px`;
    resizer.dataset.colIndex = i;
    resizer.addEventListener('mousedown', (e) => startGridResize(e, 'column', i));
    grid.appendChild(resizer);
  }

  // Create row resizers (between rows)
  let accumulatedHeight = 0;
  for (let i = 0; i < rows - 1; i++) {
    accumulatedHeight += rowHeights[i];
    const resizer = document.createElement('div');
    resizer.className = 'grid-row-resizer';
    resizer.style.top = `${accumulatedHeight - 4}px`;
    resizer.style.width = `${gridRect.width}px`;
    resizer.dataset.rowIndex = i;
    resizer.addEventListener('mousedown', (e) => startGridResize(e, 'row', i));
    grid.appendChild(resizer);
  }

  logger.log('[Resizer] Grid resizers created:', cols - 1, 'column,', rows - 1, 'row');
}

/**
 * Start grid resize operation
 * @param {MouseEvent} e - Mouse event
 * @param {string} type - 'column' or 'row'
 * @param {number} index - Index of the divider
 */
function startGridResize(e, type, index) {
  e.preventDefault();
  e.stopPropagation();

  const grid = document.getElementById('webviewGrid');
  const structure = getGridStructure();

  gridResizeState = {
    isResizing: true,
    type,
    index,
    startPos: type === 'column' ? e.clientX : e.clientY,
    startSizes: type === 'column' ? [...structure.colWidths] : [...structure.rowHeights],
    grid
  };

  // Add overlay
  overlay = document.createElement('div');
  overlay.className = 'resize-overlay' + (type === 'row' ? ' vertical' : '');
  document.body.appendChild(overlay);

  // Add resizing class
  document.body.classList.add('resizing-active');
  if (type === 'row') {
    document.body.classList.add('resizing-vertical');
  }

  document.addEventListener('mousemove', onGridResize);
  document.addEventListener('mouseup', stopGridResize);

  logger.log('[Resizer] Started grid resize:', type, index);
}

/**
 * Handle grid resize movement
 * @param {MouseEvent} e - Mouse event
 */
function onGridResize(e) {
  if (!gridResizeState.isResizing) return;

  const { type, index, startPos, startSizes, grid } = gridResizeState;
  const delta = type === 'column' ? e.clientX - startPos : e.clientY - startPos;

  const minSize = 150;
  const newSizes = [...startSizes];

  // Adjust the size of column/row at index and index+1
  let newSize1 = startSizes[index] + delta;
  let newSize2 = startSizes[index + 1] - delta;

  // Enforce minimum sizes
  if (newSize1 < minSize) {
    newSize1 = minSize;
    newSize2 = startSizes[index] + startSizes[index + 1] - minSize;
  }
  if (newSize2 < minSize) {
    newSize2 = minSize;
    newSize1 = startSizes[index] + startSizes[index + 1] - minSize;
  }

  newSizes[index] = newSize1;
  newSizes[index + 1] = newSize2;

  // Apply to grid
  if (type === 'column') {
    const structure = getGridStructure();
    applyGridTemplate(newSizes, structure.rowHeights);
  } else {
    const structure = getGridStructure();
    applyGridTemplate(structure.colWidths, newSizes);
  }

  // Update resizer positions
  updateGridResizerPositions();
}

/**
 * Update grid resizer positions after resize
 */
function updateGridResizerPositions() {
  const grid = document.getElementById('webviewGrid');
  if (!grid) return;

  const structure = getGridStructure();
  const { colWidths, rowHeights } = structure;
  const gridRect = grid.getBoundingClientRect();

  // Update column resizers
  let accumulatedWidth = 0;
  grid.querySelectorAll('.grid-col-resizer').forEach((resizer, i) => {
    accumulatedWidth += colWidths[i];
    resizer.style.left = `${accumulatedWidth - 4}px`;
    resizer.style.height = `${gridRect.height}px`;
  });

  // Update row resizers
  let accumulatedHeight = 0;
  grid.querySelectorAll('.grid-row-resizer').forEach((resizer, i) => {
    accumulatedHeight += rowHeights[i];
    resizer.style.top = `${accumulatedHeight - 4}px`;
    resizer.style.width = `${gridRect.width}px`;
  });
}

/**
 * Stop grid resize operation
 */
function stopGridResize() {
  if (!gridResizeState.isResizing) return;

  gridResizeState.isResizing = false;

  // Remove overlay
  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  // Remove resizing classes
  document.body.classList.remove('resizing-active', 'resizing-vertical');

  document.removeEventListener('mousemove', onGridResize);
  document.removeEventListener('mouseup', stopGridResize);

  // Save grid sizes
  saveGridSizes();

  logger.log('[Resizer] Stopped grid resize');
}

/**
 * Save grid sizes to localStorage
 */
function saveGridSizes() {
  const grid = document.getElementById('webviewGrid');
  if (!grid) return;

  const data = {
    gridTemplateColumns: grid.style.gridTemplateColumns,
    gridTemplateRows: grid.style.gridTemplateRows
  };

  if (data.gridTemplateColumns || data.gridTemplateRows) {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
    logger.log('[Resizer] Grid sizes saved:', data);
  }
}

/**
 * Restore grid sizes from localStorage
 */
function restoreGridSizes() {
  const stored = localStorage.getItem(getStorageKey());
  if (!stored) return;

  try {
    const data = JSON.parse(stored);
    const grid = document.getElementById('webviewGrid');
    if (grid && data.gridTemplateColumns) {
      grid.style.gridTemplateColumns = data.gridTemplateColumns;
    }
    if (grid && data.gridTemplateRows) {
      grid.style.gridTemplateRows = data.gridTemplateRows;
    }
    logger.log('[Resizer] Grid sizes restored:', data);
  } catch (e) {
    logger.error('[Resizer] Error restoring grid sizes:', e);
  }
}

// ============================================================
// HORIZONTAL/VERTICAL MODE: Flex-based resize
// ============================================================

/**
 * Save wrapper ratios to localStorage (for horizontal/vertical modes)
 */
function saveSizes() {
  const layoutMode = getCurrentLayoutMode();

  if (layoutMode === 'grid') {
    saveGridSizes();
    return;
  }

  const ratios = calculateCurrentRatios();

  if (Object.keys(ratios).length > 0) {
    localStorage.setItem(getStorageKey(), JSON.stringify(ratios));
    logger.log('[Resizer] Ratios saved:', ratios);
  }
}

/**
 * Restore wrapper ratios from localStorage
 */
function restoreSizes() {
  const layoutMode = getCurrentLayoutMode();

  if (layoutMode === 'grid') {
    restoreGridSizes();
    // Recreate grid resizers after restore
    setTimeout(createGridResizers, 50);
    return;
  }

  const stored = localStorage.getItem(getStorageKey());
  if (!stored) return;

  try {
    const ratios = JSON.parse(stored);
    applyFlexRatios(ratios);
    logger.log('[Resizer] Ratios restored:', ratios);
  } catch (e) {
    logger.error('[Resizer] Error restoring ratios:', e);
  }
}

/**
 * Clear all custom sizes (reset to equal distribution)
 */
function clearSizes() {
  const layoutMode = getCurrentLayoutMode();
  const wrappers = getVisibleWrappers();
  const grid = document.getElementById('webviewGrid');

  wrappers.forEach(wrapper => {
    wrapper.style.flex = '';
    wrapper.style.minWidth = '';
    wrapper.style.minHeight = '';
  });

  // Clear grid template if in grid mode
  if (grid) {
    grid.style.gridTemplateColumns = '';
    grid.style.gridTemplateRows = '';
  }

  // Clear from localStorage
  localStorage.removeItem(getStorageKey());
  logger.log('[Resizer] Sizes cleared');
}

/**
 * Create resize handle for a wrapper (for horizontal/vertical modes)
 * @param {HTMLElement} wrapper - The wrapper element
 */
function createResizer(wrapper) {
  // Remove existing resizers from wrapper
  wrapper.querySelectorAll('.webview-resizer').forEach(r => r.remove());

  const layoutMode = getCurrentLayoutMode();

  // Grid mode uses global resizers, not per-wrapper
  if (layoutMode === 'grid') return;

  // Only add resizer if there's a next wrapper
  const next = getNextWrapper(wrapper);
  if (!next) return;

  const resizer = document.createElement('div');
  resizer.className = 'webview-resizer';
  resizer.addEventListener('mousedown', (e) => startResize(e, wrapper, layoutMode === 'vertical' ? 'vertical' : 'horizontal'));
  wrapper.appendChild(resizer);
}

/**
 * Start resize operation (for horizontal/vertical modes)
 * @param {MouseEvent} e - Mouse event
 * @param {HTMLElement} wrapper - Wrapper being resized
 * @param {string} direction - 'horizontal' or 'vertical'
 */
function startResize(e, wrapper, direction) {
  e.preventDefault();
  e.stopPropagation();

  const next = getNextWrapper(wrapper);
  if (!next) return;

  isResizing = true;
  currentWrapper = wrapper;
  nextWrapper = next;
  resizeDirection = direction;
  startPos = { x: e.clientX, y: e.clientY };

  const currentRect = wrapper.getBoundingClientRect();
  const nextRect = next.getBoundingClientRect();

  startSizes = {
    current: direction === 'vertical' ? currentRect.height : currentRect.width,
    next: direction === 'vertical' ? nextRect.height : nextRect.width
  };

  // Add overlay
  overlay = document.createElement('div');
  overlay.className = 'resize-overlay' + (direction === 'vertical' ? ' vertical' : '');
  document.body.appendChild(overlay);

  // Add resizing class
  document.body.classList.add('resizing-active');
  if (direction === 'vertical') {
    document.body.classList.add('resizing-vertical');
  }

  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);

  logger.log('[Resizer] Started resize:', direction);
}

/**
 * Handle resize movement (for horizontal/vertical modes)
 * @param {MouseEvent} e - Mouse event
 */
function onResize(e) {
  if (!isResizing || !currentWrapper || !nextWrapper) return;

  const delta = resizeDirection === 'vertical'
    ? e.clientY - startPos.y
    : e.clientX - startPos.x;

  const minSize = 150;
  let newCurrentSize = startSizes.current + delta;
  let newNextSize = startSizes.next - delta;

  // Enforce minimum sizes
  if (newCurrentSize < minSize) {
    newCurrentSize = minSize;
    newNextSize = startSizes.current + startSizes.next - minSize;
  }
  if (newNextSize < minSize) {
    newNextSize = minSize;
    newCurrentSize = startSizes.current + startSizes.next - minSize;
  }

  // Calculate flex-grow ratios
  const totalSize = newCurrentSize + newNextSize;
  const currentRatio = newCurrentSize / totalSize * 2;
  const nextRatio = newNextSize / totalSize * 2;

  // Apply to the two affected wrappers
  if (resizeDirection === 'vertical') {
    currentWrapper.style.flex = `${currentRatio} 1 0%`;
    currentWrapper.style.minHeight = `${minSize}px`;
    nextWrapper.style.flex = `${nextRatio} 1 0%`;
    nextWrapper.style.minHeight = `${minSize}px`;
  } else {
    currentWrapper.style.flex = `${currentRatio} 1 0%`;
    currentWrapper.style.minWidth = `${minSize}px`;
    nextWrapper.style.flex = `${nextRatio} 1 0%`;
    nextWrapper.style.minWidth = `${minSize}px`;
  }
}

/**
 * Stop resize operation (for horizontal/vertical modes)
 */
function stopResize() {
  if (!isResizing) return;

  isResizing = false;

  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  document.body.classList.remove('resizing-active', 'resizing-vertical');

  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);

  saveSizes();

  currentWrapper = null;
  nextWrapper = null;
  resizeDirection = null;

  logger.log('[Resizer] Stopped resize');
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Setup ResizeObserver for grid mode to update resizer positions on window resize
 */
function setupGridResizeObserver() {
  const grid = document.getElementById('webviewGrid');
  if (!grid) return;

  // Disconnect existing observer
  if (gridResizeObserver) {
    gridResizeObserver.disconnect();
    gridResizeObserver = null;
  }

  // Only observe in grid mode
  if (getCurrentLayoutMode() !== 'grid') return;

  gridResizeObserver = new ResizeObserver(() => {
    // Don't update during active resize
    if (gridResizeState.isResizing) return;

    // Debounce: update positions after resize settles
    clearTimeout(gridResizeObserver._debounceTimer);
    gridResizeObserver._debounceTimer = setTimeout(() => {
      updateGridResizerPositions();
    }, 50);
  });

  gridResizeObserver.observe(grid);
  logger.log('[Resizer] Grid ResizeObserver started');
}

/**
 * Add resizers to all visible wrappers
 */
function initResizers() {
  const layoutMode = getCurrentLayoutMode();
  const wrappers = getVisibleWrappers();

  if (layoutMode === 'grid') {
    // Grid mode: create global column/row resizers
    setTimeout(() => {
      createGridResizers();
      setupGridResizeObserver();
    }, 50);
  } else {
    // Horizontal/Vertical: create per-wrapper resizers
    wrappers.forEach(wrapper => createResizer(wrapper));
    // Disconnect grid observer if active
    if (gridResizeObserver) {
      gridResizeObserver.disconnect();
      gridResizeObserver = null;
    }
  }

  // Restore saved sizes
  restoreSizes();

  logger.log('[Resizer] Initialized for', wrappers.length, 'wrappers in', layoutMode, 'mode');
}

/**
 * Update resizers when layout mode changes
 * Also clears custom sizes as per user preference
 */
function onLayoutModeChange() {
  // Disconnect grid resize observer
  if (gridResizeObserver) {
    gridResizeObserver.disconnect();
    gridResizeObserver = null;
  }

  // Remove all resizers
  const grid = document.getElementById('webviewGrid');
  if (grid) {
    grid.querySelectorAll('.grid-col-resizer, .grid-row-resizer').forEach(r => r.remove());
  }
  document.querySelectorAll('.webview-resizer').forEach(r => r.remove());

  // Clear all custom sizes
  clearSizes();

  // Recreate resizers for new layout mode
  setTimeout(() => {
    initResizers();
    logger.log('[Resizer] Layout mode changed, sizes reset');
  }, 50);
}

/**
 * Add resizer to a single new wrapper (or reinitialize all resizers)
 * @param {HTMLElement} wrapper - The new wrapper (optional, used for logging)
 */
function addResizerToWrapper(wrapper) {
  // Use longer timeout to ensure wrapper is fully in DOM with correct styles
  setTimeout(() => {
    const layoutMode = getCurrentLayoutMode();

    // Simplest approach: reinitialize all resizers
    // This ensures consistency when wrappers are added/removed
    if (layoutMode === 'grid') {
      createGridResizers();
    } else {
      // Remove all existing resizers first
      document.querySelectorAll('.webview-resizer').forEach(r => r.remove());

      // Recreate resizers for all visible wrappers
      const wrappers = getVisibleWrappers();
      wrappers.forEach(w => createResizer(w));
    }

    // Restore saved sizes
    restoreSizes();

    logger.log('[Resizer] Resizers updated after wrapper change, total:', getVisibleWrappers().length);
  }, 100); // Increased timeout for DOM stability
}

// Export for module usage
if (typeof window !== 'undefined') {
  window.OnePromptUI = window.OnePromptUI || {};
  window.OnePromptUI.resizer = {
    initResizers,
    addResizerToWrapper,
    onLayoutModeChange,
    clearSizes,
    saveSizes,
    restoreSizes
  };
}

export {
  initResizers,
  addResizerToWrapper,
  onLayoutModeChange,
  clearSizes,
  saveSizes,
  restoreSizes
};
