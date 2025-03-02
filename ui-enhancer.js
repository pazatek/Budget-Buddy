// This script runs after app.js to enhance the UI without changing functionality

document.addEventListener('DOMContentLoaded', function() {
    // Create a mutation observer to watch for changes in the content area
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                enhanceUI();
            }
        });
    });

    // Start observing the content area for changes
    observer.observe(document.getElementById('content-area'), {
        childList: true,
        subtree: true
    });

    // Initial enhancement
    enhanceUI();
});

function enhanceUI() {
    // Add icons to buttons
    addIconsToButtons();
    
    // Enhance form elements
    enhanceFormElements();
    
    // Add animations
    addAnimations();
}

function addIconsToButtons() {
    // Add icons to buttons if they don't already have one
    const buttonMappings = {
        'add-expense-btn': '<i class="fas fa-plus"></i> ',
        'add-income-btn': '<i class="fas fa-plus"></i> ',
        'save-expense': '<i class="fas fa-save"></i> ',
        'save-income': '<i class="fas fa-save"></i> ',
        'cancel-expense-btn': '<i class="fas fa-times"></i> ',
        'cancel-income-btn': '<i class="fas fa-times"></i> ',
        'reset-budget-btn': '<i class="fas fa-undo"></i> '
    };

    Object.keys(buttonMappings).forEach(id => {
        const button = document.getElementById(id);
        if (button && !button.innerHTML.includes('<i class')) {
            button.innerHTML = buttonMappings[id] + button.innerHTML;
        }
    });

    // Add icons to all edit buttons
    document.querySelectorAll('.edit-expense-btn, .edit-income-btn').forEach(button => {
        if (!button.innerHTML.includes('<i class')) {
            button.innerHTML = '<i class="fas fa-edit"></i>';
            button.title = 'Edit';
            button.classList.add('btn-sm');
        }
    });

    // Add icons to all delete buttons
    document.querySelectorAll('.delete-expense-btn, .delete-income-btn').forEach(button => {
        if (!button.innerHTML.includes('<i class')) {
            button.innerHTML = '<i class="fas fa-trash-alt"></i>';
            button.title = 'Delete';
            button.classList.add('btn-sm');
        }
    });
}

function enhanceFormElements() {
    // Add modern styling to checkboxes and other form elements
    document.querySelectorAll('.form-check-input').forEach(input => {
        input.classList.add('form-check-input-modern');
    });

    // Enhance date inputs
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.classList.add('date-input-modern');
    });
}

function addAnimations() {
    // Add fade-in animation to cards
    document.querySelectorAll('.card').forEach(card => {
        if (!card.classList.contains('fade-in')) {
            card.classList.add('fade-in');
        }
    });
} 