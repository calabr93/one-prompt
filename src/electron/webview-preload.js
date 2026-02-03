const { ipcRenderer } = require('electron');

// Inject custom scrollbar styles
(function injectCustomScrollbar() {
  const style = document.createElement('style');
  style.textContent = `
    /* Custom scrollbar for OnePrompt */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #2d2d2d;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #404040;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #666666;
    }
    
    /* Dark mode override for light themes */
    @media (prefers-color-scheme: light) {
      ::-webkit-scrollbar-track {
        background: #f5f5f7;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #d1d1d6;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #a0a0a0;
      }
    }
  `;
  
  // Wait for DOM to be ready
  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(style);
    });
  }
})();

// Add Zoom controls support
document.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? e.metaKey : e.ctrlKey;

  if (modKey) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.sendToHost('zoom-change', 'in');
    } else if (e.key === '-') {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.sendToHost('zoom-change', 'out');
    } else if (e.key === '0') {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.sendToHost('zoom-change', 'reset');
    }
  }
});
