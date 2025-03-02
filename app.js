// Local Storage Keys
const EXPENSES_KEY = 'expenses';
const INCOME_KEY = 'income';
const BUDGET_KEY = 'budget';

// Budget Categories
const BUDGET_CATEGORIES = {
    'Food': 'Needs',
    'Transportation': 'Needs',
    'Housing': 'Needs',
    'Entertainment': 'Wants',
    'Utilities': 'Needs',
    'Healthcare': 'Needs',
    'Shopping': 'Wants',
    'Education': 'Needs',
    'Travel': 'Wants',
    'Investments': 'Savings',
    'Savings': 'Savings',
    'Other': 'Wants'
};

// DOM Elements
const contentArea = document.getElementById('content-area');
const navLinks = document.querySelectorAll('.nav-link');

// Supabase Configuration
const SUPABASE_URL = 'https://rpjmdkvravopqtuzxksv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwam1ka3ZyYXZvcHF0dXp4a3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4OTEwNTcsImV4cCI6MjA1NjQ2NzA1N30.I4u76FDus2nRPfQWwKYaV39DhqYWLFionPSB4KMk1PE';
// Initialize the Supabase client correctly
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Event Listeners
document.getElementById('nav-dashboard').addEventListener('click', () => loadDashboardView());
document.getElementById('nav-expenses').addEventListener('click', () => loadExpensesView());
document.getElementById('nav-income').addEventListener('click', () => loadIncomeView());
document.getElementById('nav-budget').addEventListener('click', () => loadBudgetView());
document.getElementById('nav-reports').addEventListener('click', () => loadReportsView());
document.getElementById('nav-signout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    loadAuthView();
    
    // Also notify extension
    chrome.runtime.sendMessage("your_extension_id_here", {action: "logout"});
});

// Helper Functions
function showLoading() {
    contentArea.innerHTML = '<div class="loading"></div>';
}

function showError(message) {
    contentArea.innerHTML = `<div class="error">${message}</div>`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getCategoryColor(category) {
    const categoryColors = {
        'Food': '#FF6384',
        'Transportation': '#36A2EB',
        'Housing': '#FFCE56',
        'Entertainment': '#4BC0C0',
        'Utilities': '#9966FF',
        'Healthcare': '#FF9F40',
        'Shopping': '#C9CBCF',
        'Education': '#7CFC00',
        'Travel': '#FF7F50',
        'Other': '#808080'
    };
    
    return categoryColors[category] || getRandomColor();
}

function getBudgetCategoryType(category) {
    return BUDGET_CATEGORIES[category] || 'Wants';
}

function getBudgetTypeColor(type) {
    const typeColors = {
        'Needs': '#36A2EB',  // Blue
        'Wants': '#FF6384',  // Red
        'Savings': '#4BC0C0' // Green
    };
    
    return typeColors[type] || '#808080';
}

// Data Management Functions
async function getExpenses() {
    try {
        // Check if user is logged in
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            // Get expenses from Supabase
            const { data, error } = await supabaseClient
                .from('expenses')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });
            
            if (error) {
                console.error('Supabase query error:', error);
                throw error;
            }
            
            // Map database column names to JavaScript property names
            return (data || []).map(expense => ({
                id: expense.id,
                description: expense.description,
                amount: parseFloat(expense.amount),
                baseAmount: expense.base_amount ? parseFloat(expense.base_amount) : parseFloat(expense.amount),
                isTaxable: expense.is_taxable || false,
                taxRate: expense.tax_rate ? parseFloat(expense.tax_rate) : 0,
                taxAmount: expense.tax_amount ? parseFloat(expense.tax_amount) : 0,
                category: expense.category,
                date: expense.date,
                notes: expense.notes || ''
            }));
        } else {
            return []; // Return empty array if not logged in
        }
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return []; // Return empty array on error
    }
}

async function saveExpense(expense) {
    try {
        // Get current user
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) return false;
        
        // Add user_id to expense
        expense.user_id = user.id;
        
        // Format expense to match database schema
        const formattedExpense = {
            user_id: user.id,
            description: expense.description,
            amount: expense.amount,
            base_amount: expense.baseAmount,
            is_taxable: expense.isTaxable,
            tax_rate: expense.taxRate,
            tax_amount: expense.taxAmount,
            category: expense.category,
            date: expense.date,
            notes: expense.notes || ''
        };
        
        if (expense.id) {
            // Update existing expense
            const { error } = await supabaseClient
                .from('expenses')
                .update(formattedExpense)
                .eq('id', expense.id);
            
            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }
        } else {
            // Create new expense
            const { data, error } = await supabaseClient
                .from('expenses')
                .insert([formattedExpense])
                .select();
            
            if (error) {
                console.error('Supabase insert error:', error);
                throw error;
            }
            
            console.log('Created expense:', data);
        }
        
        // If we're on the expenses view, refresh it
        if (document.querySelector('#nav-expenses').classList.contains('active')) {
            loadExpensesView();
        }
        
        return true;
    } catch (error) {
        console.error('Error saving expense:', error);
        alert(`Error saving expense: ${error.message}`);
        return false;
    }
}

async function deleteExpense(id) {
    try {
        // Get current user
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) return false;
        
        console.log('Deleting expense with ID:', id);
        
        // Delete from Supabase - make sure we're using the correct ID format
        const { error, count } = await supabaseClient
            .from('expenses')
            .delete({ returning: 'minimal', count: 'exact' })
            .eq('id', id);
        
        if (error) {
            console.error('Supabase delete error:', error);
            throw error;
        }
        
        console.log(`Deleted ${count} expense(s) with ID: ${id}`);
        
        // If we're on the expenses view, refresh it
        if (document.querySelector('#nav-expenses').classList.contains('active')) {
            loadExpensesView();
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert(`Error deleting expense: ${error.message}`);
        return false;
    }
}

// Modify the getIncome function to use Supabase when logged in
async function getIncome() {
    try {
        // Check if user is logged in
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            // Get income from Supabase
            const { data, error } = await supabaseClient
                .from('income')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });
            
            if (error) {
                console.error('Supabase query error:', error);
                throw error;
            }
            
            // Map database column names to JavaScript property names
            return (data || []).map(income => ({
                id: income.id,
                description: income.description,
                amount: parseFloat(income.amount),
                source: income.source,
                date: income.date,
                notes: income.notes || ''
            }));
        } else {
            return []; // Return empty array if not logged in
        }
    } catch (error) {
        console.error('Error fetching income:', error);
        return []; // Return empty array on error
    }
}

async function saveIncome(income) {
    try {
        // Get current user
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) return false;
        
        // Add user_id to income
        income.user_id = user.id;
        
        // Save to Supabase
        const { error } = await supabaseClient
            .from('income')
            .insert([income]);
        
        if (error) throw error;
        
        // If we're on the income view, refresh it
        if (document.querySelector('#nav-income').classList.contains('active')) {
            loadIncomeView();
        }
        
        return true;
    } catch (error) {
        console.error('Error saving income:', error);
        return false;
    }
}

