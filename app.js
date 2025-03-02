// API Configuration
const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

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

// Event Listeners
document.getElementById('nav-dashboard').addEventListener('click', () => loadDashboardView());
document.getElementById('nav-expenses').addEventListener('click', () => loadExpensesView());
document.getElementById('nav-income').addEventListener('click', () => loadIncomeView());
document.getElementById('nav-budget').addEventListener('click', () => loadBudgetView());
document.getElementById('nav-reports').addEventListener('click', () => loadReportsView());

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

// API Functions
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Expense API Functions
async function fetchStockData() {
    try {
        // Using the stock quote endpoint to get some financial data
        return await fetchData('/quote/AAPL,MSFT,GOOGL');
    } catch (error) {
        console.error('Error fetching stock data:', error);
        return [];
    }
}

async function addExpenseWithMarketData(expense) {
    try {
        // Get current market data to associate with the expense
        const stockData = await fetchStockData();
        
        // In a real API, we would POST to an endpoint
        // For this demo, we'll add market context to the expense and save to local storage
        expense.id = Date.now();
        expense.marketContext = {
            date: new Date().toISOString(),
            marketData: stockData.length > 0 ? 
                `${stockData[0].symbol}: ${stockData[0].price} (${stockData[0].changesPercentage}%)` : 
                'No market data available'
        };
        
        const expenses = getExpenses();
        expenses.push(expense);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
        
        return expense;
    } catch (error) {
        console.error('Error adding expense with market data:', error);
        // Fall back to simple local storage
        return saveExpenseToLocalStorage(expense);
    }
}

function saveExpenseToLocalStorage(expense) {
    const expenses = getExpenses();
    expense.id = Date.now();
    expenses.push(expense);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    return expense;
}

async function deleteExpenseAPI(id) {
    try {
        // In a real API, we would DELETE from an endpoint
        // For this demo, we'll just remove from local storage
        const expenses = getExpenses();
        const filteredExpenses = expenses.filter(expense => expense.id !== id);
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(filteredExpenses));
        return { success: true };
    } catch (error) {
        console.error('Error deleting expense:', error);
        throw error;
    }
}

// Data Management Functions
function getExpenses() {
    const expenses = localStorage.getItem(EXPENSES_KEY);
    return expenses ? JSON.parse(expenses) : [];
}

async function saveExpense(expense) {
    try {
        // Add expense with market data context
        await addExpenseWithMarketData(expense);
        
        // If we're on the expenses view, refresh it
        if (document.querySelector('#nav-expenses').classList.contains('active')) {
            loadExpensesView();
        }
        
        return true;
    } catch (error) {
        console.error('Failed to save expense:', error);
        // Fall back to local storage only
        saveExpenseToLocalStorage(expense);
        return false;
    }
}

function deleteExpense(id) {
    // Call the API function and then update UI
    deleteExpenseAPI(id)
        .then(() => {
            // If we're on the expenses view, refresh it
            if (document.querySelector('#nav-expenses').classList.contains('active')) {
                loadExpensesView();
            }
        })
        .catch(error => {
            showError('Failed to delete expense. Please try again.');
        });
}

function updateExpense(updatedExpense) {
    const expenses = getExpenses();
    const index = expenses.findIndex(expense => expense.id === updatedExpense.id);
    if (index !== -1) {
        expenses[index] = updatedExpense;
        localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
        return true;
    }
    return false;
}

function getIncome() {
    const income = localStorage.getItem(INCOME_KEY);
    return income ? JSON.parse(income) : [];
}

function saveIncome(income) {
    const incomeList = getIncome();
    income.id = Date.now(); // Use timestamp as ID
    incomeList.push(income);
    localStorage.setItem(INCOME_KEY, JSON.stringify(incomeList));
}

function updateIncome(updatedIncome) {
    const incomeList = getIncome();
    const index = incomeList.findIndex(income => income.id === updatedIncome.id);
    if (index !== -1) {
        incomeList[index] = updatedIncome;
        localStorage.setItem(INCOME_KEY, JSON.stringify(incomeList));
        return true;
    }
    return false;
}

function deleteIncome(id) {
    const incomeList = getIncome();
    const filteredIncome = incomeList.filter(income => income.id !== id);
    localStorage.setItem(INCOME_KEY, JSON.stringify(filteredIncome));
}

function getBudget() {
    const budget = localStorage.getItem(BUDGET_KEY);
    return budget ? JSON.parse(budget) : {
        total: 0,
        categories: {},
        allocation: {
            Needs: 50,
            Wants: 30,
            Savings: 20
        }
    };
}

function saveBudget(budget) {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budget));
}

