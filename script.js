const BASE_EXPENSES = 500;
const BASE_SPENDING = 1000;

let budgets = {
    "Expenses": { remaining: BASE_EXPENSES },
    "Spending": { remaining: BASE_SPENDING }
};

let transactionHistory = []; 
let currentCategory = "Expenses";
let editingTxId = null; 

function loadData() {
    const savedHistory = localStorage.getItem('budgetTrackerHistory');
    const savedMonth = localStorage.getItem('lastMonth');
    const savedCarry = localStorage.getItem('spendingCarry');

    if (savedHistory) transactionHistory = JSON.parse(savedHistory);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (!savedMonth) {
        localStorage.setItem('lastMonth', currentMonth);
        localStorage.setItem('spendingCarry', "0");
    } else {
        const lastMonth = parseInt(savedMonth);

        if (currentMonth !== lastMonth) {
            applyMonthlyReset(lastMonth, currentMonth, currentYear);
        }
    }

    recalculateBalances();
}

function applyMonthlyReset(lastMonth, currentMonth, currentYear) {
    const monthDiff = currentMonth - lastMonth;

    // Handle year wrap (Dec → Jan)
    const normalizedDiff = monthDiff < 0 ? monthDiff + 12 : monthDiff;

    let newCarry = 0;

    if (normalizedDiff === 1) {
        // Only apply rollover if exactly one month passed
        let spent = 0;

        transactionHistory.forEach(tx => {
            if (tx.category === "Spending") {
                const txMonth = new Date(tx.date).getMonth();
                if (txMonth === lastMonth) spent += tx.amount;
            }
        });

        const leftover = BASE_SPENDING - spent;
        newCarry = Math.max(leftover, 0);
    } else {
        // If more than one month passed, no rollover
        newCarry = 0;
    }

    localStorage.setItem('spendingCarry', newCarry.toString());

    // Add system marker
    transactionHistory.push({
        id: 'system-' + Date.now(),
        category: 'System',
        date: new Date(currentYear, currentMonth, 1).toISOString(),
        amount: 0,
        isSystemMarker: true,
        label: `--- New Month Started (${currentMonth + 1}/${currentYear}) ---`
    });

    localStorage.setItem('lastMonth', currentMonth);
}

function saveToStorage() {
    localStorage.setItem('budgetTrackerHistory', JSON.stringify(transactionHistory));
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const activeNavButton = document.getElementById(`nav-${tabId}`);
    if (activeNavButton) activeNavButton.classList.add('active');

    if (tabId === 'history') renderHistory();
}

function selectCategory(category) {
    currentCategory = category;

    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));

    const btn = document.getElementById("btn-" + category);
    if (btn) btn.classList.add('active');

    document.getElementById('current-title').innerText = category;

    updateDisplay();
}