async function updateIncome(updatedIncome) {
    try {
        // Get current user
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) return false;
        
        // Update in Supabase
        const { error } = await supabaseClient
            .from('income')
            .update(updatedIncome)
            .eq('id', updatedIncome.id);
        
        if (error) throw error;
        
        return true;
    } catch (error) {
        console.error('Error updating income:', error);
        return false;
    }
}

async function deleteIncome(id) {
    try {
        // Get current user
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) return false;
        
        console.log('Deleting income with ID:', id);
        
        // Delete from Supabase - make sure we're using the correct ID format
        const { error, count } = await supabaseClient
            .from('income')
            .delete({ returning: 'minimal', count: 'exact' })
            .eq('id', id);
        
        if (error) {
            console.error('Supabase delete error:', error);
            throw error;
        }
        
        console.log(`Deleted ${count} income(s) with ID: ${id}`);
        
        // If we're on the income view, refresh it
        if (document.querySelector('#nav-income').classList.contains('active')) {
            loadIncomeView();
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting income:', error);
        alert(`Error deleting income: ${error.message}`);
        return false;
    }
}

async function getBudget() {
    try {
        // Check if user is logged in
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            // Get budget from Supabase
            const { data, error } = await supabaseClient
                .from('budgets')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
            
            if (data) {
                return {
                    total: data.total || 0,
                    categories: data.category_budgets || {},
                    allocation: {
                        Needs: data.needs_percentage || 50,
                        Wants: data.wants_percentage || 30,
                        Savings: data.savings_percentage || 20
                    }
                };
            }
        }
        
        // Return default budget if not found or not logged in
        return {
            total: 0,
            categories: {},
            allocation: {
                Needs: 50,
                Wants: 30,
                Savings: 20
            }
        };
    } catch (error) {
        console.error('Error fetching budget:', error);
        // Return default budget on error
        return {
            total: 0,
            categories: {},
            allocation: {
                Needs: 50,
                Wants: 30,
                Savings: 20
            }
        };
    }
}

async function saveBudget(budget) {
    try {
        // Get current user
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) return false;
        
        // Format budget for Supabase
        const formattedBudget = {
            user_id: user.id,
            total: budget.total || 0,
            needs_percentage: budget.allocation.Needs || 50,
            wants_percentage: budget.allocation.Wants || 30,
            savings_percentage: budget.allocation.Savings || 20,
            category_budgets: budget.categories || {}
        };
        
        // Check if budget already exists
        const { data, error: fetchError } = await supabaseClient
            .from('budgets')
            .select('id')
            .eq('user_id', user.id)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        
        if (data) {
            // Update existing budget
            const { error } = await supabaseClient
                .from('budgets')
                .update(formattedBudget)
                .eq('id', data.id);
            
            if (error) throw error;
        } else {
            // Insert new budget
            const { error } = await supabaseClient
                .from('budgets')
                .insert([formattedBudget]);
            
            if (error) throw error;
        }
        
        // If we're on the budget view, refresh it
        if (document.querySelector('#nav-budget').classList.contains('active')) {
            loadBudgetView();
        }
        
        return true;
    } catch (error) {
        console.error('Error saving budget:', error);
        return false;
    }
}

