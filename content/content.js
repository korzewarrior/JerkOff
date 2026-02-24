// State variables
let activeInput = null;
let analyzeButton = null;
let suggestionPopup = null;

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
}

function init() {
    createAnalyzeButton();
    createSuggestionPopup();

    // Listen for focus events on inputs
    document.addEventListener('focusin', handleFocus);

    // Also listen for clicks in case focusin isn't enough for some rich text editors
    document.addEventListener('click', (e) => {
        // Check if clicking inside our own UI
        if (e.target.closest('#jerkoff-analyze-btn') || e.target.closest('#jerkoff-suggestion-popup')) {
            return;
        }
        handleFocus(e);
    });
}

function handleFocus(e) {
    const target = e.target;

    // Check if target is a text area, text input, or contenteditable element
    const isInput = target.tagName === 'TEXTAREA' ||
        (target.tagName === 'INPUT' && target.type === 'text') ||
        target.isContentEditable;

    // We ignore our own UI elements, just in case
    if (target.closest('#jerkoff-suggestion-popup') || target.id === 'jerkoff-analyze-btn') return;

    if (isInput) {
        activeInput = target;
        showAnalyzeButton(target);
    } else {
        // If clicked outside, hide the button (but not if clicking the button itself)
        if (!e.target.closest('#jerkoff-analyze-btn') && !e.target.closest('#jerkoff-suggestion-popup')) {
            hideAnalyzeButton();
        }
    }
}

