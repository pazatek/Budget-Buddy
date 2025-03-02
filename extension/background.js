// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveHighlightedText",
    title: "Save to Quick Notes",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveHighlightedText" && info.selectionText) {
    saveNote(info.selectionText);
  }
});

// Save the highlighted text as a note
function saveNote(text) {
  chrome.storage.sync.get(['highlightedNotes'], function(result) {
    const notes = result.highlightedNotes || [];
    
    // Add new note with timestamp
    notes.push({
      text: text.trim(),
      timestamp: Date.now()
    });
    
    // Save back to storage
    chrome.storage.sync.set({ highlightedNotes: notes }, function() {
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Quick Notes',
        message: 'Note saved successfully!'
      });
    });
  });
} 