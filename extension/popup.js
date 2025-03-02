// DOM Elements
const notesList = document.getElementById('notes-list');
const clearNotesBtn = document.getElementById('clear-notes-btn');
const addNoteForm = document.getElementById('add-note-form');
const noteInput = document.getElementById('note-input');
let editingNoteIndex = null; // Track which note is being edited

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
        noteText.className = 'note-text';
        
        const noteDate = document.createElement('small');
        noteDate.className = 'text-muted d-block';
        noteDate.textContent = new Date(note.timestamp).toLocaleString();
        
        noteContent.appendChild(noteText);
        noteContent.appendChild(noteDate);
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        // Create edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-outline-primary me-1';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Edit note';
        editBtn.addEventListener('click', () => editNote(index, note.text));
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-outline-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete note';
        deleteBtn.addEventListener('click', () => deleteNote(index));
        
        buttonContainer.appendChild(editBtn);
        buttonContainer.appendChild(deleteBtn);
        
        li.appendChild(noteContent);
        li.appendChild(buttonContainer);
        notesList.appendChild(li);
    });
}

// Edit a note
function editNote(index, text) {
    // Set the input value to the note text
    noteInput.value = text;
    noteInput.focus();
    
    // Change the submit button to show we're editing
    const submitBtn = addNoteForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i>';
    submitBtn.classList.add('btn-success');
    submitBtn.classList.remove('btn-primary');
    
    // Store the index of the note being edited
    editingNoteIndex = index;
    
    // Scroll to the top to see the edit form
    window.scrollTo(0, 0);
}

// Cancel editing
function cancelEdit() {
    const submitBtn = addNoteForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-plus"></i>';
    submitBtn.classList.add('btn-primary');
    submitBtn.classList.remove('btn-success');
    
    noteInput.value = '';
    editingNoteIndex = null;
}

// Delete a note
function deleteNote(index) {
    chrome.storage.sync.get(['highlightedNotes'], function(result) {
        const notes = result.highlightedNotes || [];
        notes.splice(index, 1);
        
        chrome.storage.sync.set({ highlightedNotes: notes }, function() {
            displayNotes(notes);
            
            // If we were editing this note, cancel the edit
            if (editingNoteIndex === index) {
                cancelEdit();
            } else if (editingNoteIndex !== null && editingNoteIndex > index) {
                // Adjust the editing index if we deleted a note before it
                editingNoteIndex--;
            }
        });
    });
}

// Clear all notes
clearNotesBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all notes?')) {
        chrome.storage.sync.set({ highlightedNotes: [] }, function() {
            displayNotes([]);
            cancelEdit();
        });
    }
});

// Handle note form submission (add new or update existing)
addNoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = noteInput.value.trim();
    
    if (text) {
        chrome.storage.sync.get(['highlightedNotes'], function(result) {
            const notes = result.highlightedNotes || [];
            
            if (editingNoteIndex !== null) {
                // Update existing note
                notes[editingNoteIndex] = {
                    text: text,
                    timestamp: Date.now() // Update timestamp to show it was edited
                };
                
                // Reset edit state
                cancelEdit();
            } else {
                // Add new note
                notes.push({
                    text: text,
                    timestamp: Date.now()
                });
                
                // Clear input
                noteInput.value = '';
            }
            
            chrome.storage.sync.set({ highlightedNotes: notes }, function() {
                displayNotes(notes);
            });
        });
    }
});

// Add cancel button functionality
document.getElementById('cancel-edit-btn').addEventListener('click', (e) => {
    e.preventDefault();
    cancelEdit();
});

// Initialize the popup
document.addEventListener('DOMContentLoaded', loadNotes); 