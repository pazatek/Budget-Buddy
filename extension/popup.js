// DOM Elements
const notesList = document.getElementById('notes-list');
const clearNotesBtn = document.getElementById('clear-notes-btn');
const addNoteForm = document.getElementById('add-note-form');
const noteInput = document.getElementById('note-input');

// Load notes from storage when popup opens
function loadNotes() {
    chrome.storage.sync.get(['highlightedNotes'], function(result) {
        const notes = result.highlightedNotes || [];
        displayNotes(notes);
    });
}

// Display notes in the popup
function displayNotes(notes) {
    notesList.innerHTML = '';
    
    if (notes.length === 0) {
        notesList.innerHTML = '<li class="list-group-item text-center text-muted">No notes yet. Highlight text on any webpage and use the context menu to add notes.</li>';
        return;
    }
    
    notes.forEach((note, index) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        
        // Create note content with date
        const noteContent = document.createElement('div');
        noteContent.className = 'note-content';
        
        const noteText = document.createElement('span');
        noteText.textContent = note.text;
        
        const noteDate = document.createElement('small');
        noteDate.className = 'text-muted d-block';
        noteDate.textContent = new Date(note.timestamp).toLocaleString();
        
        noteContent.appendChild(noteText);
        noteContent.appendChild(noteDate);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-outline-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete note';
        deleteBtn.addEventListener('click', () => deleteNote(index));
        
        li.appendChild(noteContent);
        li.appendChild(deleteBtn);
        notesList.appendChild(li);
    });
}

// Delete a note
function deleteNote(index) {
    chrome.storage.sync.get(['highlightedNotes'], function(result) {
        const notes = result.highlightedNotes || [];
        notes.splice(index, 1);
        
        chrome.storage.sync.set({ highlightedNotes: notes }, function() {
            displayNotes(notes);
        });
    });
}

// Clear all notes
clearNotesBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all notes?')) {
        chrome.storage.sync.set({ highlightedNotes: [] }, function() {
            displayNotes([]);
        });
    }
});

// Handle manual note addition
addNoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = noteInput.value.trim();
    
    if (text) {
        chrome.storage.sync.get(['highlightedNotes'], function(result) {
            const notes = result.highlightedNotes || [];
            
            notes.push({
                text: text,
                timestamp: Date.now()
            });
            
            chrome.storage.sync.set({ highlightedNotes: notes }, function() {
                displayNotes(notes);
                noteInput.value = '';
            });
        });
    }
});

// Initialize the popup
document.addEventListener('DOMContentLoaded', loadNotes); 