// View Loaders
function loadDashboardView() {
    showLoading();
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
        showError("Dashboard loading timed out. Please refresh the page.");
    }, 10000);
    
    // Wrap in async function to properly handle promises
    (async function() {
        try {
            const expenses = await getExpenses();
            const income = await getIncome();
            const budget = await getBudget();
            
            // Clear the timeout since we've loaded data
            clearTimeout(loadingTimeout);
            
            // Log data for debugging
            console.log("Loaded expenses:", expenses);
            console.log("Loaded income:", income);
            console.log("Loaded budget:", budget);
            
            // Calculate summary data
            const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            const totalIncome = income.reduce((sum, income) => sum + parseFloat(income.amount), 0);
            const balance = totalIncome - totalExpenses;
            
            // Calculate category totals
            const categoryTotals = {};
            expenses.forEach(expense => {
                if (!categoryTotals[expense.category]) {
                    categoryTotals[expense.category] = 0;
                }
                categoryTotals[expense.category] += parseFloat(expense.amount);
            });
            
            // Calculate budget type totals (Needs, Wants, Savings)
            const typeTotals = { Needs: 0, Wants: 0, Savings: 0 };
            const typeCategories = { Needs: [], Wants: [], Savings: [] };
            
            Object.keys(categoryTotals).forEach(category => {
                const type = getBudgetCategoryType(category);
                typeTotals[type] += categoryTotals[category];
                typeCategories[type].push(category);
            });
            
            const totalExpensesType = Object.values(typeTotals).reduce((sum, value) => sum + value, 0);
            
            // Get recent transactions - UPDATED to combine and sort all transactions
            // Create combined array of transactions
            const allTransactions = [
                ...expenses.map(expense => ({
                    ...expense,
                    type: 'expense',
                    displayAmount: formatCurrency(expense.amount),
                    badgeClass: 'bg-danger'
                })),
                ...income.map(inc => ({
                    ...inc,
                    type: 'income',
                    displayAmount: formatCurrency(inc.amount),
                    badgeClass: 'bg-success'
                }))
            ];
            
            // Sort all transactions by date (newest first)
            const recentTransactions = allTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);
            
            let html = `
                <div class="card">
                    <div class="card-header">Budget Buddy Dashboard</div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-4">
                                <div class="summary-card bg-light">
                                    <div class="value ${balance >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(balance)}</div>
                                    <div class="label">Current Balance</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="summary-card bg-light">
                                    <div class="value text-success">${formatCurrency(totalIncome)}</div>
                                    <div class="label">Total Income</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="summary-card bg-light">
                                    <div class="value text-danger">${formatCurrency(totalExpenses)}</div>
                                    <div class="label">Total Expenses</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <h5>Expense Breakdown</h5>
                                <div class="chart-container">
                                    <canvas id="expense-chart"></canvas>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h5>Recent Transactions</h5>
                                <div class="list-group">`;
            
            // Add recent transactions (combined and sorted)
            recentTransactions.forEach(transaction => {
                if (transaction.type === 'expense') {
                    html += `
                        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold">${transaction.description}</div>
                                <small class="text-muted">${transaction.date} - ${transaction.category}</small>
                            </div>
                            <span class="badge bg-danger rounded-pill">${transaction.displayAmount}</span>
                        </div>`;
                } else {
                    html += `
                        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold">${transaction.description}</div>
                                <small class="text-muted">${transaction.date} - Income</small>
                            </div>
                            <span class="badge bg-success rounded-pill">${transaction.displayAmount}</span>
                        </div>`;
                }
            });
            
            html += `
                            </div>
                        </div>
                    </div>`;
            
            // Add budget allocation section to dashboard
            html += `
                <div class="row mt-4">
                    <div class="col-md-12">
                        <h5>Budget Allocation</h5>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="card h-100" style="border-color: ${getBudgetTypeColor('Needs')};">
                                    <div class="card-body d-flex flex-column">
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <h6 class="card-title mb-0">Needs (${budget.allocation.Needs}%)</h6>
                                            <button class="btn btn-sm btn-link text-muted p-0" type="button" 
                                                data-bs-toggle="popover" 
                                                data-bs-placement="top" 
                                                data-bs-content="Essential expenses like housing, food, utilities, and healthcare."
                                                data-bs-trigger="focus">
                                                <i class="bi bi-info-circle"></i>
                                            </button>
                                        </div>
                                        <div class="mt-auto">
                                            <div class="progress" style="height: 25px;">
                                                <div class="progress-bar position-relative" 
                                                    style="width: ${Math.min((typeTotals.Needs / (budget.total * budget.allocation.Needs / 100)) * 100, 100)}%; background-color: ${getBudgetTypeColor('Needs')};">
                                                    <span class="position-absolute w-100 text-center" style="left: 0; line-height: 25px; color: ${(typeTotals.Needs / (budget.total * budget.allocation.Needs / 100)) * 100 > 50 ? 'white' : 'black'};">
                                                        ${Math.round((typeTotals.Needs / (budget.total * budget.allocation.Needs / 100)) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="d-flex justify-content-between mt-2">
                                                <small>${formatCurrency(typeTotals.Needs)}</small>
                                                <small>${formatCurrency(budget.total * budget.allocation.Needs / 100)}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card h-100" style="border-color: ${getBudgetTypeColor('Wants')};">
                                    <div class="card-body d-flex flex-column">
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <h6 class="card-title mb-0">Wants (${budget.allocation.Wants}%)</h6>
                                            <button class="btn btn-sm btn-link text-muted p-0" type="button" 
                                                data-bs-toggle="popover" 
                                                data-bs-placement="top" 
                                                data-bs-content="Non-essential expenses like entertainment, dining out, and shopping."
                                                data-bs-trigger="focus">
                                                <i class="bi bi-info-circle"></i>
                                            </button>
                                        </div>
                                        <div class="mt-auto">
                                            <div class="progress" style="height: 25px;">
                                                <div class="progress-bar position-relative" 
                                                    style="width: ${Math.min((typeTotals.Wants / (budget.total * budget.allocation.Wants / 100)) * 100, 100)}%; background-color: ${getBudgetTypeColor('Wants')};">
                                                    <span class="position-absolute w-100 text-center" style="left: 0; line-height: 25px; color: ${(typeTotals.Wants / (budget.total * budget.allocation.Wants / 100)) * 100 > 50 ? 'white' : 'black'};">
                                                        ${Math.round((typeTotals.Wants / (budget.total * budget.allocation.Wants / 100)) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="d-flex justify-content-between mt-2">
                                                <small>${formatCurrency(typeTotals.Wants)}</small>
                                                <small>${formatCurrency(budget.total * budget.allocation.Wants / 100)}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card h-100" style="border-color: ${getBudgetTypeColor('Savings')};">
                                    <div class="card-body d-flex flex-column">
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <h6 class="card-title mb-0">Savings (${budget.allocation.Savings}%)</h6>
                                            <button class="btn btn-sm btn-link text-muted p-0" type="button" 
                                                data-bs-toggle="popover" 
                                                data-bs-placement="top" 
                                                data-bs-content="Money set aside for future goals, investments, and emergencies."
                                                data-bs-trigger="focus">
                                                <i class="bi bi-info-circle"></i>
                                            </button>
                                        </div>
                                        <div class="mt-auto">
                                            <div class="progress" style="height: 25px;">
                                                <div class="progress-bar position-relative" 
                                                    style="width: ${Math.min((typeTotals.Savings / (budget.total * budget.allocation.Savings / 100)) * 100, 100)}%; background-color: ${getBudgetTypeColor('Savings')};">
                                                    <span class="position-absolute w-100 text-center" style="left: 0; line-height: 25px; color: ${(typeTotals.Savings / (budget.total * budget.allocation.Savings / 100)) * 100 > 50 ? 'white' : 'black'};">
                                                        ${Math.round((typeTotals.Savings / (budget.total * budget.allocation.Savings / 100)) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="d-flex justify-content-between mt-2">
                                                <small>${formatCurrency(typeTotals.Savings)}</small>
                                                <small>${formatCurrency(budget.total * budget.allocation.Savings / 100)}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            contentArea.innerHTML = html;
            
            // Create expense chart
            const expenseCtx = document.getElementById('expense-chart').getContext('2d');
            
            // Prepare data for chart
            const categories = Object.keys(categoryTotals);
            const values = Object.values(categoryTotals);
            const backgroundColors = categories.map(category => getCategoryColor(category));
            
            new Chart(expenseCtx, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: values,
                        backgroundColor: backgroundColors
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });

            // Initialize Bootstrap components
            setTimeout(() => {
                // Initialize popovers
                const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
                popoverTriggerList.map(function (popoverTriggerEl) {
                    return new bootstrap.Popover(popoverTriggerEl, {
                        html: true,
                        container: 'body'
                    });
                });
                
                // Initialize tooltips
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            }, 100);
        } catch (error) {
            // Clear the timeout
            clearTimeout(loadingTimeout);
            
            console.error("Error loading dashboard:", error);
            showError(`Error loading dashboard: ${error.message}`);
        }
    })();
}

function loadExpensesView() {
    showLoading();
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
        showError("Expenses loading timed out. Please refresh the page.");
    }, 10000);
    
    // Wrap in async function to properly handle promises
    (async function() {
        try {
            const expenses = await getExpenses();
            clearTimeout(loadingTimeout);
            
            // Log data for debugging
            console.log("Loaded expenses:", expenses);
            
            let html = `
                <div class="card">
                    <div class="card-header">Budget Buddy Expenses</div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-12">
                                <button class="btn btn-primary" id="add-expense-btn">Add New Expense</button>
                            </div>
                        </div>
                        
                        <div id="expense-form-container" class="mb-4" style="display: none;">
                            <div class="card">
                                <div class="card-body">
                                    <h5 id="expense-form-title">Add New Expense</h5>
                                    <form id="expense-form">
                                        <input type="hidden" id="expense-id">
                                        <div class="mb-3">
                                            <label for="expense-description" class="form-label">Description</label>
                                            <input type="text" class="form-control" id="expense-description" required>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label for="expense-amount" class="form-label">Amount</label>
                                                <input type="number" class="form-control" id="expense-amount" step="0.01" min="0.01" required>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <div class="form-check mt-4">
                                                    <input class="form-check-input" type="checkbox" id="expense-taxable">
                                                    <label class="form-check-label" for="expense-taxable">
                                                        Taxable?
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="tax-options" class="row mb-3" style="display: none;">
                                            <div class="col-md-6">
                                                <label for="expense-tax-rate" class="form-label">Tax Rate (%)</label>
                                                <input type="number" class="form-control" id="expense-tax-rate" step="0.1" min="0" value="7.5">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Tax Amount</label>
                                                <div class="input-group">
                                                    <span class="input-group-text">$</span>
                                                    <input type="text" class="form-control" id="expense-tax-amount" readonly>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <label for="expense-category" class="form-label">Category</label>
                                            <select class="form-select" id="expense-category" required>
                                                <option value="">Select a category</option>
                                                <option value="Food">Food</option>
                                                <option value="Transportation">Transportation</option>
                                                <option value="Housing">Housing</option>
                                                <option value="Entertainment">Entertainment</option>
                                                <option value="Utilities">Utilities</option>
                                                <option value="Healthcare">Healthcare</option>
                                                <option value="Shopping">Shopping</option>
                                                <option value="Education">Education</option>
                                                <option value="Travel">Travel</option>
                                                <option value="Investments">Investments</option>
                                                <option value="Savings">Savings</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="expense-date" class="form-label">Date</label>
                                            <input type="date" class="form-control" id="expense-date" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="expense-notes" class="form-label">Notes (Optional)</label>
                                            <textarea class="form-control" id="expense-notes" rows="2"></textarea>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Total Amount</label>
                                            <div class="input-group">
                                                <span class="input-group-text">$</span>
                                                <input type="text" class="form-control" id="expense-total-amount" readonly>
                                            </div>
                                        </div>
                                        <button type="submit" class="btn btn-success">Save Expense</button>
                                        <button type="button" class="btn btn-secondary" id="cancel-expense-btn">Cancel</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Category</th>
                                        <th>Type</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>`;
            
            if (expenses.length === 0) {
                html += `
                    <tr>
                        <td colspan="6" class="text-center">No expenses found. Add your first expense!</td>
                    </tr>`;
            } else {
                // Sort expenses by date (newest first)
                const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
                
                sortedExpenses.forEach(expense => {
                    const budgetType = getBudgetCategoryType(expense.category);
                    const taxInfo = expense.isTaxable ? 
                        `<small class="d-block text-muted">Includes ${expense.taxRate}% tax ($${expense.taxAmount.toFixed(2)})</small>` : '';
                    
                    html += `
                        <tr class="expense-item">
                            <td>${expense.date}</td>
                            <td>
                                ${expense.description}
                                ${taxInfo}
                            </td>
                            <td><span class="category-badge" style="background-color: ${getCategoryColor(expense.category)}; color: white;">${expense.category}</span></td>
                            <td><span class="badge" style="background-color: ${getBudgetTypeColor(budgetType)};">${budgetType}</span></td>
                            <td>${formatCurrency(expense.amount)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary edit-expense-btn" data-id="${expense.id}">Edit</button>
                                <button class="btn btn-sm btn-outline-danger delete-expense-btn" data-id="${expense.id}">Delete</button>
                            </td>
                        </tr>`;
                });
            }
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
            
            contentArea.innerHTML = html;
            
            // Set default date to today for new expenses
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('expense-date');
            if (dateInput) {
                dateInput.value = today;
            }
            
            // Add event listeners
            document.getElementById('add-expense-btn').addEventListener('click', () => {
                document.getElementById('expense-form-container').style.display = 'block';
                document.getElementById('expense-form-title').textContent = 'Add New Expense';
                document.getElementById('expense-form').reset();
                document.getElementById('expense-date').value = today;
                
                // Initialize tax options to be hidden when form is opened
                document.getElementById('tax-options').style.display = 'none';
                document.getElementById('expense-taxable').checked = false;
                
                // Initialize total amount
                const amountInput = document.getElementById('expense-amount');
                if (amountInput && amountInput.value) {
                    document.getElementById('expense-total-amount').value = amountInput.value;
                } else {
                    document.getElementById('expense-total-amount').value = '0.00';
                }
            });
            
            document.getElementById('cancel-expense-btn').addEventListener('click', () => {
                document.getElementById('expense-form-container').style.display = 'none';
            });
            
            // Add event listeners for the tax functionality
            const taxableCheckbox = document.getElementById('expense-taxable');
            const taxOptions = document.getElementById('tax-options');
            const amountInput = document.getElementById('expense-amount');
            const taxRateInput = document.getElementById('expense-tax-rate');
            const taxAmountDisplay = document.getElementById('expense-tax-amount');
            const totalAmountDisplay = document.getElementById('expense-total-amount');
            
            // Function to calculate tax and total
            function calculateTaxAndTotal() {
                const amount = parseFloat(amountInput.value) || 0;
                
                if (taxableCheckbox.checked) {
                    const taxRate = parseFloat(taxRateInput.value) || 0;
                    const taxAmount = amount * (taxRate / 100);
                    const totalAmount = amount + taxAmount;
                    
                    taxAmountDisplay.value = taxAmount.toFixed(2);
                    totalAmountDisplay.value = totalAmount.toFixed(2);
                } else {
                    totalAmountDisplay.value = amount.toFixed(2);
                }
            }
            
            // Show/hide tax options when checkbox is clicked
            if (taxableCheckbox) {
                taxableCheckbox.addEventListener('change', function() {
                    if (this.checked) {
                        taxOptions.style.display = 'flex';
                    } else {
                        taxOptions.style.display = 'none';
                    }
                    calculateTaxAndTotal();
                });
            }
            
            // Update calculations when amount or tax rate changes
            if (amountInput) {
                amountInput.addEventListener('input', calculateTaxAndTotal);
            }
            
            if (taxRateInput) {
                taxRateInput.addEventListener('input', calculateTaxAndTotal);
            }
            
            // Initialize total amount
            if (amountInput && amountInput.value) {
                calculateTaxAndTotal();
            }
            
            // Update the form submission handler to include tax information
            const expenseForm = document.getElementById('expense-form');
            if (expenseForm) {
                expenseForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    try {
                        const id = document.getElementById('expense-id').value;
                        const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
                        const isTaxable = document.getElementById('expense-taxable')?.checked || false;
                        
                        let taxRate = 0;
                        let taxAmount = 0;
                        let totalAmount = amount;
                        
                        if (isTaxable) {
                            taxRate = parseFloat(document.getElementById('expense-tax-rate')?.value) || 0;
                            taxAmount = amount * (taxRate / 100);
                            totalAmount = amount + taxAmount;
                        }
                        
                        // Make sure all required fields have values
                        const descriptionElement = document.getElementById('expense-description');
                        if (!descriptionElement || !descriptionElement.value) {
                            alert('Please enter a description');
                            return;
                        }
                        
                        const categoryElement = document.getElementById('expense-category');
                        if (!categoryElement || !categoryElement.value) {
                            alert('Please select a category');
                            return;
                        }
                        
                        const dateElement = document.getElementById('expense-date');
                        if (!dateElement || !dateElement.value) {
                            alert('Please select a date');
                            return;
                        }
                        
                        const expense = {
                            description: descriptionElement.value,
                            amount: totalAmount, // Save the total amount including tax
                            baseAmount: amount, // Save the pre-tax amount
                            isTaxable: isTaxable,
                            taxRate: isTaxable ? taxRate : 0,
                            taxAmount: isTaxable ? taxAmount : 0,
                            category: categoryElement.value,
                            date: dateElement.value,
                            notes: document.getElementById('expense-notes')?.value || ''
                        };
                        
                        if (id) {
                            // Update existing expense
                            expense.id = id;
                        }
                        
                        console.log('Submitting expense:', expense);
                        
                        // Save the expense
                        const success = await saveExpense(expense);
                        
                        if (success) {
                            // Hide the form - add null check here
                            const formContainer = document.getElementById('expense-form-container');
                            if (formContainer) {
                                formContainer.style.display = 'none';
                            }
                            
                            // Show success message
                            alert('Expense saved successfully!');
                        }
                    } catch (error) {
                        console.error('Error in form submission:', error);
                        alert(`Error saving expense: ${error.message}`);
                    }
                });
            }
            
            // Add event listeners to edit buttons
            const editButtons = document.querySelectorAll('.edit-expense-btn');
            editButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    try {
                        const id = button.getAttribute('data-id');
                        console.log('Editing expense with ID:', id);
                        
                        const expensesList = await getExpenses();
                        const expense = expensesList.find(expense => expense.id === id);
                        
                        if (expense) {
                            console.log('Found expense to edit:', expense);
                            
                            document.getElementById('expense-form-container').style.display = 'block';
                            document.getElementById('expense-form-title').textContent = 'Edit Expense';
                            document.getElementById('expense-id').value = expense.id;
                            document.getElementById('expense-description').value = expense.description;
                            document.getElementById('expense-amount').value = expense.baseAmount || expense.amount;
                            document.getElementById('expense-taxable').checked = expense.isTaxable || false;
                            
                            // Make sure to show/hide tax options based on the expense's taxable status
                            if (expense.isTaxable) {
                                document.getElementById('tax-options').style.display = 'flex';
                                document.getElementById('expense-tax-rate').value = expense.taxRate;
                                document.getElementById('expense-tax-amount').value = expense.taxAmount.toFixed(2);
                                document.getElementById('expense-total-amount').value = expense.amount.toFixed(2);
                            } else {
                                document.getElementById('tax-options').style.display = 'none';
                                document.getElementById('expense-total-amount').value = expense.amount.toFixed(2);
                            }
                            
                            document.getElementById('expense-category').value = expense.category;
                            document.getElementById('expense-date').value = expense.date;
                            document.getElementById('expense-notes').value = expense.notes || '';
                        } else {
                            console.error('Expense not found with ID:', id);
                            alert('Could not find expense to edit');
                        }
                    } catch (error) {
                        console.error('Error editing expense:', error);
                        alert(`Error editing expense: ${error.message}`);
                    }
                });
            });
            
            // Add event listeners to delete buttons
            const deleteButtons = document.querySelectorAll('.delete-expense-btn');
            deleteButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this expense?')) {
                        try {
                            const id = button.getAttribute('data-id');
                            console.log('Attempting to delete expense with ID:', id);
                            const success = await deleteExpense(id);
                            
                            if (success) {
                                alert('Expense deleted successfully!');
                                // Force refresh the view
                                loadExpensesView();
                            }
                        } catch (error) {
                            console.error('Error in delete button handler:', error);
                            alert(`Failed to delete expense: ${error.message}`);
                        }
                    }
                });
            });
            
        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error("Error loading expenses view:", error);
            showError(`Error loading expenses: ${error.message}`);
        }
    })();
}

function loadIncomeView() {
    showLoading();
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
        showError("Income loading timed out. Please refresh the page.");
    }, 10000);
    
    // Wrap in async function to properly handle promises
    (async function() {
        try {
            const incomeList = await getIncome();
            clearTimeout(loadingTimeout);
            
            // Log data for debugging
            console.log("Loaded income:", incomeList);
            
            let html = `
                <div class="card">
                    <div class="card-header">Budget Buddy Income</div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-12">
                                <button class="btn btn-success" id="add-income-btn">Add New Income</button>
                            </div>
                        </div>
                        
                        <div id="income-form-container" class="mb-4" style="display: none;">
                            <div class="card">
                                <div class="card-body">
                                    <h5 id="income-form-title">Add New Income</h5>
                                    <form id="income-form">
                                        <input type="hidden" id="income-id">
                                        <div class="mb-3">
                                            <label for="income-description" class="form-label">Description</label>
                                            <input type="text" class="form-control" id="income-description" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="income-amount" class="form-label">Amount</label>
                                            <input type="number" class="form-control" id="income-amount" step="0.01" min="0.01" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="income-source" class="form-label">Source</label>
                                            <select class="form-select" id="income-source" required>
                                                <option value="">Select a source</option>
                                                <option value="Salary">Salary</option>
                                                <option value="Freelance">Freelance</option>
                                                <option value="Business">Business</option>
                                                <option value="Investments">Investments</option>
                                                <option value="Gifts">Gifts</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label for="income-date" class="form-label">Date</label>
                                            <input type="date" class="form-control" id="income-date" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="income-notes" class="form-label">Notes (Optional)</label>
                                            <textarea class="form-control" id="income-notes" rows="2"></textarea>
                                        </div>
                                        <button type="submit" class="btn btn-success">Save Income</button>
                                        <button type="button" class="btn btn-secondary" id="cancel-income-btn">Cancel</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Source</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>`;
            
            if (incomeList.length === 0) {
                html += `
                    <tr>
                        <td colspan="5" class="text-center">No income entries found. Add your first income!</td>
                    </tr>`;
            } else {
                // Sort income by date (newest first)
                const sortedIncome = [...incomeList].sort((a, b) => new Date(b.date) - new Date(a.date));
                
                sortedIncome.forEach(income => {
                    html += `
                        <tr class="income-item">
                            <td>${income.date}</td>
                            <td>${income.description}</td>
                            <td><span class="badge bg-success">${income.source}</span></td>
                            <td class="text-success">${formatCurrency(income.amount)}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary edit-income-btn" data-id="${income.id}">Edit</button>
                                <button class="btn btn-sm btn-outline-danger delete-income-btn" data-id="${income.id}">Delete</button>
                            </td>
                        </tr>`;
                });
            }
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>`;
            
            contentArea.innerHTML = html;
            
            // Set default date to today for new income
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('income-date');
            if (dateInput) {
                dateInput.value = today;
            }
            
            // Add event listeners
            document.getElementById('add-income-btn').addEventListener('click', () => {
                document.getElementById('income-form-container').style.display = 'block';
                document.getElementById('income-form-title').textContent = 'Add New Income';
                document.getElementById('income-form').reset();
                document.getElementById('income-date').value = today;
            });
            
            document.getElementById('cancel-income-btn').addEventListener('click', () => {
                document.getElementById('income-form-container').style.display = 'none';
            });
            
            document.getElementById('income-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const id = document.getElementById('income-id').value;
                const income = {
                    description: document.getElementById('income-description').value,
                    amount: parseFloat(document.getElementById('income-amount').value),
                    source: document.getElementById('income-source').value,
                    date: document.getElementById('income-date').value,
                    notes: document.getElementById('income-notes').value
                };
                
                if (id) {
                    // Update existing income
                    income.id = parseInt(id);
                    await updateIncome(income);
                } else {
                    // Add new income
                    await saveIncome(income);
                }
                
                // Reload income view
                loadIncomeView();
            });
            
            // Add event listeners to edit buttons
            const editButtons = document.querySelectorAll('.edit-income-btn');
            editButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    const id = parseInt(button.getAttribute('data-id'));
                    const incomeList = await getIncome();
                    const income = incomeList.find(income => income.id === id);
                    
                    if (income) {
                        document.getElementById('income-form-container').style.display = 'block';
                        document.getElementById('income-form-title').textContent = 'Edit Income';
                        document.getElementById('income-id').value = income.id;
                        document.getElementById('income-description').value = income.description;
                        document.getElementById('income-amount').value = income.amount;
                        document.getElementById('income-source').value = income.source;
                        document.getElementById('income-date').value = income.date;
                        document.getElementById('income-notes').value = income.notes || '';
                    }
                });
            });
            
            // Add event listeners to delete buttons
            const deleteButtons = document.querySelectorAll('.delete-income-btn');
            deleteButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    if (confirm('Are you sure you want to delete this income entry?')) {
                        try {
                            const id = button.getAttribute('data-id');
                            console.log('Attempting to delete income with ID:', id);
                            const success = await deleteIncome(id);
                            
                            if (success) {
                                alert('Income deleted successfully!');
                                // Force refresh the view
                                loadIncomeView();
                            }
                        } catch (error) {
                            console.error('Error in delete button handler:', error);
                            alert(`Failed to delete income: ${error.message}`);
                        }
                    }
                });
            });
            
        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error("Error loading income view:", error);
            showError(`Error loading income: ${error.message}`);
        }
    })();
}

