// ==========================================
// 1. ESTADO GLOBAL Y CONFIGURACIÓN BASE
// ==========================================
let appData = {
    initialBudget: 0,
    remainingBudget: 0,
    expenses: [],
    recurringPayments: [] // [{id, employee, concept, frequency, amount, lastTriggered}]
};

let myChartInstance = null;

// Tiempos en milisegundos para el motor automático
const FREQUENCIES = {
    diario: 24 * 60 * 60 * 1000,        // 1 día real
    semanal: 7 * 24 * 60 * 60 * 1000,   // 7 días
    quincenal: 15 * 24 * 60 * 60 * 1000,// 15 días
    mensual: 30 * 24 * 60 * 60 * 1000   // 30 días
};

// Inicialización de la aplicación
window.onload = function() {
    const savedData = localStorage.getItem('budgetAppV3Data');
    if (savedData) {
        appData = JSON.parse(savedData);
        if (!appData.recurringPayments) appData.recurringPayments = [];
    }
    
    resetFormValues();
    updateUI();

    // Arrancar el motor en segundo plano (Revisa cobros automáticos cada 10 segundos)
    checkRecurringPayments();
    setInterval(checkRecurringPayments, 10000);
};

function saveToLocalStorage() {
    localStorage.setItem('budgetAppV3Data', JSON.stringify(appData));
}

function setBudget() {
    const budgetInput = document.getElementById('initial-budget');
    const amount = parseFloat(budgetInput.value);

    if (isNaN(amount) || amount <= 0) {
        alert('Por favor, ingresa un monto válido mayor a 0.');
        return;
    }

    appData.initialBudget = amount;
    recalculateBudget();
    budgetInput.value = '';
    
    saveToLocalStorage();
    updateUI();
}

function recalculateBudget() {
    const totalSpent = appData.expenses.reduce((sum, item) => sum + item.amount, 0);
    appData.remainingBudget = appData.initialBudget - totalSpent;
}

// ==========================================
// 2. PROCESAMIENTO DE GASTOS MANUALES
// ==========================================
function handleSubmitExpense(event) {
    event.preventDefault();

    if (appData.initialBudget === 0) {
        alert('Primero debes definir un presupuesto inicial.');
        return;
    }

    const nameInput = document.getElementById('employee-name');
    const conceptInput = document.getElementById('payment-concept');
    const dateInput = document.getElementById('payment-date');
    const amountInput = document.getElementById('payment-amount');
    const editingId = document.getElementById('editing-id').value;

    const amount = parseFloat(amountInput.value);
    
    let simulatedRemaining = appData.remainingBudget;
    if (editingId) {
        const previousExpense = appData.expenses.find(e => e.id == editingId);
        if (previousExpense) simulatedRemaining += previousExpense.amount;
    }

    if (amount > simulatedRemaining) {
        if (!confirm(`¡Atención! El pago ($${amount.toFixed(2)}) supera los fondos libres ($${simulatedRemaining.toFixed(2)}). ¿Proceder?`)) {
            return;
        }
    }

    if (editingId) {
        appData.expenses = appData.expenses.map(expense => {
            if (expense.id == editingId) {
                return { ...expense, employee: nameInput.value.trim(), concept: conceptInput.value, date: dateInput.value, amount: amount };
            }
            return expense;
        });
    } else {
        const newExpense = {
            id: Date.now(),
            employee: nameInput.value.trim(),
            concept: conceptInput.value,
            date: dateInput.value,
            amount: amount
        };
        appData.expenses.push(newExpense);
    }

    recalculateBudget();
    resetFormValues();
    cancelEdit(); 
    saveToLocalStorage();
    updateUI();
}
// ==========================================
// 3. EDICIÓN, ELIMINACIÓN Y LIMPIEZA DE FORMULARIOS
// ==========================================
function editExpense(id) {
    const expense = appData.expenses.find(e => e.id == id);
    if (!expense) return;

    document.getElementById('form-title').innerText = "📝 Editar Pago";
    document.getElementById('employee-name').value = expense.employee;
    document.getElementById('payment-concept').value = expense.concept || "Sueldo";
    document.getElementById('payment-date').value = expense.date;
    document.getElementById('payment-amount').value = expense.amount;
    document.getElementById('editing-id').value = expense.id;

    document.getElementById('btn-submit').innerText = "Guardar Cambios";
    document.getElementById('btn-cancel-edit').style.display = "block";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('form-title').innerText = "2. Registrar Pago a Empleado";
    document.getElementById('editing-id').value = "";
    document.getElementById('btn-submit').innerText = "Confirmar Pago";
    document.getElementById('btn-cancel-edit').style.display = "none";
    resetFormValues();
}

