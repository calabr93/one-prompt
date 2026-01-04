const { ipcRenderer } = require('electron');

// Helper to simulate typing
function setNativeValue(element, value) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  
  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter.call(element, value);
  }
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

// Helper to simulate Enter key
function pressEnter(element) {
  const eventOptions = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  };
  
  element.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
  element.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
  element.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
}

ipcRenderer.on('send-prompt', (event, { prompt, aiKey, injectionRules }) => {
  console.log(`[OnePrompt] Received prompt for ${aiKey} (length: ${prompt.length})`);
  ipcRenderer.sendToHost('console-log', `[OnePrompt] Received prompt for ${aiKey} (len: ${prompt.length})`);

  // Reset il flag per permettere nuovo invio
  sendButtonClicked = false;

  if (!injectionRules) {
    console.error('[OnePrompt] No injection rules provided');
    return;
  }

  try {
    let inputEl = null;

    // 1. Find Input using dynamic selectors
    const selectors = injectionRules.selectors;
    
    // Try main input selector
    if (selectors.input) {
      inputEl = document.querySelector(selectors.input);
    }
    
    // Try alternative selector if main fails
    if (!inputEl && selectors.inputAlt) {
      inputEl = document.querySelector(selectors.inputAlt);
    }

    if (!inputEl) {
      console.error('[OnePrompt] Input element not found');
      ipcRenderer.sendToHost('console-log', `[OnePrompt] Input element not found for ${aiKey}`);
      return;
    }
    
    console.log('[OnePrompt] Found input element:', inputEl.tagName, inputEl.placeholder);
    ipcRenderer.sendToHost('console-log', `[OnePrompt] Found input: ${inputEl.tagName}`);

    // 2. Fill Input based on type
    console.log('[OnePrompt] Focusing and filling input...');
    ipcRenderer.sendToHost('console-log', '[OnePrompt] Filling input...');
    
    inputEl.focus();
    inputEl.click();
    
    if (injectionRules.inputType === 'textarea' || inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      // For textarea/input
      // Use multiple methods to ensure React/framework picks up the change

      // Method 1: Direct value setter (works for most React apps)
      const descriptor = Object.getOwnPropertyDescriptor(inputEl, 'value') ||
                        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
      if (descriptor && descriptor.set) {
        descriptor.set.call(inputEl, prompt);
      } else {
        inputEl.value = prompt;
      }

      // Method 2: Trigger React events in the right order
      // Focus and click to ensure the element is active
      inputEl.focus();
      inputEl.click();

      // Simulate user typing with proper event sequence
      inputEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));

      // Copilot specific: needs explicit keyup to enable send button
      if (aiKey === 'copilot') {
         inputEl.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
         inputEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));
      }

      // Additional React-specific events
      inputEl.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: null // Changed from prompt to null to avoid duplication in some frameworks
      }));

      console.log('[OnePrompt] Input filled with:', prompt.substring(0, 50) + '...');
      ipcRenderer.sendToHost('console-log', '[OnePrompt] Input filled');

      // Longer delay to ensure React state updates
      setTimeout(() => {
        sendButtonAfterTyping(aiKey, inputEl, selectors);
      }, 1500);
    } else {
      // Contenteditable (usato da Perplexity, Claude, etc.)
      inputEl.focus();
      inputEl.click();

      console.log('[OnePrompt] Using Paste Simulation for contenteditable...');
      ipcRenderer.sendToHost('console-log', '[OnePrompt] Simulating paste...');

      // Metodo 1: Clipboard Event (più robusto per editor ricchi come Perplexity)
      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', prompt);
        
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer
        });
        
        inputEl.dispatchEvent(pasteEvent);
      } catch (e) {
        console.error('[OnePrompt] Paste event failed:', e);
      }

      // Verifica e Fallback: Se il paste non ha funzionato (o l'editor non lo gestisce), usa execCommand
      setTimeout(() => {
        const currentText = inputEl.textContent || inputEl.innerText || '';
        // Se il testo è molto più corto del prompt, assumiamo che il paste non abbia funzionato
        if (currentText.length < prompt.length * 0.5) {
          console.log('[OnePrompt] Paste failed or ignored, falling back to execCommand...');
          
          // Assicurati del focus
          inputEl.focus();
          
          // Seleziona tutto il contenuto esistente per sovrascrivere (opzionale, ma più pulito)
          // document.execCommand('selectAll', false, null);
          
          // Inserisci testo
          const success = document.execCommand('insertText', false, prompt);
          
          if (!success) {
             // Ultimo tentativo: manipolazione DOM diretta (sconsigliato per React ma necessario come ultima spiaggia)
             inputEl.innerText = prompt;
          }
        }

        // Trigger events to notify framework
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: null
        });
        inputEl.dispatchEvent(inputEvent);
        
        // Simula keyup per aggiornare lo stato UI
        inputEl.dispatchEvent(new KeyboardEvent('keyup', {
          bubbles: true,
          cancelable: true,
          key: ' ', 
          code: 'Space'
        }));

        console.log('[OnePrompt] Injection completed');
        ipcRenderer.sendToHost('console-log', '[OnePrompt] Injection completed');

        // Dopo injection, aspetta che UI reagisca e poi clicca bottone
        setTimeout(() => {
          sendButtonAfterTyping(aiKey, inputEl, selectors);
        }, 800);
      }, 100);
      
      return; 
    }
  } catch (err) {
    console.error('[OnePrompt] Error injecting prompt:', err);
  }
});