// View Loaders
function loadDashboardView() {
    showLoading();
    
    // Fetch stock market data for financial context
    fetchStockData()
        .then(marketData => {
            const expenses = getExpenses();
            const income = getIncome();
            const budget = getBudget();
            
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
            
            // Get recent transactions
            const recentExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
            const recentIncome = [...income].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
            
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
            
            // Add recent expenses
            recentExpenses.forEach(expense => {
                html += `
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold">${expense.description}</div>
                            <small class="text-muted">${expense.date} - ${expense.category}</small>
                        </div>
                        <span class="badge bg-danger rounded-pill">${formatCurrency(expense.amount)}</span>
                    </div>`;
            });
            
            // Add recent income
            recentIncome.forEach(income => {
                html += `
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold">${income.description}</div>
                            <small class="text-muted">${income.date} - Income</small>
                        </div>
                        <span class="badge bg-success rounded-pill">${formatCurrency(income.amount)}</span>
                    </div>`;
            });
            
            html += `
                                </div>
                            </div>
                        </div>
                        
                        <div class="row mt-4">
                            <div class="col-md-12">
                                <h5>Market Overview</h5>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Symbol</th>
                                                <th>Price</th>
                                                <th>Change</th>
                                            </tr>
                                        </thead>
                                        <tbody>`;
            
            // Add market data
            marketData.forEach(stock => {
                html += `
                    <tr>
                        <td>${stock.symbol}</td>
                        <td>${formatCurrency(stock.price)}</td>
                        <td class="${stock.change >= 0 ? 'text-success' : 'text-danger'}">${stock.change.toFixed(2)} (${stock.changesPercentage.toFixed(2)}%)</td>
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
            
            // Add budget allocation section to dashboard
            html += `
                <div class="row mt-4">
                    <div class="col-md-12">
                        <h5>Budget Allocation</h5>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="card" style="border-color: ${getBudgetTypeColor('Needs')};">
                                    <div class="card-body">
                                        <h6 class="card-title">Needs (${budget.allocation.Needs}%)</h6>
                                        <p class="card-text">Essential expenses like housing, food, utilities, and healthcare.</p>
                                        <div class="progress">
                                            <div class="progress-bar" 
                                                style="width: ${Math.min((typeTotals.Needs / (budget.total * budget.allocation.Needs / 100)) * 100, 100)}%; background-color: ${getBudgetTypeColor('Needs')};">
                                                ${formatCurrency(typeTotals.Needs)} / ${formatCurrency(budget.total * budget.allocation.Needs / 100)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card" style="border-color: ${getBudgetTypeColor('Wants')};">
                                    <div class="card-body">
                                        <h6 class="card-title">Wants (${budget.allocation.Wants}%)</h6>
                                        <p class="card-text">Non-essential expenses like entertainment, dining out, and shopping.</p>
                                        <div class="progress">
                                            <div class="progress-bar" 
                                                style="width: ${Math.min((typeTotals.Wants / (budget.total * budget.allocation.Wants / 100)) * 100, 100)}%; background-color: ${getBudgetTypeColor('Wants')};">
                                                ${formatCurrency(typeTotals.Wants)} / ${formatCurrency(budget.total * budget.allocation.Wants / 100)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card" style="border-color: ${getBudgetTypeColor('Savings')};">
                                    <div class="card-body">
                                        <h6 class="card-title">Savings (${budget.allocation.Savings}%)</h6>
                                        <p class="card-text">Money set aside for future goals, investments, and emergencies.</p>
                                        <div class="progress">
                                            <div class="progress-bar" 
                                                style="width: ${Math.min((typeTotals.Savings / (budget.total * budget.allocation.Savings / 100)) * 100, 100)}%; background-color: ${getBudgetTypeColor('Savings')};">
                                                ${formatCurrency(typeTotals.Savings)} / ${formatCurrency(budget.total * budget.allocation.Savings / 100)}
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
            const ctx = document.getElementById('expense-chart').getContext('2d');
            const categories = Object.keys(categoryTotals);
            const amounts = categories.map(category => categoryTotals[category]);
            const backgroundColors = categories.map(category => getCategoryColor(category));
            
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: amounts,
                        backgroundColor: backgroundColors,
                        hoverOffset: 4
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
        })
        .catch(error => {
            showError('Failed to load dashboard data. Please try again later.');
        });
}

function loadExpensesView() {
    showLoading();
    
    const expenses = getExpenses();
    
    let html = `
        <div class="card">
            <div class="card-header">Budget Buddy Expenses</div>
            <div class="card-body">
                <div class="row mb-4">
                    <div class="col-md-12">
                        <button class="btn btn-primary" id="add-expense-btn">Add New Expense</button>
                        <button class="btn btn-success" id="add-api-expense-btn">Add Expense with Market Data</button>
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
                                <div class="mb-3">
                                    <label for="expense-amount" class="form-label">Amount</label>
                                    <input type="number" class="form-control" id="expense-amount" step="0.01" min="0.01" required>
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
                                <th>Market Context</th>
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
            html += `
                <tr class="expense-item">
                    <td>${expense.date}</td>
                    <td>${expense.description}</td>
                    <td><span class="category-badge" style="background-color: ${getCategoryColor(expense.category)}; color: white;">${expense.category}</span></td>
                    <td><span class="badge" style="background-color: ${getBudgetTypeColor(budgetType)};">${budgetType}</span></td>
                    <td>${formatCurrency(expense.amount)}</td>
                    <td>${expense.marketContext ? expense.marketContext.marketData : 'N/A'}</td>
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
    });
    
    // Add API expense button
    document.getElementById('add-api-expense-btn').addEventListener('click', async () => {
        try {
            // Show loading state
            document.getElementById('add-api-expense-btn').textContent = 'Loading...';
            document.getElementById('add-api-expense-btn').disabled = true;
            
            // Fetch stock data to get a realistic expense amount
            const stockData = await fetchStockData();
            
            if (stockData.length > 0) {
                // Create an expense based on the stock price
                const stock = stockData[0];
                const newExpense = {
                    description: `${stock.symbol} Related Expense`,
                    amount: (stock.price / 10).toFixed(2), // Use a fraction of the stock price
                    category: 'Investments',
                    date: today,
                    notes: `Auto-generated expense based on ${stock.symbol} price: $${stock.price}`
                };
                
                // Save with market data
                await saveExpense(newExpense);
                
                // Reload the view
                loadExpensesView();
            } else {
                throw new Error('No stock data available');
            }
        } catch (error) {
            console.error('Error adding API expense:', error);
            document.getElementById('add-api-expense-btn').textContent = 'Add Expense with Market Data';
            document.getElementById('add-api-expense-btn').disabled = false;
            showError('Failed to add expense with market data. Please try again.');
        }
    });
    
    document.getElementById('cancel-expense-btn').addEventListener('click', () => {
        document.getElementById('expense-form-container').style.display = 'none';
    });
    
    document.getElementById('expense-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('expense-id').value;
        const expense = {
            description: document.getElementById('expense-description').value,
            amount: parseFloat(document.getElementById('expense-amount').value),
            category: document.getElementById('expense-category').value,
            date: document.getElementById('expense-date').value,
            notes: document.getElementById('expense-notes').value
        };
        
        if (id) {
            // Update existing expense
            expense.id = parseInt(id);
            updateExpense(expense);
            loadExpensesView();
        } else {
            // Add new expense
            saveExpense(expense).then(() => {
                loadExpensesView();
            });
        }
    });
    
    // Add event listeners to edit buttons
    const editButtons = document.querySelectorAll('.edit-expense-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const id = parseInt(button.getAttribute('data-id'));
            const expense = getExpenses().find(expense => expense.id === id);
            
            if (expense) {
                document.getElementById('expense-form-container').style.display = 'block';
                document.getElementById('expense-form-title').textContent = 'Edit Expense';
                document.getElementById('expense-id').value = expense.id;
                document.getElementById('expense-description').value = expense.description;
                document.getElementById('expense-amount').value = expense.amount;
                document.getElementById('expense-category').value = expense.category;
                document.getElementById('expense-date').value = expense.date;
                document.getElementById('expense-notes').value = expense.notes || '';
            }
        });
    });
    
    // Add event listeners to delete buttons
    const deleteButtons = document.querySelectorAll('.delete-expense-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this expense?')) {
                const id = parseInt(button.getAttribute('data-id'));
                deleteExpense(id);
            }
        });
    });
}

