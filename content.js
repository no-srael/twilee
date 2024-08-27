(function() {
  let settings;
  let replaceAllWords = false;

  // Load settings from storage
  function loadSettings() {
    browser.storage.sync.get(['settings', 'replaceAllWords']).then((result) => {
      if (result.settings) {
        settings = result.settings;
        // Convert wordList to RegExp objects
        settings.wordList = settings.wordList.map(word => new RegExp(`\\b${word}\\b`, 'i'));
        const lowerCaseWords = {};
        for (const [key, value] of Object.entries(settings.letterWordMapping.words)) {
          lowerCaseWords[key.toLowerCase()] = value;
        }
        settings.letterWordMapping.words = lowerCaseWords;
      } else {
        // If not in storage, load from default JSON file
        fetch(browser.runtime.getURL('default_twilee_settings.json'))
          .then(response => response.json())
          .then(defaultSettings => {
            settings = defaultSettings;
            // Convert wordList to RegExp objects
            settings.wordList = settings.wordList.map(word => new RegExp(`\\b${word}\\b`, 'i'));
            const lowerCaseWords = {};
            for (const [key, value] of Object.entries(settings.letterWordMapping.words)) {
              lowerCaseWords[key.toLowerCase()] = value;
            }
            settings.letterWordMapping.words = lowerCaseWords;
            // Save defaults to storage
            return browser.storage.sync.set({ settings });
          });
      }
      replaceAllWords = result.replaceAllWords || false;
      console.log('Settings loaded:', settings);
      console.log('Replace all words:', replaceAllWords);
    }).catch(error => {
      console.error('Error loading settings:', error);
    });
  }

  // Initial load
  loadSettings();

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.settings) {
        settings = changes.settings.newValue;
        // Convert wordList to RegExp objects
        settings.wordList = settings.wordList.map(word => new RegExp(`\\b${word}\\b`, 'i'));
        console.log('Settings updated:', settings);
      }
      if (changes.replaceAllWords) {
        replaceAllWords = changes.replaceAllWords.newValue;
        console.log('Replace all words updated:', replaceAllWords);
      }
    }
  });


  function replaceWords(text) {
    if (!settings || !settings.wordList || !settings.letterWordMapping) {
      console.warn('Settings not loaded yet');
      return text;
    }
    console.log('Replacing words in:', text);

    let replacedText = text;
    let lastReplacedText;

    do {
      lastReplacedText = replacedText;
      if (replaceAllWords) {
        replacedText = replacedText.replace(/\b\w+\b/g, match => replaceWord(match));
      } else {
        replacedText = settings.wordList.reduce((currentText, wordRegex) => {
          return currentText.replace(wordRegex, match => replaceWord(match));
        }, replacedText);
      }
    } while (replacedText !== lastReplacedText);

    return replacedText;
  }

  function replaceWord(match) {
    const lowerMatch = match.toLowerCase();
    let replacement;

    // Check if there's a direct word replacement
    const directReplacement = Object.entries(settings.letterWordMapping.words).find(([key]) => 
      new RegExp(`\\b${key}\\b`, 'i').test(lowerMatch)
    );

    if (directReplacement) {
      const [, alternatives] = directReplacement;
      if (Array.isArray(alternatives)) {
        const chosenAlternative = alternatives[Math.floor(Math.random() * alternatives.length)];
        if (Array.isArray(chosenAlternative)) {
          replacement = chosenAlternative.map(sublist => 
            sublist[Math.floor(Math.random() * sublist.length)]
          ).join('');
        } else {
          replacement = chosenAlternative;
        }
      } else {
        replacement = alternatives;
      }
    } else {
      // Letter-by-letter replacement
      replacement = match.split('').map(char => {
        const lowerChar = char.toLowerCase();
        if (settings.letterWordMapping.letters[lowerChar] && settings.letterWordMapping.letters[lowerChar].length > 0) {
          const alternatives = settings.letterWordMapping.letters[lowerChar];
          return alternatives[Math.floor(Math.random() * alternatives.length)];
        }
        return char;
      }).join('');
    }
    return replacement;
  }

  function findTweetInputSpans(context) {
    return context.querySelectorAll('[data-text="true"]');
  }

  function findTweetInputContainer(context) {
    return context.querySelector('[data-testid="tweetTextarea_0"]');
  }

  function getSpanText(spanElement) {
    return spanElement.textContent || '';
  }

  function findTweetInputContainer(context) {
    return context.querySelector('[data-testid="tweetTextarea_0"]');
  }

  function replaceTextInSpans(context) {
    const spans = findTweetInputSpans(context);
    spans.forEach((span, index) => {
      const originalText = getSpanText(span);
      const replacedText = replaceWords(originalText);
      setSpanText(span, replacedText);

      // Workaround for the first span
      if (index === 0) {
        setTimeout(() => {
          // Create and dispatch a 'input' event
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          span.dispatchEvent(inputEvent);

          // Create and dispatch a 'change' event
          const changeEvent = new Event('change', { bubbles: true, cancelable: true });
          span.dispatchEvent(changeEvent);

          // Optionally, try to focus and blur the span
          span.focus();
          setTimeout(() => span.blur(), 10);
        }, 100);
      }
    });

    // After replacing all spans, trigger a global update
    setTimeout(() => {
      const container = findTweetInputContainer(context);
      if (container) {
        const globalInputEvent = new Event('input', { bubbles: true, cancelable: true });
        container.dispatchEvent(globalInputEvent);
      }
    }, 200);
  }

  function setSpanText(spanElement, text) {
    if (spanElement) {
      let startOffset = 0;
      let endOffset = 0;

      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Check if the selection is within our span
        if (spanElement.contains(range.startContainer) && spanElement.contains(range.endContainer)) {
          startOffset = range.startOffset;
          endOffset = range.endOffset;
        }
      }

      spanElement.textContent = text;

      try {
        const newRange = document.createRange();
        newRange.setStart(spanElement.firstChild, Math.min(startOffset, text.length));
        newRange.setEnd(spanElement.firstChild, Math.min(endOffset, text.length));
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        console.warn('Could not restore selection:', e);
      }

      console.log('Span text updated:', text);

      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      spanElement.dispatchEvent(inputEvent);
    } else {
      console.warn('Unable to find span element');
    }
  }

  function createReplaceButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.alignItems = 'center';
    buttonContainer.style.marginLeft = '10px';

    const replaceButton = document.createElement('button');
    replaceButton.innerHTML = '👺';
    replaceButton.style.width = '36px';
    replaceButton.style.height = '36px';
    replaceButton.style.borderRadius = '12px';
    replaceButton.style.border = 'none';
    replaceButton.style.backgroundColor = 'transparent';
    replaceButton.style.color = 'inherit';
    replaceButton.style.fontSize = '24px';
    replaceButton.style.display = 'flex';
    replaceButton.style.alignItems = 'center';
    replaceButton.style.justifyContent = 'center';
    replaceButton.style.cursor = 'pointer';
    replaceButton.style.transition = 'transform 0.1s';

    const toggleSwitch = document.createElement('button');
    toggleSwitch.style.width = '36px';
    toggleSwitch.style.height = '36px';
    toggleSwitch.style.borderRadius = '12px';
    toggleSwitch.style.border = 'none';
    toggleSwitch.style.backgroundColor = 'transparent';
    toggleSwitch.style.color = 'inherit';
    toggleSwitch.style.fontSize = '24px';
    toggleSwitch.style.display = 'flex';
    toggleSwitch.style.alignItems = 'center';
    toggleSwitch.style.justifyContent = 'center';
    toggleSwitch.style.cursor = 'pointer';
    toggleSwitch.style.transition = 'transform 0.1s, background-color 0.3s';
    toggleSwitch.style.marginLeft = '5px';
    toggleSwitch.title = 'Toggle replace all words';

  function updateToggleSwitch() {
    toggleSwitch.textContent = replaceAllWords ? '🔀' : '1️⃣';
    toggleSwitch.style.backgroundColor = replaceAllWords ? 'rgba(29, 155, 240, 0.1)' : 'transparent';
  }

    updateToggleSwitch();

    // Add hover effect
    replaceButton.addEventListener('mouseenter', () => {
      replaceButton.style.transform = 'scale(1.1)';
    });
    replaceButton.addEventListener('mouseleave', () => {
      replaceButton.style.transform = 'scale(1)';
    });

    toggleSwitch.addEventListener('mouseenter', () => {
      toggleSwitch.style.transform = 'scale(1.1)';
    });
    toggleSwitch.addEventListener('mouseleave', () => {
      toggleSwitch.style.transform = 'scale(1)';
    });

    toggleSwitch.addEventListener('click', (event) => {
      event.preventDefault();
      replaceAllWords = !replaceAllWords;
      updateToggleSwitch();
      browser.storage.sync.set({ replaceAllWords });
    });

    buttonContainer.appendChild(replaceButton);
    buttonContainer.appendChild(toggleSwitch);

    return buttonContainer;
  }

  function addButton(context) {
    const tweetButton = context.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
    if (tweetButton && !context.querySelector('.twilee-replace-button')) {
      const buttonContainer = createReplaceButton();
      buttonContainer.classList.add('twilee-replace-button');

      tweetButton.parentNode.insertBefore(buttonContainer, tweetButton.nextSibling);

      buttonContainer.querySelector('button').addEventListener('click', (event) => {
        event.preventDefault();
        setTimeout(() => replaceTextInSpans(context), 10);
      });
    }
  }

  function checkAndAddButton(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]')) {
        addButton(node);
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(checkAndAddButton);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('MutationObserver set up');

  checkAndAddButton(document.body);
})();