async function loadBudgetView() {
    showLoading();
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
        showError("Budget loading timed out. Please refresh the page.");
    }, 10000);
    
    // Wrap in async function to properly handle promises
    (async function() {
        try {
            const budget = await getBudget();
            const expenses = await getExpenses();
            
            clearTimeout(loadingTimeout);
            
            // Calculate category totals
            const categoryTotals = {};
            expenses.forEach(expense => {
                if (!categoryTotals[expense.category]) {
                    categoryTotals[expense.category] = 0;
                }
                categoryTotals[expense.category] += parseFloat(expense.amount);
            });
            
            // Calculate budget type totals (Needs, Wants, Savings)
            const typeTotals = { Needs: 0, Wants: 0, Savings: 0 };
            const typeCategories = { Needs: [], Wants: [], Savings: [] };
            
            Object.keys(categoryTotals).forEach(category => {
                const type = getBudgetCategoryType(category);
                typeTotals[type] += categoryTotals[category];
                typeCategories[type].push(category);
            });
            
            const totalExpenses = Object.values(typeTotals).reduce((sum, value) => sum + value, 0);
            
            let html = `
                <div class="card">
                    <div class="card-header">Budget Buddy Budget</div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-12">
                                <h4>Budget Allocation</h4>
                                <p>Set your budget allocation percentages for Needs, Wants, and Savings using the 50/30/20 rule or your own custom allocation.</p>
                                
                                <form id="budget-allocation-form" class="mb-4">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label for="needs-percentage" class="form-label">Needs (%)</label>
                                                <input type="number" class="form-control" id="needs-percentage" min="0" max="100" value="${budget.allocation.Needs}" required>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label for="wants-percentage" class="form-label">Wants (%)</label>
                                                <input type="number" class="form-control" id="wants-percentage" min="0" max="100" value="${budget.allocation.Wants}" required>
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label for="savings-percentage" class="form-label">Savings (%)</label>
                                                <input type="number" class="form-control" id="savings-percentage" min="0" max="100" value="${budget.allocation.Savings}" required>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="total-budget" class="form-label">Total Monthly Budget</label>
                                        <input type="number" class="form-control" id="total-budget" min="0" step="0.01" value="${budget.total}" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary">Save Budget Allocation</button>
                                    <button type="button" id="reset-budget-btn" class="btn btn-outline-secondary">Reset to 50/30/20</button>
                                </form>
                            </div>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h5>Budget Allocation</h5>
                                <div class="chart-container">
                                    <canvas id="allocation-chart"></canvas>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h5>Current Spending</h5>
                                <div class="chart-container">
                                    <canvas id="spending-chart"></canvas>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-12">
                                <h5>Budget vs. Actual Spending</h5>
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>Category</th>
                                                <th>Type</th>
                                                <th>Budget</th>
                                                <th>Actual</th>
                                                <th>Difference</th>
                                                <th>Progress</th>
                                            </tr>
                                        </thead>
                                        <tbody>`;
            
            // Add budget type rows
            ['Needs', 'Wants', 'Savings'].forEach(type => {
                const typePercentage = budget.allocation[type];
                const typeBudget = (budget.total * typePercentage / 100);
                const typeActual = typeTotals[type];
                const difference = typeBudget - typeActual;
                const percentage = typeBudget > 0 ? (typeActual / typeBudget * 100) : 0;
                
                html += `
                    <tr class="table-active">
                        <td><strong>${type}</strong></td>
                        <td></td>
                        <td>${formatCurrency(typeBudget)}</td>
                        <td>${formatCurrency(typeActual)}</td>
                        <td class="${difference >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(difference)}</td>
                        <td>
                            <div class="progress">
                                <div class="progress-bar ${percentage <= 100 ? 'bg-success' : 'bg-danger'}" 
                                    role="progressbar" 
                                    style="width: ${Math.min(percentage, 100)}%" 
                                    aria-valuenow="${typeActual}" 
                                    aria-valuemin="0" 
                                    aria-valuemax="${typeBudget}">
                                    ${percentage.toFixed(0)}%
                                </div>
                            </div>
                        </td>
                    </tr>`;
                
                // Add category rows for this type
                typeCategories[type].forEach(category => {
                    const categoryBudget = budget.categories[category] || 0;
                    const categoryActual = categoryTotals[category] || 0;
                    const catDifference = categoryBudget - categoryActual;
                    const catPercentage = categoryBudget > 0 ? (categoryActual / categoryBudget * 100) : 0;
                    
                    html += `
                        <tr>
                            <td class="ps-4">${category}</td>
                            <td><span class="badge" style="background-color: ${getBudgetTypeColor(type)};">${type}</span></td>
                            <td>${formatCurrency(categoryBudget)}</td>
                            <td>${formatCurrency(categoryActual)}</td>
                            <td class="${catDifference >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(catDifference)}</td>
                            <td>
                                <div class="progress">
                                    <div class="progress-bar ${catPercentage <= 100 ? 'bg-success' : 'bg-danger'}" 
                                        role="progressbar" 
                                        style="width: ${Math.min(catPercentage, 100)}%" 
                                        aria-valuenow="${categoryActual}" 
                                        aria-valuemin="0" 
                                        aria-valuemax="${categoryBudget}">
                                        ${catPercentage.toFixed(0)}%
                                    </div>
                                </div>
                            </td>
                        </tr>`;
                });
            });
            
            html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-4">
                    <div class="col-md-12">
                        <h5>Category Budget Settings</h5>
                        <form id="category-budget-form">
                            <h6 class="mt-3 mb-2" style="color: ${getBudgetTypeColor('Needs')};">Needs</h6>
                            <div class="row">`;
            
            // Add inputs for Needs categories
            Object.keys(BUDGET_CATEGORIES).filter(category => BUDGET_CATEGORIES[category] === 'Needs').forEach(category => {
                html += `
                    <div class="col-md-4 mb-3">
                        <div class="input-group">
                            <span class="input-group-text" style="background-color: ${getBudgetTypeColor('Needs')}; color: white;">${category}</span>
                            <input type="number" class="form-control category-budget" 
                                data-category="${category}" 
                                min="0" 
                                step="0.01" 
                                value="${budget.categories[category] || 0}">
                        </div>
                    </div>`;
            });
            
            html += `
                            </div>
                            
                            <h6 class="mt-3 mb-2" style="color: ${getBudgetTypeColor('Wants')};">Wants</h6>
                            <div class="row">`;
            
            // Add inputs for Wants categories
            Object.keys(BUDGET_CATEGORIES).filter(category => BUDGET_CATEGORIES[category] === 'Wants').forEach(category => {
                html += `
                    <div class="col-md-4 mb-3">
                        <div class="input-group">
                            <span class="input-group-text" style="background-color: ${getBudgetTypeColor('Wants')}; color: white;">${category}</span>
                            <input type="number" class="form-control category-budget" 
                                data-category="${category}" 
                                min="0" 
                                step="0.01" 
                                value="${budget.categories[category] || 0}">
                        </div>
                    </div>`;
            });
            
            html += `
                            </div>
                            
                            <h6 class="mt-3 mb-2" style="color: ${getBudgetTypeColor('Savings')};">Savings</h6>
                            <div class="row">`;
            
            // Add inputs for Savings categories
            Object.keys(BUDGET_CATEGORIES).filter(category => BUDGET_CATEGORIES[category] === 'Savings').forEach(category => {
                html += `
                    <div class="col-md-4 mb-3">
                        <div class="input-group">
                            <span class="input-group-text" style="background-color: ${getBudgetTypeColor('Savings')}; color: white;">${category}</span>
                            <input type="number" class="form-control category-budget" 
                                data-category="${category}" 
                                min="0" 
                                step="0.01" 
                                value="${budget.categories[category] || 0}">
                        </div>
                    </div>`;
            });
            
            html += `
                            </div>
                            <button type="submit" class="btn btn-primary">Save Category Budgets</button>
                        </form>
                    </div>
                </div>`;
            
            contentArea.innerHTML = html;
            
            // Create allocation chart
            const allocationCtx = document.getElementById('allocation-chart').getContext('2d');
            new Chart(allocationCtx, {
                type: 'pie',
                data: {
                    labels: ['Needs', 'Wants', 'Savings'],
                    datasets: [{
                        data: [budget.allocation.Needs, budget.allocation.Wants, budget.allocation.Savings],
                        backgroundColor: [
                            getBudgetTypeColor('Needs'),
                            getBudgetTypeColor('Wants'),
                            getBudgetTypeColor('Savings')
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Budget Allocation'
                        }
                    }
                }
            });
            
            // Create spending chart
            const spendingCtx = document.getElementById('spending-chart').getContext('2d');
            new Chart(spendingCtx, {
                type: 'pie',
                data: {
                    labels: ['Needs', 'Wants', 'Savings'],
                    datasets: [{
                        data: [typeTotals.Needs, typeTotals.Wants, typeTotals.Savings],
                        backgroundColor: [
                            getBudgetTypeColor('Needs'),
                            getBudgetTypeColor('Wants'),
                            getBudgetTypeColor('Savings')
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Current Spending'
                        }
                    }
                }
            });
            
            // Add event listeners
            document.getElementById('budget-allocation-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const needsPercentage = parseInt(document.getElementById('needs-percentage').value);
                const wantsPercentage = parseInt(document.getElementById('wants-percentage').value);
                const savingsPercentage = parseInt(document.getElementById('savings-percentage').value);
                
                // Validate that percentages add up to 100
                if (needsPercentage + wantsPercentage + savingsPercentage !== 100) {
                    alert('Percentages must add up to 100%');
                    return;
                }
                
                const totalBudget = parseFloat(document.getElementById('total-budget').value);
                
                // Update budget
                const budget = await getBudget();
                budget.total = totalBudget;
                budget.allocation = {
                    Needs: needsPercentage,
                    Wants: wantsPercentage,
                    Savings: savingsPercentage
                };
                
                await saveBudget(budget);
                loadBudgetView();
            });
            
            document.getElementById('reset-budget-btn').addEventListener('click', () => {
                document.getElementById('needs-percentage').value = 50;
                document.getElementById('wants-percentage').value = 30;
                document.getElementById('savings-percentage').value = 20;
            });
            
            document.getElementById('category-budget-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const budget = await getBudget();
                
                // Update category budgets
                document.querySelectorAll('.category-budget').forEach(input => {
                    const category = input.getAttribute('data-category');
                    const value = parseFloat(input.value);
                    budget.categories[category] = value;
                });
                
                await saveBudget(budget);
                loadBudgetView();
            });
        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error("Error loading budget view:", error);
            showError(`Error loading budget: ${error.message}`);
        }
    })();
}

async function loadReportsView() {
    showLoading();
    
    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
        showError("Reports loading timed out. Please refresh the page.");
    }, 10000);
    
    // Wrap in async function to properly handle promises
    (async function() {
        try {
            const expenses = await getExpenses();
            const income = await getIncome();
            clearTimeout(loadingTimeout);
            
            // Calculate monthly totals for expenses and income
            const monthlyExpenses = {};
            const monthlyIncome = {};
            
            // Process expenses
            expenses.forEach(expense => {
                const month = expense.date.substring(0, 7); // Format: YYYY-MM
                if (!monthlyExpenses[month]) {
                    monthlyExpenses[month] = 0;
                }
                monthlyExpenses[month] += parseFloat(expense.amount);
            });
            
            // Process income
            income.forEach(inc => {
                const month = inc.date.substring(0, 7); // Format: YYYY-MM
                if (!monthlyIncome[month]) {
                    monthlyIncome[month] = 0;
                }
                monthlyIncome[month] += parseFloat(inc.amount);
            });
            
            // Get all months from both datasets
            const allMonths = [...new Set([...Object.keys(monthlyExpenses), ...Object.keys(monthlyIncome)])].sort();
            
            let html = `
                <div class="card">
                    <div class="card-header">Budget Buddy Reports</div>
                    <div class="card-body">
                        <div class="row mb-4">
                            <div class="col-md-12">
                                <h5>Monthly Overview</h5>
                                <div class="chart-container" style="height: 400px;">
                                    <canvas id="monthly-chart"></canvas>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-12">
                                <h5>Monthly Summary</h5>
                                <div class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Income</th>
                                                <th>Expenses</th>
                                                <th>Net</th>
                                                <th>Savings Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>`;
            
            // Add rows for each month
            allMonths.forEach(month => {
                const monthIncome = monthlyIncome[month] || 0;
                const monthExpenses = monthlyExpenses[month] || 0;
                const net = monthIncome - monthExpenses;
                const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpenses) / monthIncome * 100).toFixed(1) : 0;
                
                const displayMonth = new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                
                html += `
                    <tr>
                        <td>${displayMonth}</td>
                        <td class="text-success">${formatCurrency(monthIncome)}</td>
                        <td class="text-danger">${formatCurrency(monthExpenses)}</td>
                        <td class="${net >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(net)}</td>
                        <td>${savingsRate}%</td>
                    </tr>`;
            });
            
            html += `
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            contentArea.innerHTML = html;
            
            // Create monthly chart
            const monthlyCtx = document.getElementById('monthly-chart').getContext('2d');
            
            // Prepare data for chart
            const labels = allMonths.map(month => {
                return new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            });
            
            const incomeData = allMonths.map(month => monthlyIncome[month] || 0);
            const expenseData = allMonths.map(month => monthlyExpenses[month] || 0);
            const netData = allMonths.map(month => (monthlyIncome[month] || 0) - (monthlyExpenses[month] || 0));
            
            new Chart(monthlyCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Income',
                            data: incomeData,
                            backgroundColor: 'rgba(75, 192, 192, 0.5)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Expenses',
                            data: expenseData,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Net',
                            data: netData,
                            type: 'line',
                            fill: false,
                            borderColor: 'rgba(54, 162, 235, 1)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
        } catch (error) {
            clearTimeout(loadingTimeout);
            console.error("Error loading reports view:", error);
            showError(`Error loading reports: ${error.message}`);
        }
    })();
}

