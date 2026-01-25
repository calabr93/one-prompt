/**
 * OnePrompt Notifications Module
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
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Auto-remove after 2 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Alias for backward compatibility
export const show = showNotification;

// Export as default object for backward compatibility
export default {
  show: showNotification,
  showNotification
};