function deleteExpense(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este registro de pago?')) {
        appData.expenses = appData.expenses.filter(e => e.id != id);
        recalculateBudget();
        saveToLocalStorage();
        updateUI();
        
        if (document.getElementById('editing-id').value == id) {
            cancelEdit();
        }
    }
}

function resetFormValues() {
    document.getElementById('employee-name').value = '';
    document.getElementById('payment-concept').value = 'Sueldo';
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-date').value = new Date().toISOString().split('T');
}

// ==========================================
// 4. MOTOR DE PAGOS RECURRENTES AUTOMÁTICOS
// ==========================================
function handleRegisterRecurring(event) {
    event.preventDefault();
    
    const empInput = document.getElementById('rec-employee');
    const conceptInput = document.getElementById('rec-concept');
    const freqInput = document.getElementById('rec-frequency');
    const amountInput = document.getElementById('rec-amount');

    const amount = parseFloat(amountInput.value);

    const newRecurring = {
        id: Date.now(),
        employee: empInput.value.trim(),
        concept: conceptInput.value,
        frequency: freqInput.value,
        amount: amount,
        lastTriggered: Date.now()
    };

    appData.recurringPayments.push(newRecurring);
    
    empInput.value = '';
    amountInput.value = '1200.00';
    
    saveToLocalStorage();
    updateUI();
    alert(`Automatización guardada con éxito para ${newRecurring.employee}.`);
}

function deleteRecurring(id) {
    if(confirm('¿Desactivar y eliminar este cobro automatizado recurrente?')) {
        appData.recurringPayments = appData.recurringPayments.filter(r => r.id !== id);
        saveToLocalStorage();
        updateUI();
    }
}

function checkRecurringPayments() {
    if (appData.initialBudget === 0) return;

    const now = Date.now();
    let changesMade = false;

    appData.recurringPayments.forEach(rec => {
        const msInterval = FREQUENCIES[rec.frequency];
        const timePassed = now - rec.lastTriggered;

        if (timePassed >= msInterval) {
            const cycles = Math.floor(timePassed / msInterval);
            
            for(let i=0; i < cycles; i++) {
                const autoExpense = {
                    id: Date.now() + Math.random(),
                    employee: `${rec.employee} (Auto)`,
                    concept: rec.concept,
                    date: new Date().toISOString().split('T'),
                    amount: rec.amount
                };
                appData.expenses.push(autoExpense);
            }

            rec.lastTriggered = now; 
            changesMade = true;
        }
    });

    if (changesMade) {
        recalculateBudget();
        saveToLocalStorage();
        updateUI();
    }
}
// ==========================================
// 5. CONTROLADOR DE INTERFAZ GRÁFICA (UI)
// ==========================================
function updateUI() {
    const remainingDisplay = document.getElementById('remaining-display');
    const statusMessage = document.getElementById('status-message');
    const statusPanel = document.getElementById('status-panel');
    const initialDisplay = document.getElementById('summary-initial');
    const spentDisplay = document.getElementById('summary-spent');

    const totalSpent = appData.initialBudget - appData.remainingBudget;
    
    remainingDisplay.innerText = `$${appData.remainingBudget.toFixed(2)}`;
    initialDisplay.innerText = `$${appData.initialBudget.toFixed(2)}`;
    spentDisplay.innerText = `$${totalSpent.toFixed(2)}`;

    statusPanel.className = "status-box";

    if (appData.initialBudget === 0) {
        statusPanel.classList.add('status-normal');
        statusMessage.innerText = "Por favor, ingresa un presupuesto inicial.";
        renderTable([]);
        renderRecurringList();
        drawChart();
        return;
    }

    const threshold = appData.initialBudget * 0.20;

    if (appData.remainingBudget <= 0) {
        statusPanel.classList.add('status-danger');
        statusMessage.innerText = "¡Presupuesto Agotado o en saldo negativo!";
    } else if (appData.remainingBudget <= threshold) {
        statusPanel.classList.add('status-warning');
        statusMessage.innerText = "¡Atención! Te queda menos del 20% del presupuesto total.";
    } else {
        statusPanel.classList.add('status-normal');
        statusMessage.innerText = "Fondos estables y bajo control.";
    }

    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    const filteredExpenses = appData.expenses.filter(item => {
        const nameMatch = item.employee.toLowerCase().includes(searchQuery);
        const conceptMatch = (item.concept || "Sueldo").toLowerCase().includes(searchQuery);
        return nameMatch || conceptMatch;
    });

    renderTable(filteredExpenses);
    renderRecurringList();
    drawChart();
}