// Update the initApp function to remove local storage references
async function initApp() {
    // Add active class to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    try {
        // Check if user is logged in
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            // User is logged in, load dashboard
            document.getElementById('nav-dashboard').classList.add('active');
            loadDashboardView();
        } else {
            // User is not logged in, show auth view
            loadAuthView();
        }
        
        // Listen for auth state changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                document.getElementById('nav-dashboard').classList.add('active');
                loadDashboardView();
            } else if (event === 'SIGNED_OUT') {
                loadAuthView();
            }
        });
    } catch (error) {
        console.error('Authentication error:', error);
        // Show auth view on error
        loadAuthView();
    }
}

// Start the application
initApp();

// Add this function to your app.js
function loadAuthView() {
    let html = `
        <div class="card">
            <div class="card-header">Budget Buddy Authentication</div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h5>Sign In</h5>
                        <form id="login-form">
                            <div class="mb-3">
                                <label for="login-email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="login-email" required>
                            </div>
                            <div class="mb-3">
                                <label for="login-password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="login-password" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Sign In</button>
                        </form>
                        <div id="login-error" class="text-danger mt-2"></div>
                    </div>
                    <div class="col-md-6">
                        <h5>Sign Up</h5>
                        <form id="signup-form">
                            <div class="mb-3">
                                <label for="signup-email" class="form-label">Email</label>
                                <input type="email" class="form-control" id="signup-email" required>
                            </div>
                            <div class="mb-3">
                                <label for="signup-password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="signup-password" required minlength="6">
                            </div>
                            <button type="submit" class="btn btn-success">Sign Up</button>
                        </form>
                        <div id="signup-error" class="text-danger mt-2"></div>
                    </div>
                </div>
            </div>
        </div>`;
    
    contentArea.innerHTML = html;
    
    // Add event listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
}