function loadBudgetView() {
    showLoading();
    
    const budget = getBudget();
    const expenses = getExpenses();
    
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
                            <div class="row">`;
    
    // Add inputs for each expense category
    Object.keys(BUDGET_CATEGORIES).forEach(category => {
        const type = BUDGET_CATEGORIES[category];
        html += `
            <div class="col-md-4 mb-3">
                <div class="input-group">
                    <span class="input-group-text" style="background-color: ${getBudgetTypeColor(type)}; color: white;">${category}</span>
                    <input type="number" class="form-control category-budget" 
                        data-category="${category}" 
                        min="0" 
                        step="0.01" 
                        value="${budget.categories[category] || 0}">
                </div>
                <small class="text-muted">${type}</small>
            </div>`;
    });
    
    html += `
                            </div>
                            <button type="submit" class="btn btn-primary">Save Category Budgets</button>
                        </form>
                    </div>
                </div>
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
    document.getElementById('budget-allocation-form').addEventListener('submit', (e) => {
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
        const budget = getBudget();
        budget.total = totalBudget;
        budget.allocation = {
            Needs: needsPercentage,
            Wants: wantsPercentage,
            Savings: savingsPercentage
        };
        
        saveBudget(budget);
        loadBudgetView();
    });
    
    document.getElementById('reset-budget-btn').addEventListener('click', () => {
        document.getElementById('needs-percentage').value = 50;
        document.getElementById('wants-percentage').value = 30;
        document.getElementById('savings-percentage').value = 20;
    });
    
    document.getElementById('category-budget-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const budget = getBudget();
        
        // Update category budgets
        document.querySelectorAll('.category-budget').forEach(input => {
            const category = input.getAttribute('data-category');
            const value = parseFloat(input.value);
            budget.categories[category] = value;
        });
        
        saveBudget(budget);
        loadBudgetView();
    });
}

// Initialize the dashboard
function initDashboard() {
    // Add active class to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Load dashboard view by default
    loadDashboardView();
}

// Start the application
initDashboard(); 