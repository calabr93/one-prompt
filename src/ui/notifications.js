/**
 * Notifications module
 *
 * Handles toast notifications display.
 *
 * @module @ui/notifications
 */

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Notification type: 'info', 'success', 'error', 'warning'
 */
export function showNotification(message, type = 'info') {
  // Remove existing notification if any
  const existing = document.querySelector('.notification-toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
