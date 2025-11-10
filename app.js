// Authentication System
class AuthSystem {
    constructor() {
        this.operators = this.loadOperators();
        this.currentOperator = this.loadCurrentOperator();
    }

    loadOperators() {
        const stored = localStorage.getItem('operators');
        if (stored) {
            return JSON.parse(stored);
        }
        // Default operator
        const defaultOperators = [
            { id: 'msdigital', password: 'ms123', name: 'MS Digital Operator' }
        ];
        this.saveOperators(defaultOperators);
        return defaultOperators;
    }

    saveOperators(operators) {
        localStorage.setItem('operators', JSON.stringify(operators));
    }

    loadCurrentOperator() {
        const stored = sessionStorage.getItem('currentOperator');
        return stored ? JSON.parse(stored) : null;
    }

    saveCurrentOperator(operator) {
        if (operator) {
            sessionStorage.setItem('currentOperator', JSON.stringify(operator));
        } else {
            sessionStorage.removeItem('currentOperator');
        }
    }

    login(operatorId, password) {
        const operator = this.operators.find(op => op.id === operatorId);
        if (operator && operator.password === password) {
            this.currentOperator = { id: operator.id, name: operator.name };
            this.saveCurrentOperator(this.currentOperator);
            return true;
        }
        return false;
    }

    logout() {
        
        this.currentOperator = null;
        this.saveCurrentOperator(null);
    }

    isAuthenticated() {
        return this.currentOperator !== null;
    }

    addOperator(operatorId, password, name) {
        const exists = this.operators.find(op => op.id === operatorId);
        if (exists) {
            return false;
        }
        this.operators.push({ id: operatorId, password, name });
        this.saveOperators(this.operators);
        return true;
    }
}

// Initialize Auth System
const authSystem = new AuthSystem();

// Enhanced Database System with IndexedDB and localStorage backup
class Database {
    constructor() {
        this.dbName = 'CableTVBillingDB';
        this.dbVersion = 1;
        this.db = null;
        this.useIndexedDB = 'indexedDB' in window;
        this.init();
    }

