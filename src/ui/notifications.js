/**
 * OnePrompt Notifications Module
 * 
 * Handles toast notifications display.
 * Uses IIFE pattern to avoid global scope pollution.
 * 
 * Exposes: window.OnePromptUI.notifications
 */
(function() {
  'use strict';

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Notification type: 'info', 'success', 'error', 'warning'
   */
  function showNotification(message, type = 'info') {
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

  // =====================================================
  // EXPOSE MODULE VIA GLOBAL OBJECT
  // =====================================================

  // Ensure namespace exists
  window.OnePromptUI = window.OnePromptUI || {};

  // Expose notifications module
  window.OnePromptUI.notifications = {
    show: showNotification
  };

})();