// Add authentication handlers
async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const errorElement = document.getElementById('signup-error');
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
        });
        
        if (error) throw error;
        
        errorElement.textContent = 'Check your email for the confirmation link!';
        errorElement.className = 'text-success mt-2';
    } catch (error) {
        errorElement.textContent = error.message;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) throw error;
        
        // Redirect to dashboard on successful login
        loadDashboardView();
    } catch (error) {
        errorElement.textContent = error.message;
    }
}

// Add a new function to handle mini extension data
function handleMiniExtensionData(data) {
  // This function will process data coming from the mini extension
  if (data.type === 'expense') {
    // Add to expenses
    addExpense({
      amount: data.amount,
      description: data.description,
      category: data.category || 'Other',
      date: data.date
    });
  } else if (data.type === 'income') {
    // Add to income
    addIncome({
      amount: data.amount,
      description: data.description,
      date: data.date
    });
  }
}

// Add event listener for mini extension messages
window.addEventListener('message', (event) => {
  if (event.data.type === 'miniExtension') {
    handleMiniExtensionData(event.data.data);
  }
});

// Add a function to generate a shareable link to a specific view
function generateDeepLink(view, filters = {}) {
  const baseUrl = window.location.origin;
  const queryParams = new URLSearchParams();
  
  // Add view parameter
  queryParams.append('view', view);
  
  // Add any filters
  for (const [key, value] of Object.entries(filters)) {
    queryParams.append(key, value);
  }
  
  return `${baseUrl}?${queryParams.toString()}`;
}

// Export functions for use in the extension
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  // We're running in the extension context
  window.budgetBuddyAPI = {
    addExpense,
    addIncome,
    getCategories,
    getSources,
    generateDeepLink
  };
} 

// Add this to your dashboard app
function shareSessionWithExtension() {
  const session = supabaseClient.auth.session();
  
  // Your extension ID - you'll need to replace this with your actual extension ID
  const extensionId = "your_extension_id_here";
  
  chrome.runtime.sendMessage(extensionId, 
    {
      action: "setAuth",
      session: session
    }, 
    function(response) {
      if (response && response.success) {
        console.log("Successfully shared session with extension");
      }
    }
  );
}

// Call this when user logs in
document.getElementById('nav-signout').addEventListener('click', () => {
  // Your existing logout code
  // ...
  
  // Also notify extension
  chrome.runtime.sendMessage(extensionId, {action: "logout"});
});