function createAnalyzeButton() {
    analyzeButton = document.createElement('button');
    analyzeButton.id = 'jerkoff-analyze-btn';
    analyzeButton.className = 'jerkoff-hidden';
    analyzeButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
    Jerk Off
  `;

    analyzeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        analyzeText();
    });

    document.body.appendChild(analyzeButton);
}

function createSuggestionPopup() {
    suggestionPopup = document.createElement('div');
    suggestionPopup.id = 'jerkoff-suggestion-popup';
    suggestionPopup.className = 'jerkoff-hidden';

    suggestionPopup.innerHTML = `
    <div class="jerkoff-header">
      <span class="jerkoff-title">JERKING</span>
      <button class="jerkoff-close" title="Close">×</button>
    </div>
    <div class="jerkoff-content">
      <div id="jerkoff-loading" class="jerkoff-hidden">
        <div class="jerkoff-spinner"></div>
        <span>Jerking off...</span>
      </div>
      <div id="jerkoff-suggestion-text"></div>
      <div id="jerkoff-error-text" class="jerkoff-hidden"></div>
    </div>
    <div class="jerkoff-footer">
      <button id="jerkoff-replace-btn">ACCEPT</button>
    </div>
  `;

    suggestionPopup.querySelector('.jerkoff-close').addEventListener('click', hidePopup);
    suggestionPopup.querySelector('#jerkoff-replace-btn').addEventListener('click', replaceText);

    document.body.appendChild(suggestionPopup);
}

function showAnalyzeButton(element) {
    if (!analyzeButton) return;

    const rect = element.getBoundingClientRect();

    // Position the button at the bottom right corner of the input field
    analyzeButton.style.top = `${window.scrollY + rect.bottom - 35}px`;
    analyzeButton.style.left = `${window.scrollX + rect.right - 100}px`;
    analyzeButton.classList.remove('jerkoff-hidden');
    analyzeButton.classList.add('jerkoff-visible');
}

function hideAnalyzeButton() {
    if (!analyzeButton) return;
    analyzeButton.classList.remove('jerkoff-visible');
    analyzeButton.classList.add('jerkoff-hidden');
}

function showPopup(element) {
    if (!suggestionPopup) return;

    const rect = element.getBoundingClientRect();

    // Position below the input
    suggestionPopup.style.top = `${window.scrollY + rect.bottom + 10}px`;

    // Try to align with the left edge, but don't go offscreen
    let leftPos = window.scrollX + rect.left;
    if (leftPos + 350 > window.innerWidth) {
        leftPos = window.innerWidth - 370; // 350 popup width + 20 margin
    }

    suggestionPopup.style.left = `${Math.max(20, leftPos)}px`;
    suggestionPopup.classList.remove('jerkoff-hidden');
    suggestionPopup.classList.add('jerkoff-visible');
}

function hidePopup() {
    if (!suggestionPopup) return;
    suggestionPopup.classList.remove('jerkoff-visible');
    suggestionPopup.classList.add('jerkoff-hidden');
}

function getTextInput() {
    if (!activeInput) return '';

    if (activeInput.isContentEditable) {
        return activeInput.innerText;
    }
    return activeInput.value;
}

function setTextInput(newText) {
    if (!activeInput) return;

    if (activeInput.isContentEditable) {
        // For contentEditable elements (used by X.com, Facebook, etc.),
        // we must use execCommand so the framework's internal state updates.
        // Simply setting innerText doesn't update React/Draft.js state.
        activeInput.focus();

        // Select all existing content
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(activeInput);
        selection.removeAllRanges();
        selection.addRange(range);

        // insertText replaces the selection and fires proper input events
        // that React/Draft.js frameworks listen to
        document.execCommand('insertText', false, newText);
    } else {
        // Native setter hack to bypass React's event pooling
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;

        if (activeInput.tagName === 'TEXTAREA') {
            nativeTextAreaValueSetter.call(activeInput, newText);
        } else {
            nativeInputValueSetter.call(activeInput, newText);
        }

        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        activeInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function getPageContext(element) {
    let context = "";

    // Specific logic for Twitter/X
    if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
        // Find the article (tweet) closest to the input, or the one right above it
        const replyContainer = element.closest('[data-testid="reply"]');
        if (replyContainer) {
            // We're in a modal reply, find the tweet text in the modal
            const modal = element.closest('[aria-labelledby="modal-header"]');
            if (modal) {
                const tweetTexts = modal.querySelectorAll('[data-testid="tweetText"]');
                if (tweetTexts.length > 0) {
                    // Get the first one, which is usually the tweet being replied to
                    context = Array.from(tweetTexts).map(t => t.innerText).join(' ');
                }
            }
        } else {
            // In-line reply, try to find preceding sibling or parent's sibling
            const cell = element.closest('[data-testid="cellInnerDiv"]');
            if (cell && cell.previousElementSibling) {
                const prevTweet = cell.previousElementSibling.querySelector('[data-testid="tweetText"]');
                if (prevTweet) context = prevTweet.innerText;
            }
        }
    }

    // Generic fallback: grab text from the parent container or surrounding paragraphs
    if (!context) {
        const parent = element.parentElement;
        if (parent) {
            // Just grab some text from the parent as a weak fallback
            context = parent.innerText.replace(getTextInput(), '').trim().substring(0, 500);
        }
    }

    return context;
}

async function analyzeText() {
    const text = getTextInput();
    const context = getPageContext(activeInput);

    if (!text || text.trim() === '') {
        alert("Please enter some text first.");
        return;
    }

    showPopup(activeInput);

    const loadingEl = document.getElementById('jerkoff-loading');
    const suggestionEl = document.getElementById('jerkoff-suggestion-text');
    const errorEl = document.getElementById('jerkoff-error-text');
    const replaceBtn = document.getElementById('jerkoff-replace-btn');

    // UI Loading state
    loadingEl.classList.remove('jerkoff-hidden');
    suggestionEl.classList.add('jerkoff-hidden');
    errorEl.classList.add('jerkoff-hidden');
    replaceBtn.disabled = true;

    try {
        // Send message to background script
        chrome.runtime.sendMessage({ action: 'analyzeText', text: text, context: context }, (response) => {
            // Chrome extension message handling can fail silently if the background script isn't ready
            // or throws an error during the message dispatch
            if (chrome.runtime.lastError) {
                showError("Extension connection error: " + chrome.runtime.lastError.message);
                return;
            }

            if (response && response.error) {
                showError(response.error);
            } else if (response && response.suggestedText) {
                showSuggestion(response.suggestedText);
            } else {
                showError("Received invalid response from analysis.");
            }
        });
    } catch (err) {
        showError(err.message);
    }

    function showSuggestion(suggestedText) {
        loadingEl.classList.add('jerkoff-hidden');
        suggestionEl.textContent = suggestedText;
        suggestionEl.classList.remove('jerkoff-hidden');
        replaceBtn.disabled = false;

        // Store the suggestion on the button so replaceText can access it
        replaceBtn.dataset.suggestion = suggestedText;
    }

    function showError(errorMsg) {
        loadingEl.classList.add('jerkoff-hidden');
        errorEl.textContent = errorMsg;
        errorEl.classList.remove('jerkoff-hidden');
        replaceBtn.disabled = true;
    }
}

function replaceText() {
    const replaceBtn = document.getElementById('jerkoff-replace-btn');
    const suggestion = replaceBtn.dataset.suggestion;

    if (suggestion) {
        setTextInput(suggestion);
        hidePopup();

        // Optional: Return focus to input
        if (activeInput) {
            activeInput.focus();
        }
    }
}