// Flag per evitare click multipli
let sendButtonClicked = false;

// Helper function to find the closest button to an input element
function findClosestButton(inputEl, buttons) {
  if (!buttons || buttons.length === 0) return null;
  if (buttons.length === 1) return buttons[0];

  let closestButton = null;
  let minDistance = Infinity;

  const inputRect = inputEl.getBoundingClientRect();
  const inputCenter = {
    x: inputRect.left + inputRect.width / 2,
    y: inputRect.top + inputRect.height / 2
  };

  buttons.forEach(button => {
    const buttonRect = button.getBoundingClientRect();
    const buttonCenter = {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top + buttonRect.height / 2
    };

    // Calculate distance between centers
    const distance = Math.sqrt(
      Math.pow(buttonCenter.x - inputCenter.x, 2) +
      Math.pow(buttonCenter.y - inputCenter.y, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestButton = button;
    }
  });

  console.log(`[OnePrompt] Found ${buttons.length} buttons, selected closest one at distance ${minDistance.toFixed(2)}px`);
  return closestButton;
}

// Helper function per cliccare il bottone dopo injection/typing
function sendButtonAfterTyping(aiKey, inputEl, selectors) {
  // Previeni click multipli
  if (sendButtonClicked) {
    console.log('[OnePrompt] Send button already clicked, skipping');
    return;
  }

  // Grok specific: Force Enter key as it's more reliable on X.com
  if (aiKey === 'grok') {
    console.log('[OnePrompt] Grok detected, using Enter key strategy');
    ipcRenderer.sendToHost('console-log', '[OnePrompt] Using Enter key for Grok');
    
    sendButtonClicked = true;
    pressEnter(inputEl);
    
    // Reset flag
    setTimeout(() => {
      sendButtonClicked = false;
    }, 5000);
    
    ipcRenderer.sendToHost('status-update', 'sent');
    return;
  }

  let sendBtnEl = null;

  // Try finding send button using dynamic selectors
  if (selectors && selectors.sendBtn) {
    const buttons = document.querySelectorAll(selectors.sendBtn);
    if (buttons.length === 1) {
      sendBtnEl = buttons[0];
    } else if (buttons.length > 1) {
      // Multiple buttons found, find the closest one to the input
      sendBtnEl = findClosestButton(inputEl, buttons);
    }
  }

  // Try alternative send button selector if main fails
  if (!sendBtnEl && selectors && selectors.sendBtnAlt) {
    const buttons = document.querySelectorAll(selectors.sendBtnAlt);
    if (buttons.length === 1) {
      sendBtnEl = buttons[0];
    } else if (buttons.length > 1) {
      // Multiple buttons found, find the closest one to the input
      sendBtnEl = findClosestButton(inputEl, buttons);
    }
  }

  console.log('[OnePrompt] Send button found:', !!sendBtnEl, 'disabled:', sendBtnEl?.disabled);

  // Additional logging for debugging
  if (!sendBtnEl && selectors) {
    console.log('[OnePrompt] Button selectors used:', selectors.sendBtn, selectors.sendBtnAlt);
    const allButtons = document.querySelectorAll('button');
    console.log('[OnePrompt] Total buttons on page:', allButtons.length);
    // Log first few buttons for debugging
    allButtons.forEach((btn, i) => {
      if (i < 3) {
        console.log(`[OnePrompt] Button ${i}:`, {
          testId: btn.getAttribute('data-testid'),
          ariaLabel: btn.getAttribute('aria-label'),
          disabled: btn.disabled
        });
      }
    });
  }

  // Check if button is visually disabled via aria-disabled
  const isAriaDisabled = sendBtnEl && sendBtnEl.getAttribute('aria-disabled') === 'true';

  if (sendBtnEl && !sendBtnEl.disabled && !isAriaDisabled) {
    console.log('[OnePrompt] Clicking send button');
    ipcRenderer.sendToHost('console-log', '[OnePrompt] Clicking send button');

    // Marca come cliccato PRIMA di cliccare per evitare race conditions
    sendButtonClicked = true;

    // Enhanced click simulation for modern frameworks
    sendBtnEl.focus();
    
    // Dispatch mouse events sequence
    // const mouseEventProps = {
    //   bubbles: true,
    //   cancelable: true,
    //   view: window
    // };

    // sendBtnEl.dispatchEvent(new MouseEvent('mousedown', mouseEventProps));
    // sendBtnEl.dispatchEvent(new MouseEvent('mouseup', mouseEventProps));
    sendBtnEl.click();

    console.log('[OnePrompt] Button clicked (enhanced)');

    // Reset flag dopo 5 secondi per permettere nuovi invii futuri
    setTimeout(() => {
      sendButtonClicked = false;
    }, 5000);
  } else {
    // Fallback to Enter
    console.log('[OnePrompt] Button disabled or not found, trying Enter key');
    ipcRenderer.sendToHost('console-log', '[OnePrompt] Trying Enter key');

    // Marca come cliccato
    sendButtonClicked = true;

    pressEnter(inputEl);

    // Reset flag dopo 5 secondi
    setTimeout(() => {
      sendButtonClicked = false;
    }, 5000);
  }

  // Notify host that we sent the prompt
  ipcRenderer.sendToHost('status-update', 'sent');
}