function renderTable(expensesToRender) {
    const tbody = document.getElementById('history-tbody');
    const emptyMsg = document.getElementById('empty-msg');
    
    tbody.innerHTML = '';

    if (appData.expenses.length === 0) {
        emptyMsg.style.display = 'block';
        emptyMsg.innerText = "No se han registrado pagos todavía.";
        return;
    }

    if (expensesToRender.length === 0) {
        emptyMsg.style.display = 'block';
        emptyMsg.innerText = "No se encontraron resultados coincidentes.";
        return;
    }

    emptyMsg.style.display = 'none';

    [...expensesToRender].reverse().forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.employee}</strong></td>
            <td><span class="badge">${item.concept || 'Sueldo'}</span></td>
            <td>${formatDate(item.date)}</td>
            <td style="color: var(--danger); font-weight: 600;">-$${item.amount.toFixed(2)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-action-edit" onclick="editExpense(${item.id})">Editar</button>
                    <button class="btn-action-delete" onclick="deleteExpense(${item.id})">Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderRecurringList() {
    const listContainer = document.getElementById('recurring-list');
    listContainer.innerHTML = '';

    if (appData.recurringPayments.length === 0) {
        listContainer.innerHTML = '<li class="empty-state" style="font-size:0.85rem; padding:5px;">No hay suscripciones automáticas.</li>';
        return;
    }

    appData.recurringPayments.forEach(rec => {
        const li = document.createElement('li');
        li.className = 'recurring-item';
        li.innerHTML = `
            <span><strong>${rec.employee}</strong> - $${rec.amount.toFixed(2)} (${rec.frequency})</span>
            <button class="btn-del-rec" onclick="deleteRecurring(${rec.id})">Quitar</button>
        `;
        listContainer.appendChild(li);
    });
}

// ==========================================
// 6. CONTROL Y DIBUJO DEL GRÁFICO (CHART.JS)
// ==========================================
function drawChart() {
    const chartWrapper = document.getElementById('chart-wrapper');
    const chartEmptyMsg = document.getElementById('chart-empty-msg');

    if (appData.expenses.length === 0) {
        chartWrapper.style.display = 'none';
        chartEmptyMsg.style.display = 'block';
        if(myChartInstance) myChartInstance.destroy();
        return;
    }

    chartWrapper.style.display = 'block';
    chartEmptyMsg.style.display = 'none';

    const summaryData = { 'Sueldo': 0, 'Bono': 0, 'Horas Extra': 0, 'Aguinaldo': 0, 'Liquidación': 0, 'Otro': 0 };

    appData.expenses.forEach(e => {
        const concept = e.concept || 'Sueldo';
        if (summaryData[concept] !== undefined) summaryData[concept] += e.amount;
        else summaryData['Otro'] += e.amount;
    });

    const labels = Object.keys(summaryData);
    const dataValues = Object.values(summaryData);

    if(dataValues.reduce((a,b)=>a+b, 0) === 0) {
        chartWrapper.style.display = 'none';
        chartEmptyMsg.style.display = 'block';
        return;
    }

    const ctx = document.getElementById('concepts-chart').getContext('2d');
    if (myChartInstance) myChartInstance.destroy();

    myChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } } }
        }
    });
}

// ==========================================
// 7. EXPORTACIÓN Y REINICIO
// ==========================================
function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return `${parts}/${parts}/${parts}`;
}

function exportToExcel() {
    if (appData.expenses.length === 0) {
        alert('No hay datos registrados en el historial para exportar.');
        return;
    }

    let csvContent = "Empleado,Concepto,Fecha de Pago,Monto Pagado (\$)\n";
    appData.expenses.forEach(item => {
        const cleanName = item.employee.replace(/"/g, '""');
        csvContent += `"${cleanName}","${item.concept || "Sueldo"}",${formatDate(item.date)},${item.amount.toFixed(2)}\n`;
    });

    const totalSpent = appData.initialBudget - appData.remainingBudget;
    csvContent += `\nPresupuesto Inicial,,,${appData.initialBudget.toFixed(2)}\n`;
    csvContent += `Total Gastado,,,${totalSpent.toFixed(2)}\n`;
    csvContent += `Presupuesto Restante,,,${appData.remainingBudget.toFixed(2)}\n`;

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_nomina_${new Date().toISOString().split('T')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function resetApp() {
    if (confirm('¿Estás seguro de que deseas borrar todo el presupuesto, las recurrencias y el historial?')) {
        localStorage.removeItem('budgetAppV3Data');
        appData = { initialBudget: 0, remainingBudget: 0, expenses: [], recurringPayments: [] };
        document.getElementById('search-input').value = '';
        cancelEdit();
        updateUI();
    }
}