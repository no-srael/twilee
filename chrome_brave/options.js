document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  document.getElementById('settingsFile').addEventListener('change', handleFileUpload);
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('download').addEventListener('click', downloadSettings);
});

function loadSettings() {
  chrome.storage.sync.get('settings')
    .then((result) => {
      if (result.settings) {
        setTextareaValue(result.settings);
        showMessage('Settings loaded from storage', 'info');
      } else {
        return fetch(chrome.runtime.getURL('default_twilee_settings.json'))
          .then(response => response.json())
          .then(settings => {
            setTextareaValue(settings);
            showMessage('Default settings loaded', 'info');
          });
      }
    })
    .catch(error => {
      console.error('Error loading settings:', error);
      setTextareaValue({ wordList: [], letterWordMapping: { words: {}, letters: {} } });
      showMessage('Error loading settings. Using empty defaults.', 'error');
    });
}

function setTextareaValue(settings) {
  document.getElementById('settings').value = JSON.stringify(settings, null, 2);
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const settings = JSON.parse(e.target.result);
      if (validateSettings(settings)) {
        const { sanitizedSettings, warnings } = sanitizeSettings(settings);
        setTextareaValue(sanitizedSettings);
        if (warnings.length > 0) {
          showMessage('File uploaded with warnings. Some regexes were modified.', 'warning');
          console.warn('Regex warnings:', warnings);
        } else {
          showMessage('File uploaded successfully', 'success');
        }
      } else {
        throw new Error('Invalid settings structure');
      }
    } catch (error) {
      showMessage(`Error parsing settings file: ${error.message}`, 'error');
    }
  };

  reader.readAsText(file);
}

function saveOptions() {
  try {
    let settings = JSON.parse(document.getElementById('settings').value);

    if (!validateSettings(settings)) {
      throw new Error('Invalid settings structure');
    }

    const { sanitizedSettings, warnings } = sanitizeSettings(settings);

    chrome.storage.sync.set({ settings: sanitizedSettings })
      .then(() => {
        setTextareaValue(sanitizedSettings);
        if (warnings.length > 0) {
          showMessage('Options saved with warnings. Some regexes were modified.', 'warning');
          console.warn('Regex warnings:', warnings);
        } else {
          showMessage('Options saved successfully', 'success');
        }
      })
      .catch(error => {
        console.error('Error saving options:', error);
        showMessage('Error saving options. Please try again.', 'error');
      });
  } catch (error) {
    showMessage(`Invalid JSON or structure: ${error.message}`, 'error');
  }
}

function sanitizeSettings(settings) {
  const warnings = [];
  const sanitizedSettings = {
    ...settings,
    wordList: settings.wordList.map((word, index) => {
      const sanitized = sanitizeRegex(word);
      if (sanitized !== word) {
        warnings.push(`Wordlist item ${index + 1} "${word}" was sanitized to "${sanitized}"`);
      }
      return sanitized;
    }),
    letterWordMapping: {
      ...settings.letterWordMapping,
      words: Object.fromEntries(
        Object.entries(settings.letterWordMapping.words).map(([key, value]) => {
          const sanitized = sanitizeRegex(key);
          if (sanitized !== key) {
            warnings.push(`Letter word mapping key "${key}" was sanitized to "${sanitized}"`);
          }
          return [sanitized, value];
        })
      )
    }
  };
  return { sanitizedSettings, warnings };
}

function sanitizeRegex(pattern) {
  // Remove or replace potentially dangerous patterns
  let sanitized = pattern.replace(/\.\*/g, '\\S*').replace(/\.\+/g, '\\S+');
  
  // Limit the number of repetitions
  sanitized = sanitized.replace(/\{(\d+),?(\d*)\}/g, (match, p1, p2) => {
    const min = parseInt(p1);
    const max = p2 ? parseInt(p2) : min;
    return `{${Math.min(min, 10)},${Math.min(max, 20)}}`;
  });

  // Limit the length of the pattern
  if (sanitized.length > 100) {
    sanitized = sanitized.slice(0, 100);
  }

  return sanitized;
}

function downloadSettings() {
  try {
    const settings = JSON.parse(document.getElementById('settings').value);
    
    if (!validateSettings(settings)) {
      throw new Error('Invalid settings structure');
    }

    const { sanitizedSettings, warnings } = sanitizeSettings(settings);

    const blob = new Blob([stringifyWithEmojis(sanitizedSettings)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'twilee_settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (warnings.length > 0) {
      showMessage('Settings downloaded with warnings. Some regexes were modified.', 'warning');
      console.warn('Regex warnings:', warnings);
    } else {
      showMessage('Settings downloaded successfully', 'success');
    }
  } catch (error) {
    showMessage(`Error downloading settings: ${error.message}`, 'error');
  }
}

function validateSettings(settings) {
  return (
    settings &&
    Array.isArray(settings.wordList) &&
    typeof settings.letterWordMapping === 'object' &&
    typeof settings.letterWordMapping.words === 'object' &&
    typeof settings.letterWordMapping.letters === 'object'
  );
}

function showMessage(message, type = 'info') {
  const messageElement = document.getElementById('message') || createMessageElement();
  messageElement.textContent = message;
  messageElement.className = `message ${type}`;
  messageElement.style.display = 'block';

  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 3000);
}

function createMessageElement() {
  const messageElement = document.createElement('div');
  messageElement.id = 'message';
  messageElement.style.position = 'fixed';
  messageElement.style.top = '10px';
  messageElement.style.right = '10px';
  messageElement.style.padding = '10px';
  messageElement.style.borderRadius = '5px';
  messageElement.style.display = 'none';
  document.body.appendChild(messageElement);
  return messageElement;
}

function stringifyWithEmojis(obj) {
  return JSON.stringify(obj, null, 2);
}