function updateDisplay() {
    let budget = budgets[currentCategory];
    const amountEl = document.getElementById('remaining-amount');
    if (amountEl && budget) {
        amountEl.innerText = budget.remaining.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    const startLabel = document.getElementById('start-label');
if (startLabel) {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
startLabel.innerText = monthName;
}

}

function handleEnter() {
    let inputField = document.getElementById('spend-amount');
    if (!inputField) return;
    
    let amountSpent = parseFloat(inputField.value);

    if (isNaN(amountSpent) || amountSpent <= 0) {
        alert("Please enter a valid amount greater than 0");
        return;
    }

    transactionHistory.push({
        id: 'tx-' + Date.now() + Math.random().toString(36).substr(2, 4),
        category: currentCategory,
        date: new Date().toISOString(),
        amount: amountSpent,
        isSystemMarker: false
    });

    inputField.value = ''; 
    recalculateBalances();
}

function recalculateBalances() {
    // Reset base values
    budgets["Expenses"].remaining = BASE_EXPENSES;

    const carry = parseFloat(localStorage.getItem('spendingCarry')) || 0;
    budgets["Spending"].remaining = BASE_SPENDING + carry;

    // Apply all transactions
    let chronological = [...transactionHistory].sort((a,b) => new Date(a.date) - new Date(b.date));

    chronological.forEach(tx => {
        if (!tx.isSystemMarker && budgets[tx.category]) {
            budgets[tx.category].remaining -= tx.amount;
        }
    });

    saveToStorage();
    updateDisplay();
}

function renderHistory() {
    let historyList = document.getElementById('history-list');
    if (!historyList) return;
    historyList.innerHTML = ''; 

    let displayHistory = [...transactionHistory].sort((a,b) => new Date(b.date) - new Date(a.date));

    if (displayHistory.length === 0) {
        historyList.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">No transactions yet.</p>';
        return;
    }

    displayHistory.forEach(item => {
        let div = document.createElement('div');
        
        if (item.isSystemMarker) {
            div.className = 'history-system-marker';
            div.innerText = item.label;
        } else {
            div.className = 'history-item';
            div.onclick = () => openEditModal(item.id);
            let localeDate = new Date(item.date).toLocaleString([], {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
            div.innerHTML = `
                <div class="history-item-details">
                    <strong>${item.category} <span class="edit-badge">✏️ Edit</span></strong>
                    <span class="history-item-date">${localeDate}</span>
                </div>
                <span class="history-item-amount">-$${item.amount.toFixed(2)}</span>
            `;
        }
        historyList.appendChild(div);
    });
}

function openEditModal(id) {
    const tx = transactionHistory.find(item => item.id === id);
    if (!tx) return;
    editingTxId = id;

    let localDate = new Date(tx.date);
    let tzOffset = localDate.getTimezoneOffset() * 60000;
    let localISOTime = (new Date(localDate.getTime() - tzOffset)).toISOString().slice(0, 16);

    const amtInput = document.getElementById('edit-amount');
    const dateInput = document.getElementById('edit-date');
    const modalEl = document.getElementById('editModal');
    
    if (amtInput) amtInput.value = tx.amount;
    if (dateInput) dateInput.value = localISOTime;
    if (modalEl) modalEl.style.display = 'flex';
}

function closeEditModal() {
    const modalEl = document.getElementById('editModal');
    if (modalEl) modalEl.style.display = 'none';
    editingTxId = null;
}

function saveEdit() {
    const tx = transactionHistory.find(item => item.id === editingTxId);
    const amtInput = document.getElementById('edit-amount');
    const dateInput = document.getElementById('edit-date');
    
    if (!amtInput || !dateInput) return;
    
    const newAmount = parseFloat(amtInput.value);
    const newDateVal = dateInput.value;

    if (!tx || isNaN(newAmount) || newAmount <= 0 || !newDateVal) {
        alert("Please enter valid parameters.");
        return;
    }

    tx.amount = newAmount;
    tx.date = new Date(newDateVal).toISOString();

    closeEditModal();
    recalculateBalances();
    if (document.getElementById('history').classList.contains('active')) {
        renderHistory();
    }
}

function deleteTransaction() {
    if (confirm("Are you sure you want to delete this event forever?")) {
        transactionHistory = transactionHistory.filter(item => item.id !== editingTxId);
        closeEditModal();
        recalculateBalances();
        if (document.getElementById('history').classList.contains('active')) {
            renderHistory();
        }
    }
}

function downloadHistory() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactionHistory, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `budget_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function clearAllHistory() {
    if (confirm("WARNING: This will permanently wipe all internal history logs. Ensure you have downloaded a backup file first. Proceed?")) {
        transactionHistory = [];
        recalculateBalances();
        if (document.getElementById('history').classList.contains('active')) {
            renderHistory();
        }
    }
}

// Make functions accessible from HTML onClick attributes
window.switchTab = switchTab;
window.selectCategory = selectCategory;
window.handleEnter = handleEnter;
window.downloadHistory = downloadHistory;
window.clearAllHistory = clearAllHistory;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEdit = saveEdit;
window.deleteTransaction = deleteTransaction;

// Fire up once DOM elements exist
document.addEventListener("DOMContentLoaded", () => {
    loadData();
switchTab('tracker');
selectCategory('Expenses');
updateDisplay();
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}
