const STARTING_BALANCES = {
    "Groceries": 4800,
    "Excursions": 9600,
    "Gifts/Parties": 1200
};

let budgets = {
    "Groceries": { remaining: 4800 },
    "Excursions": { remaining: 9600 },
    "Gifts/Parties": { remaining: 1200 }
};
let transactionHistory = []; 
let currentCategory = "Groceries";
let editingTxId = null; 

function loadData() {
    const savedHistory = localStorage.getItem('budgetTrackerHistory');
    const lastResetYear = localStorage.getItem('lastResetYear');
    
    if (savedHistory) transactionHistory = JSON.parse(savedHistory);

    const now = new Date();
    const currentYear = now.getFullYear();
    const isFeb1stOrLater = (now.getMonth() === 1 && now.getDate() >= 1) || now.getMonth() > 1;

    if (isFeb1stOrLater && (!lastResetYear || parseInt(lastResetYear) < currentYear)) {
        transactionHistory.push({
            id: 'system-' + Date.now(),
            category: 'System',
            date: new Date(currentYear, 1, 1, 0, 0, 0).toISOString(),
            amount: 0,
            isSystemMarker: true,
            label: `--- Fiscal Year ${currentYear} Started ---`
        });
        localStorage.setItem('lastResetYear', currentYear.toString());
    }
    recalculateBalances(); 
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
    
    const safeId = "btn-" + category.replace("/", "-");
    const catBtn = document.getElementById(safeId);
    if (catBtn) catBtn.classList.add('active');
    
    const titleEl = document.getElementById('current-title');
    if (titleEl) titleEl.innerText = category;
    
    updateDisplay();
}

function updateDisplay() {
    let budget = budgets[currentCategory];
    const amountEl = document.getElementById('remaining-amount');
    if (amountEl && budget) {
        amountEl.innerText = budget.remaining.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    for (let cat in budgets) {
        budgets[cat].remaining = STARTING_BALANCES[cat];
    }
    let chronologicalHistory = [...transactionHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    chronologicalHistory.forEach(tx => {
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
    selectCategory('Groceries');
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}