    async init() {
        if (this.useIndexedDB) {
            try {
                this.db = await this.openDB();
                await this.loadAllData();
            } catch (error) {
                console.warn('IndexedDB not available, using localStorage:', error);
                this.useIndexedDB = false;
                this.loadAllData();
            }
        } else {
            this.loadAllData();
        }
    }

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('customers')) {
                    db.createObjectStore('customers', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('payments')) {
                    db.createObjectStore('payments', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('expenses')) {
                    db.createObjectStore('expenses', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('invoices')) {
                    db.createObjectStore('invoices', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('operators')) {
                    db.createObjectStore('operators', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async saveToIndexedDB(storeName, data) {
        if (!this.db) return;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromIndexedDB(storeName) {
        if (!this.db) return [];
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    loadData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    async loadAllData() {
        if (this.useIndexedDB && this.db) {
            try {
                this.customers = await this.getAllFromIndexedDB('customers');
                this.payments = await this.getAllFromIndexedDB('payments');
                this.expenses = await this.getAllFromIndexedDB('expenses');
                this.invoices = await this.getAllFromIndexedDB('invoices');
                
                // Load settings
                const settings = await this.getAllFromIndexedDB('settings');
                const nextCustomerId = settings.find(s => s.key === 'nextCustomerId');
                const nextInvoiceId = settings.find(s => s.key === 'nextInvoiceId');
                
                this.nextCustomerId = nextCustomerId ? nextCustomerId.value : (this.loadData('nextCustomerId') || 1);
                this.nextInvoiceId = nextInvoiceId ? nextInvoiceId.value : (this.loadData('nextInvoiceId') || 1);
                
                // Migrate from localStorage if IndexedDB is empty
                if (this.customers.length === 0) {
                    const localCustomers = this.loadData('customers') || [];
                    if (localCustomers.length > 0) {
                        this.customers = localCustomers;
                        await this.saveAllCustomers();
                    }
                }
            } catch (error) {
                console.error('Error loading from IndexedDB:', error);
                this.loadFromLocalStorage();
            }
        } else {
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        this.customers = this.loadData('customers') || [];
        this.payments = this.loadData('payments') || [];
        this.expenses = this.loadData('expenses') || [];
        this.invoices = this.loadData('invoices') || [];
        this.nextCustomerId = this.loadData('nextCustomerId') || 1;
        this.nextInvoiceId = this.loadData('nextInvoiceId') || 1;
    }

    async saveAllCustomers() {
        // Save to IndexedDB
        if (this.useIndexedDB && this.db) {
            try {
                for (const customer of this.customers) {
                    await this.saveToIndexedDB('customers', customer);
                }
                await this.saveToIndexedDB('settings', { key: 'nextCustomerId', value: this.nextCustomerId });
            } catch (error) {
                console.error('Error saving to IndexedDB:', error);
            }
        }
        // Always backup to localStorage
        this.saveData('customers', this.customers);
        this.saveData('nextCustomerId', this.nextCustomerId);
    }

    async saveAllPayments() {
        if (this.useIndexedDB && this.db) {
            try {
                for (const payment of this.payments) {
                    await this.saveToIndexedDB('payments', payment);
                }
            } catch (error) {
                console.error('Error saving to IndexedDB:', error);
            }
        }
        this.saveData('payments', this.payments);
    }

    async saveAllExpenses() {
        if (this.useIndexedDB && this.db) {
            try {
                for (const expense of this.expenses) {
                    await this.saveToIndexedDB('expenses', expense);
                }
            } catch (error) {
                console.error('Error saving to IndexedDB:', error);
            }
        }
        this.saveData('expenses', this.expenses);
    }

    async saveAllInvoices() {
        if (this.useIndexedDB && this.db) {
            try {
                for (const invoice of this.invoices) {
                    await this.saveToIndexedDB('invoices', invoice);
                }
                await this.saveToIndexedDB('settings', { key: 'nextInvoiceId', value: this.nextInvoiceId });
            } catch (error) {
                console.error('Error saving to IndexedDB:', error);
            }
        }
        this.saveData('invoices', this.invoices);
        this.saveData('nextInvoiceId', this.nextInvoiceId);
    }

    saveCustomers() {
        this.saveAllCustomers();
    }

    savePayments() {
        this.saveAllPayments();
    }

    saveExpenses() {
        this.saveAllExpenses();
    }

    saveInvoices() {
        this.saveAllInvoices();
    }
}

// Initialize Database
let dataStore;

// Wait for database to initialize
async function initDatabase() {
    dataStore = new Database();
    // Wait a bit for IndexedDB to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    return dataStore;
}

// Initialize database and wait for it
initDatabase().then(() => {
    // Auto-save functionality - save data before page unload
    window.addEventListener('beforeunload', () => {
        if (dataStore && dataStore.customers) dataStore.saveCustomers();
        if (dataStore && dataStore.payments) dataStore.savePayments();
        if (dataStore && dataStore.expenses) dataStore.saveExpenses();
        if (dataStore && dataStore.invoices) dataStore.saveInvoices();
    });

    // Auto-save every 30 seconds
    setInterval(() => {
        if (dataStore && dataStore.customers) dataStore.saveCustomers();
        if (dataStore && dataStore.payments) dataStore.savePayments();
        if (dataStore && dataStore.expenses) dataStore.saveExpenses();
        if (dataStore && dataStore.invoices) dataStore.saveInvoices();
    }, 30000);
});

// Utility Functions
function formatCurrency(amount) {
    return `Rs. ${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function getCurrentMonth() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function generateCustomerId() {
    const id = String(dataStore.nextCustomerId).padStart(6, '0');
    dataStore.nextCustomerId++;
    return `CUST${id}`;
}

function generateInvoiceId() {
    const id = String(dataStore.nextInvoiceId).padStart(6, '0');
    dataStore.nextInvoiceId++;
    return `INV${id}`;
}

// Customer Balance Calculation
function calculateCustomerBalance(customerId) {
    const customer = dataStore.customers.find(c => c.id === customerId);
    if (!customer) return { paid: 0, balance: 0, totalDue: 0 };

    // Calculate total paid amount (all payments for this customer)
    const totalPaid = dataStore.payments
        .filter(p => p.customerId === customerId)
        .reduce((sum, p) => sum + p.amount, 0);

    // Calculate pending invoices amount
    const pendingInvoices = dataStore.invoices
        .filter(inv => inv.customerId === customerId && inv.status === 'pending')
        .reduce((sum, inv) => sum + inv.amount, 0);

    // If there are pending invoices, balance = pending invoices - (total paid - paid invoices)
    // Otherwise, balance = monthly amount - total paid
    const paidInvoices = dataStore.invoices
        .filter(inv => inv.customerId === customerId && inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate available payment (total paid minus what was used for paid invoices)
    const availablePayment = totalPaid - paidInvoices;

    // Balance calculation
    let balance = 0;
    if (pendingInvoices > 0) {
        // If there are pending invoices, balance is pending amount minus available payment
        balance = Math.max(0, pendingInvoices - availablePayment);
    } else {
        // If no pending invoices, show monthly amount minus total paid
        balance = Math.max(0, customer.amount - totalPaid);
    }

    return {
        paid: totalPaid,
        balance: balance,
        totalDue: pendingInvoices > 0 ? pendingInvoices : customer.amount,
        pendingInvoices: pendingInvoices
    };
}

// Navigation
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .sidebar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);
            
            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Load page-specific data
    if (pageName === 'dashboard') {
        updateDashboard();
    } else if (pageName === 'customers') {
        renderCustomers();
    } else if (pageName === 'payments') {
        renderPayments();
        updateOnlinePayments();
    } else if (pageName === 'expenses') {
        renderExpenses();
    } else if (pageName === 'reports') {
        updateReports();
    } else if (pageName === 'billing') {
        renderInvoices();
    } else if (pageName === 'history') {
        renderHistory();
        populateHistoryFilters();
    }
}

// Customer Management
function initCustomerManagement() {
    const addBtn = document.getElementById('add-customer-btn');
    const modal = document.getElementById('customer-modal');
    const form = document.getElementById('customer-form');
    const cancelBtn = document.getElementById('cancel-customer-btn');
    const closeBtn = modal.querySelector('.close');

    let editingCustomerId = null;

    addBtn?.addEventListener('click', () => {
        editingCustomerId = null;
        document.getElementById('customer-modal-title').textContent = 'Add Customer';
        form.reset();
        document.getElementById('customer-renew-date').value = getTodayDate();
        modal.classList.add('active');
    });

    cancelBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        editingCustomerId = null;
    });

    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        editingCustomerId = null;
    });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const customerData = {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            stbNumber: document.getElementById('customer-stb').value,
            amount: parseFloat(document.getElementById('customer-amount').value),
            renewDate: document.getElementById('customer-renew-date').value,
            status: document.getElementById('customer-status').value
        };

        (async () => {
            if (editingCustomerId) {
                updateCustomer(editingCustomerId, customerData);
            } else {
                await addCustomer(customerData);
            }
        })();

        modal.classList.remove('active');
        form.reset();
        editingCustomerId = null;
    });

    // Search functionality
    const searchInput = document.getElementById('customer-search');
    searchInput?.addEventListener('input', (e) => {
        filterCustomers(e.target.value);
    });

    window.editCustomer = (customerId) => {
        const customer = dataStore.customers.find(c => c.id === customerId);
        if (customer) {
            editingCustomerId = customerId;
            document.getElementById('customer-modal-title').textContent = 'Edit Customer';
            document.getElementById('customer-name').value = customer.name;
            document.getElementById('customer-phone').value = customer.phone;
            document.getElementById('customer-stb').value = customer.stbNumber;
            document.getElementById('customer-amount').value = customer.amount;
            document.getElementById('customer-renew-date').value = customer.renewDate;
            document.getElementById('customer-status').value = customer.status;
            modal.classList.add('active');
        }
    };

    window.deleteCustomer = (customerId) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            dataStore.customers = dataStore.customers.filter(c => c.id !== customerId);
            dataStore.saveCustomers();
            renderCustomers();
            updateDashboard();
        }
    };
}

function addCustomer(customerData) {
    return (async () => {
        try {
            if (localStorage.getItem('syncWithServer') === 'true') {
                const res = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData)
                });
                if (res.ok) {
                    const json = await res.json();
                    const customer = json.customer;
                    dataStore.customers.push(customer);
                    dataStore.saveCustomers();
                    renderCustomers();
                    updateDashboard();
                    return customer;
                }
                console.warn('Server rejected create customer; falling back to local store');
            }
        } catch (err) {
            console.warn('Failed to create customer on server, using local store', err);
        }

        const customer = {
            id: generateCustomerId(),
            ...customerData,
            createdAt: new Date().toISOString()
        };
        dataStore.customers.push(customer);
        dataStore.saveCustomers();
        renderCustomers();
        updateDashboard();
        return customer;
    })();
}

function updateCustomer(id, customerData) {
    const index = dataStore.customers.findIndex(c => c.id === id);
    if (index !== -1) {
        dataStore.customers[index] = {
            ...dataStore.customers[index],
            ...customerData
        };
        dataStore.saveCustomers();
        renderCustomers();
        updateDashboard();
    }
}

function renderCustomers() {
    const tbody = document.getElementById('customers-table');
    if (!tbody) return;

    if (dataStore.customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-state"><i class="fas fa-users"></i><p>No customers found. Add your first customer!</p></td></tr>';
        return;
    }

    tbody.innerHTML = dataStore.customers.map(customer => {
        const isExpired = new Date(customer.renewDate) < new Date();
        const statusClass = customer.status === 'active' ? 'status-active' : 'status-inactive';
        const statusText = isExpired && customer.status === 'active' ? 'Expired' : customer.status.charAt(0).toUpperCase() + customer.status.slice(1);
        const statusBadgeClass = isExpired ? 'status-expired' : statusClass;

        // Calculate balance
        const balanceInfo = calculateCustomerBalance(customer.id);
        const balanceClass = balanceInfo.balance > 0 ? 'balance-negative' : balanceInfo.balance < 0 ? 'balance-positive' : 'balance-zero';
        const balanceText = balanceInfo.balance > 0 ? formatCurrency(balanceInfo.balance) : balanceInfo.balance < 0 ? `+${formatCurrency(Math.abs(balanceInfo.balance))}` : formatCurrency(0);

        return `
            <tr>
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.stbNumber}</td>
                <td>${formatCurrency(customer.amount)}</td>
                <td>${formatCurrency(balanceInfo.paid)}</td>
                <td class="${balanceClass}">${balanceText}</td>
                <td>${formatDate(customer.renewDate)}</td>
                <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-success" onclick="sendSMS('${customer.id}')" title="Send Balance SMS">
                            <i class="fas fa-sms"></i> SMS
                        </button>
                        <button class="btn btn-primary" onclick="viewCustomerHistory('${customer.id}')" title="View Payment History">
                            <i class="fas fa-history"></i> History
                        </button>
                        <button class="btn btn-edit" onclick="editCustomer('${customer.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="deleteCustomer('${customer.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterCustomers(searchTerm) {
    const tbody = document.getElementById('customers-table');
    if (!tbody) return;

    const filtered = dataStore.customers.filter(customer => {
        const search = searchTerm.toLowerCase();
        return customer.name.toLowerCase().includes(search) ||
               customer.phone.includes(search) ||
               customer.stbNumber.toLowerCase().includes(search) ||
               customer.id.toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-state"><i class="fas fa-search"></i><p>No customers found matching your search.</p></td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(customer => {
        const isExpired = new Date(customer.renewDate) < new Date();
        const statusClass = customer.status === 'active' ? 'status-active' : 'status-inactive';
        const statusText = isExpired && customer.status === 'active' ? 'Expired' : customer.status.charAt(0).toUpperCase() + customer.status.slice(1);
        const statusBadgeClass = isExpired ? 'status-expired' : statusClass;

        // Calculate balance
        const balanceInfo = calculateCustomerBalance(customer.id);
        const balanceClass = balanceInfo.balance > 0 ? 'balance-negative' : balanceInfo.balance < 0 ? 'balance-positive' : 'balance-zero';
        const balanceText = balanceInfo.balance > 0 ? formatCurrency(balanceInfo.balance) : balanceInfo.balance < 0 ? `+${formatCurrency(Math.abs(balanceInfo.balance))}` : formatCurrency(0);

        return `
            <tr>
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                <td>${customer.stbNumber}</td>
                <td>${formatCurrency(customer.amount)}</td>
                <td>${formatCurrency(balanceInfo.paid)}</td>
                <td class="${balanceClass}">${balanceText}</td>
                <td>${formatDate(customer.renewDate)}</td>
                <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-success" onclick="sendSMS('${customer.id}')" title="Send Balance SMS">
                            <i class="fas fa-sms"></i> SMS
                        </button>
                        <button class="btn btn-primary" onclick="viewCustomerHistory('${customer.id}')" title="View Payment History">
                            <i class="fas fa-history"></i> History
                        </button>
                        <button class="btn btn-edit" onclick="editCustomer('${customer.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="deleteCustomer('${customer.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Payment Management
function initPaymentManagement() {
    const addBtn = document.getElementById('add-payment-btn');
    const modal = document.getElementById('payment-modal');
    const form = document.getElementById('payment-form');
    const cancelBtn = document.getElementById('cancel-payment-btn');
    const closeBtn = modal.querySelector('.close');

    let editingPaymentId = null;

    addBtn?.addEventListener('click', () => {
        editingPaymentId = null;
        document.getElementById('payment-modal-title').textContent = 'Add Payment';
        form.reset();
        document.getElementById('payment-date').value = getTodayDate();
        populateCustomerDropdown();
        modal.classList.add('active');
    });

    cancelBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        editingPaymentId = null;
    });

    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        editingPaymentId = null;
    });

    // Show/hide transaction ID field for online payments
    const paymentMethodSelect = document.getElementById('payment-method');
    const transactionIdGroup = document.getElementById('transaction-id-group');
    
    paymentMethodSelect?.addEventListener('change', (e) => {
        if (e.target.value === 'gpay' || e.target.value === 'phonepe') {
            transactionIdGroup.style.display = 'block';
        } else {
            transactionIdGroup.style.display = 'none';
        }
    });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const paymentData = {
            customerId: document.getElementById('payment-customer').value,
            amount: parseFloat(document.getElementById('payment-amount').value),
            method: document.getElementById('payment-method').value,
            date: document.getElementById('payment-date').value,
            transactionId: document.getElementById('payment-transaction-id').value || null
        };

        (async () => {
            if (editingPaymentId) {
                updatePayment(editingPaymentId, paymentData);
            } else {
                await addPayment(paymentData);
            }
        })();

        modal.classList.remove('active');
        form.reset();
        transactionIdGroup.style.display = 'none';
        editingPaymentId = null;
    });

    window.editPayment = (paymentId) => {
        const payment = dataStore.payments.find(p => p.id === paymentId);
        if (payment) {
            editingPaymentId = paymentId;
            document.getElementById('payment-modal-title').textContent = 'Edit Payment';
            populateCustomerDropdown();
            document.getElementById('payment-customer').value = payment.customerId;
            document.getElementById('payment-amount').value = payment.amount;
            document.getElementById('payment-method').value = payment.method;
            document.getElementById('payment-date').value = payment.date;
            document.getElementById('payment-transaction-id').value = payment.transactionId || '';
            
            // Show transaction ID field if online payment
            if (payment.method === 'gpay' || payment.method === 'phonepe') {
                document.getElementById('transaction-id-group').style.display = 'block';
            }
            
            modal.classList.add('active');
        }
    };

    window.deletePayment = (paymentId) => {
        if (confirm('Are you sure you want to delete this payment?')) {
            dataStore.payments = dataStore.payments.filter(p => p.id !== paymentId);
            dataStore.savePayments();
            renderPayments();
            updateDashboard();
            updateOnlinePayments();
            renderCustomers(); // Update customer balances
            
            // Update history if on history page
            if (document.getElementById('history-page')?.classList.contains('active')) {
                renderHistory();
            }
        }
    };
}

function populateCustomerDropdown() {
    const select = document.getElementById('payment-customer');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Customer</option>';
    dataStore.customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.id} - ${customer.name}`;
        select.appendChild(option);
    });
}

function addPayment(paymentData) {
    return (async () => {
        const customer = dataStore.customers.find(c => c.id === paymentData.customerId);
        if (!customer) return;

        // Calculate balance before payment
        const balanceBefore = calculateCustomerBalance(paymentData.customerId).balance;
        // Get month from payment date
        const paymentDate = new Date(paymentData.date);
        const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

        // If sync enabled, try posting to server
        try {
            if (localStorage.getItem('syncWithServer') === 'true') {
                const res = await fetch('/api/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paymentData)
                });
                if (res.ok) {
                    const json = await res.json();
                    const payment = json.payment;
                    // Ensure month and balances exist
                    payment.month = payment.month || paymentMonth;
                    payment.balanceBefore = balanceBefore;
                    payment.balanceAfter = Math.max(0, balanceBefore - payment.amount);
                    dataStore.payments.push(payment);
                    dataStore.savePayments();
                    renderPayments();
                    updateDashboard();
                    updateOnlinePayments();
                    renderCustomers();
                    if (document.getElementById('history-page')?.classList.contains('active')) {
                        renderHistory();
                    }
                    return payment;
                }
                console.warn('Server rejected payment; falling back to local store');
            }
        } catch (err) {
            console.warn('Failed to create payment on server, using local store', err);
        }

        const payment = {
            id: `PAY${Date.now()}`,
            ...paymentData,
            month: paymentMonth,
            balanceBefore: balanceBefore,
            balanceAfter: Math.max(0, balanceBefore - paymentData.amount),
            createdAt: new Date().toISOString()
        };

        dataStore.payments.push(payment);
        dataStore.savePayments();
        renderPayments();
        updateDashboard();
        updateOnlinePayments();
        renderCustomers(); // Update customer balances

        // Update history if on history page
        if (document.getElementById('history-page')?.classList.contains('active')) {
            renderHistory();
        }
        return payment;
    })();
}

function updatePayment(id, paymentData) {
    const index = dataStore.payments.findIndex(p => p.id === id);
    if (index !== -1) {
        const oldPayment = dataStore.payments[index];
        const customer = dataStore.customers.find(c => c.id === paymentData.customerId);
        
        if (!customer) return;

        // Calculate balance before payment
        const balanceBefore = calculateCustomerBalance(paymentData.customerId).balance;
        
        // Get month from payment date
        const paymentDate = new Date(paymentData.date);
        const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        
        dataStore.payments[index] = {
            ...oldPayment,
            ...paymentData,
            month: paymentMonth,
            balanceBefore: balanceBefore,
            balanceAfter: Math.max(0, balanceBefore - paymentData.amount)
        };
        dataStore.savePayments();
        renderPayments();
        updateDashboard();
        updateOnlinePayments();
        renderCustomers(); // Update customer balances
        
        // Update history if on history page
        if (document.getElementById('history-page')?.classList.contains('active')) {
            renderHistory();
        }
    }
}

let currentPaymentFilter = 'all';

function initPaymentFilters() {
    const filterButtons = document.querySelectorAll('.btn-filter');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPaymentFilter = btn.getAttribute('data-filter');
            renderPayments();
        });
    });
}

function renderPayments() {
    const tbody = document.getElementById('payments-table');
    if (!tbody) return;

    let payments = [...dataStore.payments];
    
    // Ensure all payments have month field (migrate old payments)
    payments.forEach(payment => {
        if (!payment.month) {
            const paymentDate = new Date(payment.date);
            payment.month = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            // Update in dataStore
            const index = dataStore.payments.findIndex(p => p.id === payment.id);
            if (index !== -1) {
                dataStore.payments[index].month = payment.month;
            }
        }
    });
    
    // Save if any were updated
    if (payments.some(p => !dataStore.payments.find(dp => dp.id === p.id && dp.month))) {
        dataStore.savePayments();
    }
    
    // Apply filter
    if (currentPaymentFilter !== 'all') {
        payments = payments.filter(p => {
            if (currentPaymentFilter === 'gpay') return p.method === 'gpay';
            if (currentPaymentFilter === 'phonepe') return p.method === 'phonepe';
            if (currentPaymentFilter === 'cash') return p.method === 'cash';
            return true;
        });
    }

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i class="fas fa-money-bill-wave"></i><p>No payments found. Add your first payment!</p></td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => {
        const customer = dataStore.customers.find(c => c.id === payment.customerId);
        const customerName = customer ? customer.name : 'Unknown';
        const methodLabels = {
            cash: 'Cash',
            gpay: 'GPay',
            phonepe: 'PhonePe',
            bank: 'Bank Transfer',
            other: 'Other'
        };

        const methodIcon = payment.method === 'gpay' ? '<i class="fab fa-google-pay"></i>' : 
                          payment.method === 'phonepe' ? '<i class="fas fa-mobile-alt"></i>' : '';

        return `
            <tr>
                <td>${formatDate(payment.date)}</td>
                <td>${customerName}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td>${methodIcon} ${methodLabels[payment.method] || payment.method}${payment.transactionId ? `<br><small style="color: var(--text-light);">Txn: ${payment.transactionId}</small>` : ''}</td>
                <td>${payment.method === 'gpay' || payment.method === 'phonepe' ? 'Online' : 'Offline'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="editPayment('${payment.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deletePayment('${payment.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).reverse();
}

function updateOnlinePayments() {
    const gpayCollection = dataStore.payments
        .filter(p => p.method === 'gpay')
        .reduce((sum, p) => sum + p.amount, 0);
    
    const phonepeCollection = dataStore.payments
        .filter(p => p.method === 'phonepe')
        .reduce((sum, p) => sum + p.amount, 0);
    
    const totalOnline = gpayCollection + phonepeCollection;

    document.getElementById('gpay-collection').textContent = formatCurrency(gpayCollection);
    document.getElementById('phonepe-collection').textContent = formatCurrency(phonepeCollection);
    document.getElementById('total-online-collection').textContent = formatCurrency(totalOnline);
}

// Expense Management
function initExpenseManagement() {
    const addBtn = document.getElementById('add-expense-btn');
    const modal = document.getElementById('expense-modal');
    const form = document.getElementById('expense-form');
    const cancelBtn = document.getElementById('cancel-expense-btn');
    const closeBtn = modal.querySelector('.close');

    let editingExpenseId = null;

    addBtn?.addEventListener('click', () => {
        editingExpenseId = null;
        document.getElementById('expense-modal-title').textContent = 'Add Expense';
        form.reset();
        document.getElementById('expense-date').value = getTodayDate();
        modal.classList.add('active');
    });

    cancelBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        editingExpenseId = null;
    });

    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        editingExpenseId = null;
    });

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const expenseData = {
            category: document.getElementById('expense-category').value,
            description: document.getElementById('expense-description').value,
            amount: parseFloat(document.getElementById('expense-amount').value),
            date: document.getElementById('expense-date').value
        };

        if (editingExpenseId) {
            updateExpense(editingExpenseId, expenseData);
        } else {
            addExpense(expenseData);
        }

        modal.classList.remove('active');
        form.reset();
        editingExpenseId = null;
    });

    window.editExpense = (expenseId) => {
        const expense = dataStore.expenses.find(e => e.id === expenseId);
        if (expense) {
            editingExpenseId = expenseId;
            document.getElementById('expense-modal-title').textContent = 'Edit Expense';
            document.getElementById('expense-category').value = expense.category;
            document.getElementById('expense-description').value = expense.description;
            document.getElementById('expense-amount').value = expense.amount;
            document.getElementById('expense-date').value = expense.date;
            modal.classList.add('active');
        }
    };

    window.deleteExpense = (expenseId) => {
        if (confirm('Are you sure you want to delete this expense?')) {
            dataStore.expenses = dataStore.expenses.filter(e => e.id !== expenseId);
            dataStore.saveExpenses();
            renderExpenses();
            updateDashboard();
            updateReports();
        }
    };
}

function addExpense(expenseData) {
    const expense = {
        id: `EXP${Date.now()}`,
        ...expenseData,
        createdAt: new Date().toISOString()
    };
    dataStore.expenses.push(expense);
    dataStore.saveExpenses();
    renderExpenses();
    updateDashboard();
    updateReports();
}

function updateExpense(id, expenseData) {
    const index = dataStore.expenses.findIndex(e => e.id === id);
    if (index !== -1) {
        dataStore.expenses[index] = {
            ...dataStore.expenses[index],
            ...expenseData
        };
        dataStore.saveExpenses();
        renderExpenses();
        updateDashboard();
        updateReports();
    }
}

function renderExpenses() {
    const tbody = document.getElementById('expenses-table');
    if (!tbody) return;

    if (dataStore.expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-chart-line"></i><p>No expenses found. Add your first expense!</p></td></tr>';
        return;
    }

    tbody.innerHTML = dataStore.expenses.map(expense => {
        const categoryLabels = {
            equipment: 'Equipment',
            maintenance: 'Maintenance',
            salary: 'Salary',
            rent: 'Rent',
            utilities: 'Utilities',
            other: 'Other'
        };

        return `
            <tr>
                <td>${formatDate(expense.date)}</td>
                <td>${categoryLabels[expense.category] || expense.category}</td>
                <td>${expense.description}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="editExpense('${expense.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteExpense('${expense.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).reverse();
}

// Dashboard
function updateDashboard() {
    const today = getTodayDate();
    const currentMonth = getCurrentMonth();

    // Today Collection
    const todayCollection = dataStore.payments
        .filter(p => p.date === today)
        .reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('today-collection').textContent = formatCurrency(todayCollection);
    updateProgressBar('today-collection-progress', todayCollection, 10000);

    // Monthly Collection
    const monthlyCollection = dataStore.payments
        .filter(p => p.date.startsWith(currentMonth))
        .reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('monthly-collection').textContent = formatCurrency(monthlyCollection);
    updateProgressBar('monthly-collection-progress', monthlyCollection, 100000);

    // Monthly Dues
    const monthlyDues = dataStore.customers
        .filter(c => c.status === 'active')
        .reduce((sum, c) => {
            const customerPayments = dataStore.payments
                .filter(p => p.customerId === c.id && p.date.startsWith(currentMonth))
                .reduce((s, p) => s + p.amount, 0);
            return sum + (c.amount - customerPayments);
        }, 0);
    document.getElementById('monthly-dues').textContent = formatCurrency(Math.max(0, monthlyDues));
    updateProgressBar('monthly-dues-progress', monthlyDues, 50000);

    // Total Outstanding
    const totalOutstanding = dataStore.customers
        .filter(c => c.status === 'active')
        .reduce((sum, c) => {
            const totalPaid = dataStore.payments
                .filter(p => p.customerId === c.id)
                .reduce((s, p) => s + p.amount, 0);
            return sum + Math.max(0, c.amount - totalPaid);
        }, 0);
    document.getElementById('total-outstanding').textContent = formatCurrency(totalOutstanding);
    updateProgressBar('total-outstanding-progress', totalOutstanding, 50000);

    // Total Expire
    const todayExpire = dataStore.customers.filter(c => {
        const renewDate = new Date(c.renewDate);
        const todayDate = new Date(today);
        return renewDate <= todayDate && c.status === 'active';
    }).length;
    document.getElementById('total-expire').textContent = todayExpire;
    updateProgressBar('total-expire-progress', todayExpire, 50);

    // Online Collection
    const onlineCollection = dataStore.payments
        .filter(p => p.method === 'gpay' || p.method === 'phonepe')
        .reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('online-collection').textContent = formatCurrency(onlineCollection);
    updateProgressBar('online-collection-progress', onlineCollection, 50000);

    // Active/Inactive Customers
    const activeCustomers = dataStore.customers.filter(c => c.status === 'active').length;
    const inactiveCustomers = dataStore.customers.filter(c => c.status === 'inactive').length;
    document.getElementById('active-customers').textContent = activeCustomers;
    document.getElementById('inactive-customers').textContent = inactiveCustomers;

    // Expire Customer Table
    renderExpireCustomers();
}

function updateProgressBar(id, value, max) {
    const progressBar = document.getElementById(id);
    if (progressBar) {
        const percentage = Math.min((value / max) * 100, 100);
        progressBar.style.width = `${percentage}%`;
    }
}

function renderExpireCustomers() {
    const tbody = document.getElementById('expire-customer-table');
    if (!tbody) return;

    const today = getTodayDate();
    const expiredCustomers = dataStore.customers.filter(c => {
        const renewDate = new Date(c.renewDate);
        const todayDate = new Date(today);
        return renewDate <= todayDate && c.status === 'active';
    }).sort((a, b) => new Date(a.renewDate) - new Date(b.renewDate));

    if (expiredCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-check-circle"></i><p>No expired customers!</p></td></tr>';
        return;
    }

    tbody.innerHTML = expiredCustomers.map(customer => {
        return `
            <tr>
                <td>${customer.id}</td>
                <td>${customer.name}</td>
                <td>${customer.phone}</td>
                
                <td>${customer.stbNumber}</td>
                <td>${formatCurrency(customer.amount)}</td>
                <td>${formatDate(customer.renewDate)}</td>
                <td>
                    <button class="btn btn-success" onclick="renewCustomer('${customer.id}')">
                        <i class="fas fa-sync"></i> Renew
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Search functionality for expire customers
    const searchInput = document.getElementById('expire-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

window.renewCustomer = (customerId) => {
    const customer = dataStore.customers.find(c => c.id === customerId);
    if (customer) {
        const newDate = new Date();
        newDate.setMonth(newDate.getMonth() + 1);
        customer.renewDate = newDate.toISOString().split('T')[0];
        dataStore.saveCustomers();
        renderExpireCustomers();
        updateDashboard();
        renderCustomers();
    }
};

// Reports
function updateReports() {
    const totalIncome = dataStore.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = dataStore.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('net-profit').textContent = formatCurrency(netProfit);
    
    const netProfitEl = document.getElementById('net-profit');
    netProfitEl.className = 'amount';
    if (netProfit > 0) {
        netProfitEl.classList.add('income');
    } else if (netProfit < 0) {
        netProfitEl.classList.add('expense');
    }
}

// Payment History Management
function populateHistoryFilters() {
    const customerFilter = document.getElementById('history-customer-filter');
    const monthFilter = document.getElementById('history-month-filter');

    // Populate customer filter
    if (customerFilter) {
        customerFilter.innerHTML = '<option value="">All Customers</option>';
        dataStore.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.id} - ${customer.name}`;
            customerFilter.appendChild(option);
        });

        customerFilter.addEventListener('change', renderHistory);
    }

    // Populate month filter (last 12 months)
    if (monthFilter) {
        monthFilter.innerHTML = '<option value="">All Months</option>';
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const option = document.createElement('option');
            option.value = monthStr;
            option.textContent = monthName;
            monthFilter.appendChild(option);
        }

        monthFilter.addEventListener('change', renderHistory);
    }
}

function renderHistory() {
    const tbody = document.getElementById('history-table');
    if (!tbody) return;

    let payments = [...dataStore.payments].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply filters
    const customerFilter = document.getElementById('history-customer-filter')?.value;
    const monthFilter = document.getElementById('history-month-filter')?.value;

    if (customerFilter) {
        payments = payments.filter(p => p.customerId === customerFilter);
        // Show customer summary
        showCustomerSummary(customerFilter);
    } else {
        // Hide customer summary
        const summaryCard = document.getElementById('customer-summary-card');
        if (summaryCard) summaryCard.style.display = 'none';
    }

    if (monthFilter) {
        payments = payments.filter(p => p.month === monthFilter);
    }

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-history"></i><p>No payment history found.</p></td></tr>';
        renderMonthlySummary();
        return;
    }

    tbody.innerHTML = payments.map(payment => {
        const customer = dataStore.customers.find(c => c.id === payment.customerId);
        const customerName = customer ? customer.name : 'Unknown';
        const methodLabels = {
            cash: 'Cash',
            gpay: 'GPay',
            phonepe: 'PhonePe',
            bank: 'Bank Transfer',
            other: 'Other'
        };

        const monthDate = payment.month ? new Date(payment.month + '-01') : new Date(payment.date);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        return `
            <tr>
                <td>${formatDate(payment.date)}</td>
                <td>${customerName}</td>
                <td>${monthName}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td>${methodLabels[payment.method] || payment.method}</td>
                <td>${formatCurrency(payment.balanceBefore || 0)}</td>
                <td>${formatCurrency(payment.balanceAfter || 0)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="editPayment('${payment.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deletePayment('${payment.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderMonthlySummary();
}

function showCustomerSummary(customerId) {
    const customer = dataStore.customers.find(c => c.id === customerId);
    if (!customer) return;

    const summaryCard = document.getElementById('customer-summary-card');
    const customerName = document.getElementById('customer-summary-name');
    const totalPaid = document.getElementById('customer-total-paid');
    const currentBalance = document.getElementById('customer-current-balance');
    const paymentCount = document.getElementById('customer-payment-count');

    if (summaryCard) summaryCard.style.display = 'block';
    if (customerName) customerName.textContent = `${customer.id} - ${customer.name}`;

    const customerPayments = dataStore.payments.filter(p => p.customerId === customerId);
    const totalPaidAmount = customerPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceInfo = calculateCustomerBalance(customerId);

    if (totalPaid) totalPaid.textContent = formatCurrency(totalPaidAmount);
    if (currentBalance) {
        currentBalance.textContent = formatCurrency(balanceInfo.balance);
        currentBalance.className = 'summary-value';
        if (balanceInfo.balance > 0) {
            currentBalance.classList.add('balance-negative');
        } else if (balanceInfo.balance < 0) {
            currentBalance.classList.add('balance-positive');
        }
    }
    if (paymentCount) paymentCount.textContent = customerPayments.length;
}

window.viewCustomerHistory = (customerId) => {
    // Navigate to history page
    showPage('history');
    
    // Set customer filter
    const customerFilter = document.getElementById('history-customer-filter');
    if (customerFilter) {
        customerFilter.value = customerId;
        renderHistory();
    }
};

function renderMonthlySummary() {
    const summaryContainer = document.getElementById('monthly-summary');
    if (!summaryContainer) return;

    // Get last 12 months
    const today = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const monthPayments = dataStore.payments.filter(p => p.month === monthStr);
        const totalAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        const paymentCount = monthPayments.length;

        months.push({
            month: monthStr,
            name: monthName,
            amount: totalAmount,
            count: paymentCount
        });
    }

    summaryContainer.innerHTML = months.map(month => {
        return `
            <div class="month-card">
                <h4>${month.name}</h4>
                <div class="amount">${formatCurrency(month.amount)}</div>
                <div class="count">${month.count} payment(s)</div>
            </div>
        `;
    }).join('');
}

// Invoice Management
function initInvoiceManagement() {
    const generateBtn = document.getElementById('generate-invoice-btn');
    const generateSingleBtn = document.getElementById('generate-single-invoice-btn');
    
    generateBtn?.addEventListener('click', () => {
        generateInvoice();
    });
    
    generateSingleBtn?.addEventListener('click', () => {
        showSingleInvoiceModal();
    });
}

function showSingleInvoiceModal() {
    const modal = document.getElementById('single-invoice-modal');
    if (!modal) {
        // Create modal if it doesn't exist
        createSingleInvoiceModal();
    }
    populateInvoiceCustomerDropdown();
    document.getElementById('single-invoice-modal').classList.add('active');
}

function generateInvoice() {
    const activeCustomers = dataStore.customers.filter(c => c.status === 'active');
    let generatedCount = 0;
    
    activeCustomers.forEach(customer => {
        // Check if invoice already exists for this month
        const currentMonth = getCurrentMonth();
        const existingInvoice = dataStore.invoices.find(inv => 
            inv.customerId === customer.id && inv.date.startsWith(currentMonth) && inv.status === 'pending'
        );

        if (!existingInvoice) {
            const invoice = {
                id: generateInvoiceId(),
                customerId: customer.id,
                amount: customer.amount,
                date: getTodayDate(),
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            dataStore.invoices.push(invoice);
            generatedCount++;
        }
    });

    dataStore.saveInvoices();
    renderInvoices();
    alert(`${generatedCount} invoice(s) generated successfully!`);
}

function generateSingleInvoice(customerId, amount) {
    const invoice = {
        id: generateInvoiceId(),
        customerId: customerId,
        amount: parseFloat(amount),
        date: getTodayDate(),
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    dataStore.invoices.push(invoice);
    dataStore.saveInvoices();
    renderInvoices();
    document.getElementById('single-invoice-modal').classList.remove('active');
    alert('Invoice generated successfully!');
}

function createSingleInvoiceModal() {
    const modal = document.createElement('div');
    modal.id = 'single-invoice-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Generate Single Invoice</h3>
                <span class="close">&times;</span>
            </div>
            <form id="single-invoice-form">
                <div class="form-group">
                    <label>Customer *</label>
                    <select id="invoice-customer" required>
                        <option value="">Select Customer</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" id="invoice-amount" step="0.01">
                    <small style="color: var(--text-light);">Leave empty to use customer's monthly amount</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-single-invoice-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Generate Invoice</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-single-invoice-btn');
    const form = document.getElementById('single-invoice-form');

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const customerId = document.getElementById('invoice-customer').value;
        let amount = document.getElementById('invoice-amount').value;
        
        if (!amount) {
            const customer = dataStore.customers.find(c => c.id === customerId);
            amount = customer ? customer.amount : 0;
        }
        
        generateSingleInvoice(customerId, amount);
        form.reset();
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function populateInvoiceCustomerDropdown() {
    const select = document.getElementById('invoice-customer');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Customer</option>';
    dataStore.customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.id} - ${customer.name} (${formatCurrency(customer.amount)})`;
        select.appendChild(option);
    });
}

function renderInvoices() {
    const tbody = document.getElementById('invoices-table');
    if (!tbody) return;

    if (dataStore.invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-file-invoice"></i><p>No invoices found. Generate invoices for active customers!</p></td></tr>';
        return;
    }

    tbody.innerHTML = dataStore.invoices.map(invoice => {
        const customer = dataStore.customers.find(c => c.id === invoice.customerId);
        const customerName = customer ? customer.name : 'Unknown';
        const stbNumber = customer ? customer.stbNumber : '-';
        const statusClass = invoice.status === 'paid' ? 'status-active' : 'status-expired';
        
        return `
            <tr>
                <td>${invoice.id}</td>
                <td>${customerName}</td>
                <td>${stbNumber}</td>
                <td>${formatDate(invoice.date)}</td>
                <td>${formatCurrency(invoice.amount)}</td>
                <td><span class="status-badge ${statusClass}">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-success" onclick="markInvoicePaid('${invoice.id}')" ${invoice.status === 'paid' ? 'disabled' : ''}>
                            <i class="fas fa-check"></i> Mark Paid
                        </button>
                        <button class="btn btn-edit" onclick="viewInvoice('${invoice.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).reverse();
}

window.viewInvoice = (invoiceId) => {
    const invoice = dataStore.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    const customer = dataStore.customers.find(c => c.id === invoice.customerId);
    if (!customer) return;

    // Create invoice view
    const invoiceHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: 2rem; background: white; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 2rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 1rem;">
                <h2 style="color: var(--primary-color);">MS Digital World</h2>
                <p>Invoice</p>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2rem;">
                <div>
                    <h3>Bill To:</h3>
                    <p><strong>${customer.name}</strong></p>
                    <p>Customer ID: ${customer.id}</p>
                    <p>Phone: ${customer.phone}</p>
                    <p>STB Number: ${customer.stbNumber}</p>
                
                </div>
                <div style="text-align: right;">
                    <p><strong>Invoice #:</strong> ${invoice.id}</p>
                    <p><strong>Date:</strong> ${formatDate(invoice.date)}</p>
                    <p><strong>Status:</strong> ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</p>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
                <thead>
                    <tr style="background: var(--light-color);">
                        <th style="padding: 1rem; text-align: left; border-bottom: 2px solid var(--border-color);">Description</th>
                        <th style="padding: 1rem; text-align: right; border-bottom: 2px solid var(--border-color);">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 1rem; border-bottom: 1px solid var(--border-color);">Cable TV Subscription - ${formatDate(invoice.date)}</td>
                        <td style="padding: 1rem; text-align: right; border-bottom: 1px solid var(--border-color);">${formatCurrency(invoice.amount)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 1rem; font-weight: 700;">Total</td>
                        <td style="padding: 1rem; text-align: right; font-weight: 700; font-size: 1.2rem;">${formatCurrency(invoice.amount)}</td>
                    </tr>
                </tfoot>
            </table>
            <div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color); color: var(--text-light);">
                <p>Thank you for your business!</p>
            </div>
        </div>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Invoice ${invoice.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>${invoiceHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
};

window.markInvoicePaid = (invoiceId) => {
    const invoice = dataStore.invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        invoice.status = 'paid';
        dataStore.saveInvoices();
        renderInvoices();
    }
};

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const topNav = document.querySelector('.top-nav');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar?.classList.toggle('active');
            topNav?.classList.toggle('active');
            
            // Change icon
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                if (sidebar?.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar?.contains(e.target) && 
                    !mobileMenuToggle.contains(e.target) && 
                    !topNav?.contains(e.target)) {
                    sidebar?.classList.remove('active');
                    topNav?.classList.remove('active');
                    const icon = mobileMenuToggle.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            }
        });

        // Close menu when clicking a link
        const navLinks = document.querySelectorAll('.nav-link, .sidebar-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar?.classList.remove('active');
                    topNav?.classList.remove('active');
                    const icon = mobileMenuToggle.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
        });
    }
}

// Login System
function initLogin() {
    const loginForm = document.getElementById('login-form');
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const passwordToggle = document.getElementById('password-toggle');
    const passwordInput = document.getElementById('operator-password');
    const errorMessage = document.getElementById('login-error');

    // Password toggle
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const icon = passwordToggle.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const operatorId = document.getElementById('operator-id').value.trim();
            const password = document.getElementById('operator-password').value;

            if (!operatorId || !password) {
                showLoginError('Please enter both Operator ID and Password');
                return;
            }
            

            if (authSystem.login(operatorId, password)) {
                // Hide login page, show main app
                loginPage.style.display = 'none';
                mainApp.style.display = 'flex';
                // Initialize app
                initializeApp();
            } else {
                showLoginError('Invalid Operator ID or Password');
            }
        });
    }

}

// Logout functionality - separate from login init
function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('login-error');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                authSystem.logout();
                if (loginPage) loginPage.style.display = 'flex';
                if (mainApp) mainApp.style.display = 'none';
                // Clear form
                if (loginForm) {
                    loginForm.reset();
                }
                if (errorMessage) {
                    errorMessage.style.display = 'none';
                }
            }
        });
    }
}

function showLoginError(message) {
    const errorMessage = document.getElementById('login-error');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}

async function checkAuthentication() {
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');

    // Wait for database to be ready
    if (!dataStore) {
        await initDatabase();
    }

    if (authSystem.isAuthenticated()) {
        loginPage.style.display = 'none';
        mainApp.style.display = 'flex';
        initializeApp();
    } else {
        loginPage.style.display = 'flex';
        mainApp.style.display = 'none';
        initLogin();
    }
}

// SMS Management
function initSMSManagement() {
    const smsModal = document.getElementById('sms-modal');
    const smsForm = document.getElementById('sms-form');
    const cancelBtn = document.getElementById('cancel-sms-btn');
    const copyBtn = document.getElementById('copy-sms-btn');
    const closeBtn = smsModal?.querySelector('.close');
    const customerSelect = document.getElementById('sms-customer');
    const phoneInput = document.getElementById('sms-phone');
    const messageTextarea = document.getElementById('sms-message');

    cancelBtn?.addEventListener('click', () => {
        smsModal.classList.remove('active');
    });

    closeBtn?.addEventListener('click', () => {
        smsModal.classList.remove('active');
    });

    // Update message when customer or phone changes
    customerSelect?.addEventListener('change', updateSMSMessage);
    phoneInput?.addEventListener('input', updateSMSMessage);

    // Copy message button
    copyBtn?.addEventListener('click', () => {
        const message = messageTextarea.value;
        if (message) {
            navigator.clipboard.writeText(message).then(() => {
                alert('Message copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                messageTextarea.select();
                document.execCommand('copy');
                alert('Message copied to clipboard!');
            });
        }
    });

    // Send SMS form
    smsForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerId = customerSelect.value;
        const phone = phoneInput.value;
        const method = document.getElementById('sms-method').value;
        const message = messageTextarea.value;

        if (!customerId || !phone || !message) {
            alert('Please fill all required fields');
            return;
        }

        if (method === 'manual') {
            // Just copy to clipboard
            navigator.clipboard.writeText(message).then(() => {
                alert('Message copied to clipboard! You can now paste it in your messaging app.');
            });
            smsModal.classList.remove('active');
            return;
        } else if (method === 'whatsapp') {
            // Open WhatsApp with pre-filled message
            const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            smsModal.classList.remove('active');
            return;
        }

        // For API-based sending (requires backend configuration)
        try {
            await sendSMSViaAPI(phone, message, method);
            alert('SMS sent successfully!');
            smsModal.classList.remove('active');
            smsForm.reset();
        } catch (error) {
            alert('Failed to send SMS. Please use WhatsApp or Manual Copy option.');
            console.error('SMS Error:', error);
        }
    });
}

window.sendSMS = (customerId) => {
    const customer = dataStore.customers.find(c => c.id === customerId);
    if (!customer) return;

    const smsModal = document.getElementById('sms-modal');
    const customerSelect = document.getElementById('sms-customer');
    const phoneInput = document.getElementById('sms-phone');

    // Populate customer dropdown
    customerSelect.innerHTML = '<option value="">Select Customer</option>';
    dataStore.customers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = `${c.id} - ${c.name}`;
        if (c.id === customerId) {
            option.selected = true;
        }
        customerSelect.appendChild(option);
    });

    // Set phone number
    phoneInput.value = customer.phone;

    // Update message
    updateSMSMessage();

    smsModal.classList.add('active');
};

function updateSMSMessage() {
    const customerSelect = document.getElementById('sms-customer');
    const phoneInput = document.getElementById('sms-phone');
    const messageTextarea = document.getElementById('sms-message');

    if (!customerSelect || !messageTextarea) return;

    const customerId = customerSelect.value;
    if (!customerId) {
        messageTextarea.value = '';
        return;
    }

    const customer = dataStore.customers.find(c => c.id === customerId);
    if (!customer) return;

    // Calculate balance
    const balanceInfo = calculateCustomerBalance(customerId);
    const today = new Date().toLocaleDateString('en-GB');

    // Create message
    const message = `Dear ${customer.name},

Your Cable TV Account Summary:
Customer ID: ${customer.id}
Received Amount: ${formatCurrency(balanceInfo.paid)}
Balance Amount: ${formatCurrency(balanceInfo.balance)}
Renew Date: ${formatDate(customer.renewDate)}

Thank you for your business!
MS Digital Cable TV`;

    messageTextarea.value = message;
}

async function sendSMSViaAPI(phone, message, method) {
    // This function should be configured with your SMS/WhatsApp API
    // Example implementations:
    
    if (method === 'whatsapp') {
        // WhatsApp API integration (e.g., Twilio, WhatsApp Business API)
        // You need to configure your API endpoint and credentials
        const apiUrl = localStorage.getItem('whatsapp_api_url') || '';
        const apiKey = localStorage.getItem('whatsapp_api_key') || '';
        
        if (!apiUrl || !apiKey) {
            throw new Error('WhatsApp API not configured. Please configure in settings.');
        }

        // Example API call (adjust based on your provider)
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                to: phone,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send WhatsApp message');
        }
    } else if (method === 'sms') {
        // SMS Gateway integration (e.g., Twilio, TextLocal, etc.)
        const apiUrl = localStorage.getItem('sms_api_url') || '';
        const apiKey = localStorage.getItem('sms_api_key') || '';
        
        if (!apiUrl || !apiKey) {
            throw new Error('SMS API not configured. Please configure in settings.');
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                to: phone,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send SMS');
        }
    }
}

function updateCurrentDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = today.toLocaleDateString('en-US', options);
    }
}

function initializeApp() {
    initMobileMenu();
    initNavigation();
    initCustomerManagement();
    initPaymentManagement();
    initExpenseManagement();
    initInvoiceManagement();
    initPaymentFilters();
    initSMSManagement();
    initLogout();
    initSyncButton();
    // Ensure automatic server sync is checked/enabled
    checkServerAndEnableSync();
    updateCurrentDate();
    updateDashboard();
    updateOnlinePayments();
    showPage('dashboard');
}

// Initialize App
// Optional server sync: if localStorage.syncWithServer === 'true' the app
// will attempt to load customers/payments from the backend at /api
async function syncFromServer() {
    try {
        if (typeof localStorage === 'undefined') return;
        if (localStorage.getItem('syncWithServer') !== 'true') return;

        // Wait for database to initialize
        if (!dataStore) await initDatabase();

        const [custRes, payRes] = await Promise.all([
            fetch('/api/customers'),
            fetch('/api/payments')
        ]);

        if (!custRes.ok || !payRes.ok) {
            console.warn('Server sync: one or more endpoints not available');
            return;
        }

        const customers = await custRes.json();
        const payments = await payRes.json();

        // Replace local store with server data (simple merge strategy)
        dataStore.customers = Array.isArray(customers) ? customers : dataStore.customers || [];
        dataStore.payments = Array.isArray(payments) ? payments : dataStore.payments || [];

        // Persist locally as backup
        if (dataStore && dataStore.saveCustomers) dataStore.saveCustomers();
        if (dataStore && dataStore.savePayments) dataStore.savePayments();

        // Re-render UI where appropriate
        try { renderCustomers(); } catch (e) {}
        try { renderPayments(); } catch (e) {}
        try { updateDashboard(); } catch (e) {}

        console.log('Data synced from server');
    } catch (err) {
        console.warn('Server sync failed', err);
    }
}

// Check whether backend is reachable, enable sync and push local data automatically
async function checkServerAndEnableSync() {
    try {
        // Quick status check
        const res = await fetch('/api/status', { cache: 'no-store' });
        if (res.ok) {
            if (typeof localStorage !== 'undefined' && localStorage.getItem('syncWithServer') !== 'true') {
                localStorage.setItem('syncWithServer', 'true');
            }

            // Try to push any existing local data to server
            try {
                if (typeof pushLocalToServer === 'function') {
                    await pushLocalToServer();
                    console.log('Local data pushed to server.');
                }
            } catch (err) {
                console.warn('pushLocalToServer failed:', err);
            }

            // Fetch fresh data from server to replace local store
            try {
                await syncFromServer();
            } catch (err) {
                console.warn('syncFromServer after push failed:', err);
            }
        } else {
            console.warn('Server status endpoint returned non-OK');
        }
    } catch (err) {
        // Server unreachable — will retry later
        console.log('Server not reachable for auto-sync:', err);
    }
}

// When browser goes online, try enabling sync
window.addEventListener('online', () => {
    checkServerAndEnableSync().catch(() => {});
});

// Periodically try to detect server if sync not enabled
setInterval(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('syncWithServer') !== 'true') {
        checkServerAndEnableSync().catch(() => {});
    }
}, 30000);

// Re-introduce the Sync button UI handler so users can manually push local data
function initSyncButton() {
    const btn = document.getElementById('sync-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (!confirm('This will push your local customers and payments to the server. Continue?')) return;
        btn.disabled = true;
        const originalHTML = btn.innerHTML;
        try {
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span class="logout-text">Syncing...</span>';
            if (typeof pushLocalToServer === 'function') {
                const result = await pushLocalToServer((progress) => {
                    // Optional: we could use `progress` to update UI later
                    console.log('sync progress', progress);
                });
                console.log('pushLocalToServer result', result);
                alert('Sync complete. Server now has your data.');
            } else {
                alert('Sync function not available.');
            }
        } catch (err) {
            console.error('Sync failed', err);
            alert('Sync failed. See console for details.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML || '<i class="fas fa-cloud-upload-alt"></i><span class="logout-text">Sync</span>';
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Try to detect server and enable automatic sync if available
    await checkServerAndEnableSync();
    // If server sync enabled, pull latest data from server
    await syncFromServer();
    checkAuthentication();
});

// --- Sync functionality: push local customers/payments to server ---
async function pushLocalToServer(progressCb) {
    // Ensure we have a dataStore
    if (!dataStore) await initDatabase();

    const server = '/api';

    // Fetch existing server customers to avoid duplicates
    const serverCustomersRes = await fetch(server + '/customers');
    if (!serverCustomersRes.ok) throw new Error('Failed to fetch server customers');
    const serverCustomers = await serverCustomersRes.json();

    // Build index by name|phone for simple duplicate detection
    const serverIndex = {};
    for (const sc of serverCustomers) {
        const key = `${(sc.name||'').toLowerCase()}|${(sc.phone||'').toLowerCase()}`;
        serverIndex[key] = sc.id || sc._id || sc.id;
    }

    // Local customers
    const localCustomers = dataStore.customers || JSON.parse(localStorage.getItem('customers') || '[]');
    const idMap = {}; // localId -> serverId

    let i = 0;
    for (const lc of localCustomers) {
        i++;
        const key = `${(lc.name||'').toLowerCase()}|${(lc.phone||'').toLowerCase()}`;
        if (serverIndex[key]) {
            idMap[lc.id] = serverIndex[key];
            if (progressCb) progressCb({ phase: 'customer-skip', index: i, total: localCustomers.length });
            continue; // already exists on server
        }

        // Create on server
        const payload = {
            name: lc.name,
            phone: lc.phone,
            stbNumber: lc.stbNumber,
            amount: lc.amount,
            renewDate: lc.renewDate,
            status: lc.status
        };
        try {
            const res = await fetch(server + '/customers', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (res.ok) {
                const json = await res.json();
                const serverId = json.customer?.id || json.customer?._id || null;
                if (serverId) {
                    idMap[lc.id] = serverId;
                }
            }
        } catch (err) {
            console.warn('Failed to push customer', lc, err);
        }
        if (progressCb) progressCb({ phase: 'customer-push', index: i, total: localCustomers.length });
    }

    // Save mapping locally for future reference
    localStorage.setItem('serverIdMap', JSON.stringify(idMap));

    // Now push payments, mapping customer ids where possible
    const localPayments = dataStore.payments || JSON.parse(localStorage.getItem('payments') || '[]');
    let j = 0;
    for (const lp of localPayments) {
        j++;
        const mappedCustomerId = idMap[lp.customerId] || lp.customerId;
        const payload = {
            customerId: mappedCustomerId,
            amount: lp.amount,
            method: lp.method,
            date: lp.date,
            transactionId: lp.transactionId || null
        };
        try {
            await fetch(server + '/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } catch (err) {
            console.warn('Failed to push payment', lp, err);
        }
        if (progressCb) progressCb({ phase: 'payment-push', index: j, total: localPayments.length });
    }

    return { customersPushed: Object.keys(idMap).length, paymentsPushed: localPayments.length };
}
