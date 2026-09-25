/* =========================================================
   CONTROL DE PRESUPUESTO Y NÓMINA
========================================================= */

const STORAGE_KEY = "control_nomina_presupuesto_v2";
const CHECK_INTERVAL = 10000;

let state = {
    initialBudget: 0,
    payments: [],
    recurringPayments: []
};

let expensesChart = null;


/* =========================================================
   INICIALIZACIÓN
========================================================= */

document.addEventListener("DOMContentLoaded", init);

function init() {

    // Cargar información guardada
    loadState();

    // Obtener elementos del HTML
    setupElements();

    // Colocar fecha actual
    setTodayIfEmpty();

    // Registrar eventos
    setupEvents();

    // Dibujar aplicación
    renderEverything();

    // Procesar pagos automáticos vencidos
    processRecurringPayments();

    // Revisar cada 10 segundos
    setInterval(
        processRecurringPayments,
        CHECK_INTERVAL
    );
}


/* =========================================================
   ELEMENTOS
========================================================= */

let budgetForm;
let initialBudgetInput;

let paymentForm;
let editingPaymentId;
let employeeName;
let paymentConcept;
let paymentDate;
let paymentAmount;
let paymentSubmit;
let cancelEdit;

let recurringForm;
let recurringName;
let recurringConcept;
let recurringFrequency;
let recurringAmount;

let recurringList;

let paymentsTableBody;
let emptyHistory;

let searchPayments;

let budgetIndicator;
let remainingBudget;
let budgetPercentage;

let totalBudget;
let totalSpent;
let paymentCount;

let chartCanvas;
let chartEmpty;

let exportExcel;
let resetAll;


function setupElements() {

    budgetForm =
        document.getElementById("budgetForm");

    initialBudgetInput =
        document.getElementById("initialBudget");


    paymentForm =
        document.getElementById("paymentForm");

    editingPaymentId =
        document.getElementById("editingPaymentId");

    employeeName =
        document.getElementById("employeeName");

    paymentConcept =
        document.getElementById("paymentConcept");

    paymentDate =
        document.getElementById("paymentDate");

    paymentAmount =
        document.getElementById("paymentAmount");

    paymentSubmit =
        document.getElementById("paymentSubmit");

    cancelEdit =
        document.getElementById("cancelEdit");


    recurringForm =
        document.getElementById("recurringForm");

    recurringName =
        document.getElementById("recurringName");

    recurringConcept =
        document.getElementById("recurringConcept");

    recurringFrequency =
        document.getElementById("recurringFrequency");

    recurringAmount =
        document.getElementById("recurringAmount");


    recurringList =
        document.getElementById("recurringList");


    paymentsTableBody =
        document.getElementById("paymentsTableBody");

    emptyHistory =
        document.getElementById("emptyHistory");


    searchPayments =
        document.getElementById("searchPayments");


    budgetIndicator =
        document.getElementById("budgetIndicator");

    remainingBudget =
        document.getElementById("remainingBudget");

    budgetPercentage =
        document.getElementById("budgetPercentage");


    totalBudget =
        document.getElementById("totalBudget");

    totalSpent =
        document.getElementById("totalSpent");

    paymentCount =
        document.getElementById("paymentCount");


    chartCanvas =
        document.getElementById("expensesChart");

    chartEmpty =
        document.getElementById("chartEmpty");


    exportExcel =
        document.getElementById("exportExcel");

    resetAll =
        document.getElementById("resetAll");


    /*
     * Verificación de seguridad.
     * Si falta algún elemento del HTML, lo muestra
     * en consola en lugar de romper silenciosamente.
     */
    if (!budgetForm || !initialBudgetInput) {

        console.error(
            "ERROR: No se encontraron los elementos del formulario de presupuesto."
        );

        return;
    }
}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

    /* -----------------------------
       PRESUPUESTO
    ----------------------------- */

    if (budgetForm) {

        budgetForm.addEventListener(
            "submit",
            saveBudget
        );
    }


    /* -----------------------------
       PAGOS
    ----------------------------- */

    if (paymentForm) {

        paymentForm.addEventListener(
            "submit",
            savePayment
        );
    }


    if (cancelEdit) {

        cancelEdit.addEventListener(
            "click",
            cancelPaymentEdit
        );
    }


    /* -----------------------------
       BUSCADOR
    ----------------------------- */

    if (searchPayments) {

        searchPayments.addEventListener(
            "input",
            renderPayments
        );
    }


    /* -----------------------------
       EXPORTAR
    ----------------------------- */

    if (exportExcel) {

        exportExcel.addEventListener(
            "click",
            exportToExcel
        );
    }


    /* -----------------------------
       REINICIAR
    ----------------------------- */

    if (resetAll) {

        resetAll.addEventListener(
            "click",
            resetApplication
        );
    }


    /* -----------------------------
       RECURRENTES
    ----------------------------- */

    if (recurringForm) {

        recurringForm.addEventListener(
            "submit",
            saveRecurringPayment
        );
    }
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function loadState() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!saved) {
            return;
        }

        const parsed =
            JSON.parse(saved);


        state.initialBudget =
            Number(parsed.initialBudget) || 0;


        state.payments =
            Array.isArray(parsed.payments)
                ? parsed.payments
                : [];


        state.recurringPayments =
            Array.isArray(parsed.recurringPayments)
                ? parsed.recurringPayments
                : [];


    } catch (error) {

        console.error(
            "No se pudo cargar LocalStorage:",
            error
        );

        state = {
            initialBudget: 0,
            payments: [],
            recurringPayments: []
        };
    }
}


function saveState() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

        return true;

    } catch (error) {

        console.error(
            "No se pudo guardar en LocalStorage:",
            error
        );

        alert(
            "No fue posible guardar los datos en este navegador."
        );

        return false;
    }
}


/* =========================================================
   PRESUPUESTO
========================================================= */

function saveBudget(event) {

    event.preventDefault();

    event.stopPropagation();


    const value =
        Number(
            initialBudgetInput.value
        );


    /*
     * Validación.
     */
    if (
        initialBudgetInput.value.trim() === "" ||
        !Number.isFinite(value) ||
        value < 0
    ) {

        alert(
            "Ingresa un presupuesto válido."
        );

        initialBudgetInput.focus();

        return;
    }


    /*
     * Guardar.
     */
    state.initialBudget = value;


    /*
     * Confirmar que LocalStorage realmente
     * recibió el dato.
     */
    const saved = saveState();


    if (!saved) {
        return;
    }


    /*
     * Actualizar inmediatamente
     * toda la interfaz.
     */
    renderIndicators();


    /*
     * Mostrar el valor guardado
     * nuevamente en el campo.
     */
    initialBudgetInput.value =
        value;


    alert(
        "Presupuesto guardado correctamente."
    );
}


/* =========================================================
   UTILIDADES
========================================================= */

function generateId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );
}


function money(value) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    ).format(
        Number(value) || 0
    );
}


function getTotalSpent() {

    return state.payments.reduce(
        (total, payment) => {

            return (
                total +
                Number(payment.amount || 0)
            );

        },
        0
    );
}


function getRemainingBudget() {

    return (
        Number(state.initialBudget || 0) -
        getTotalSpent()
    );
}


function getTodayISO() {

    const date = new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function setTodayIfEmpty() {

    if (
        paymentDate &&
        !paymentDate.value
    ) {

        paymentDate.value =
            getTodayISO();
    }
}


function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.toLocaleDateString(
        "es-MX",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   RENDER PRINCIPAL
========================================================= */

function renderEverything() {

    if (initialBudgetInput) {

        initialBudgetInput.value =
            state.initialBudget > 0
                ? state.initialBudget
                : "";
    }

    renderIndicators();
    renderPayments();
    renderRecurringPayments();
    renderChart();
}


/* =========================================================
   INDICADORES
========================================================= */

function renderIndicators() {

    const budget =
        Number(
            state.initialBudget || 0
        );

    const spent =
        getTotalSpent();

    const remaining =
        budget - spent;


    totalBudget.textContent =
        money(budget);

    totalSpent.textContent =
        money(spent);

    paymentCount.textContent =
        state.payments.length;

    remainingBudget.textContent =
        money(remaining);


    /*
     * Si todavía no hay presupuesto.
     */
    if (budget <= 0) {

        budgetPercentage.textContent =
            "Sin presupuesto configurado";

        budgetIndicator.classList.remove(
            "normal",
            "warning",
            "danger"
        );

        budgetIndicator.classList.add(
            "normal"
        );

        return;
    }


    const percentage =
        (remaining / budget) * 100;


    budgetPercentage.textContent =
        `${Math.max(
            percentage,
            0
        ).toFixed(1)}% disponible`;


    budgetIndicator.classList.remove(
        "normal",
        "warning",
        "danger"
    );


    if (remaining <= 0) {

        budgetIndicator.classList.add(
            "danger"
        );

    } else if (percentage < 20) {

        budgetIndicator.classList.add(
            "warning"
        );

    } else {

        budgetIndicator.classList.add(
            "normal"
        );
    }
}


/* =========================================================
   PAGOS
========================================================= */

function savePayment(event) {

    event.preventDefault();

    const name =
        employeeName.value.trim();

    const concept =
        paymentConcept.value;

    const date =
        paymentDate.value;

    const amount =
        Number(
            paymentAmount.value
        );

    const editingId =
        editingPaymentId.value;


    if (
        !name ||
        !concept ||
        !date ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Completa correctamente todos los campos."
        );

        return;
    }


    /* EDITAR */

    if (editingId) {

        const payment =
            state.payments.find(
                item =>
                    item.id === editingId
            );

        if (!payment) {
            return;
        }


        const difference =
            amount -
            Number(payment.amount);


        if (difference > 0) {

            const available =
                getRemainingBudget();


            if (difference > available) {

                const proceed =
                    confirm(
                        "Este cambio supera el presupuesto disponible.\n\n" +
                        "¿Deseas continuar?"
                    );


                if (!proceed) {
                    return;
                }
            }
        }


        payment.name =
            name;

        payment.concept =
            concept;

        payment.date =
            date;

        payment.amount =
            amount;


        saveState();

        cancelPaymentEdit();

        renderEverything();

        return;
    }


    /* NUEVO PAGO */

    const available =
        getRemainingBudget();


    if (amount > available) {

        const proceed =
            confirm(
                "⚠️ Este pago supera el presupuesto disponible.\n\n" +
                "Disponible: " +
                money(available) +
                "\nPago: " +
                money(amount) +
                "\n\n¿Deseas registrarlo?"
            );


        if (!proceed) {
            return;
        }
    }


    state.payments.push({

        id:
            generateId(),

        name:
            name,

        concept:
            concept,

        date:
            date,

        amount:
            amount,

        source:
            "manual",

        createdAt:
            Date.now()
    });


    saveState();

    paymentForm.reset();

    editingPaymentId.value = "";

    paymentSubmit.textContent =
        "Registrar Pago";

    cancelEdit.classList.add(
        "hidden"
    );

    setTodayIfEmpty();

    renderEverything();
}


/* =========================================================
   EDITAR / ELIMINAR
========================================================= */

function editPayment(id) {

    const payment =
        state.payments.find(
            item => item.id === id
        );

    if (!payment) {
        return;
    }


    employeeName.value =
        payment.name;

    paymentConcept.value =
        payment.concept;

    paymentDate.value =
        payment.date;

    paymentAmount.value =
        payment.amount;

    editingPaymentId.value =
        payment.id;

    paymentSubmit.textContent =
        "Guardar Cambios";

    cancelEdit.classList.remove(
        "hidden"
    );


    paymentForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


function cancelPaymentEdit() {

    paymentForm.reset();

    editingPaymentId.value =
        "";

    paymentSubmit.textContent =
        "Registrar Pago";

    cancelEdit.classList.add(
        "hidden"
    );

    setTodayIfEmpty();
}


function deletePayment(id) {

    const payment =
        state.payments.find(
            item => item.id === id
        );

    if (!payment) {
        return;
    }


    if (
        !confirm(
            `¿Eliminar el pago de "${payment.name}"?`
        )
    ) {
        return;
    }


    state.payments =
        state.payments.filter(
            item =>
                item.id !== id
        );


    saveState();

    renderEverything();
}


/* =========================================================
   PAGOS RECURRENTES
========================================================= */

function saveRecurringPayment(event) {

    event.preventDefault();


    const name =
        recurringName.value.trim();

    const concept =
        recurringConcept.value;

    const frequency =
        recurringFrequency.value;

    const amount =
        Number(
            recurringAmount.value
        );


    if (
        !name ||
        !concept ||
        !frequency ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Completa correctamente todos los campos."
        );

        return;
    }


    state.recurringPayments.push({

        id:
            generateId(),

        name:
            name,

        concept:
            concept,

        frequency:
            frequency,

        amount:
            amount,

        active:
            true,

        nextRunAt:
            calculateNextRun(
                Date.now(),
                frequency
            ),

        createdAt:
            Date.now()
    });


    saveState();

    recurringForm.reset();

    renderRecurringPayments();


    alert(
        "Pago recurrente programado correctamente."
    );
}


function calculateNextRun(
    timestamp,
    frequency
) {

    const date =
        new Date(timestamp);


    switch (frequency) {

        case "daily":

            date.setDate(
                date.getDate() + 1
            );

            break;


        case "weekly":

            date.setDate(
                date.getDate() + 7
            );

            break;


        case "biweekly":

            date.setDate(
                date.getDate() + 14
            );

            break;


        case "monthly":

            date.setMonth(
                date.getMonth() + 1
            );

            break;
    }


    return date.getTime();
}


function processRecurringPayments() {

    const now =
        Date.now();

    let changed =
        false;


    state.recurringPayments.forEach(
        recurring => {

            if (!recurring.active) {
                return;
            }


            let safety =
                0;


            while (
                recurring.nextRunAt <= now &&
                safety < 100
            ) {

                const executionDate =
                    new Date(
                        recurring.nextRunAt
                    );


                state.payments.push({

                    id:
                        generateId(),

                    name:
                        recurring.name,

                    concept:
                        recurring.concept,

                    date:
                        executionDate
                            .toISOString()
                            .split("T")[0],

                    amount:
                        Number(
                            recurring.amount
                        ),

                    source:
                        "automatic",

                    recurringId:
                        recurring.id,

                    createdAt:
                        Date.now()
                });


                recurring.nextRunAt =
                    calculateNextRun(
                        recurring.nextRunAt,
                        recurring.frequency
                    );


                changed =
                    true;

                safety++;
            }
        }
    );


    if (changed) {

        saveState();

        renderEverything();
    }
}


function deleteRecurring(id) {

    if (
        !confirm(
            "¿Cancelar esta automatización?"
        )
    ) {
        return;
    }


    state.recurringPayments =
        state.recurringPayments.filter(
            item =>
                item.id !== id
        );


    saveState();

    renderRecurringPayments();
}


function frequencyText(frequency) {

    const names = {

        daily:
            "Diario",

        weekly:
            "Semanal",

        biweekly:
            "Quincenal",

        monthly:
            "Mensual"
    };


    return (
        names[frequency] ||
        frequency
    );
}


/* =========================================================
   HISTORIAL
========================================================= */

function renderPayments() {

    const query =
        searchPayments
            ? searchPayments.value
                .trim()
                .toLowerCase()
            : "";


    const filtered =
        state.payments.filter(
            payment => {

                return (
                    String(
                        payment.name
                    )
                    .toLowerCase()
                    .includes(query)
                    ||
                    String(
                        payment.concept
                    )
                    .toLowerCase()
                    .includes(query)
                );
            }
        );


    paymentsTableBody.innerHTML =
        "";


    if (filtered.length === 0) {

        emptyHistory.style.display =
            "block";

        return;
    }


    emptyHistory.style.display =
        "none";


    filtered
        .slice()
        .sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        )
        .forEach(
            payment => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                const automatic =
                    payment.source ===
                    "automatic";


                tr.innerHTML = `

                    <td>
                        ${escapeHTML(
                            payment.name
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            payment.concept
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            payment.date
                        )}
                    </td>

                    <td class="amount-cell">
                        ${money(
                            payment.amount
                        )}
                    </td>

                    <td>
                        <span class="
                            origin-badge
                            ${
                                automatic
                                    ? "origin-auto"
                                    : "origin-manual"
                            }
                        ">
                            ${
                                automatic
                                    ? "Automático"
                                    : "Manual"
                            }
                        </span>
                    </td>

                    <td>

                        <div class="action-buttons">

                            <button
                                class="btn btn-small btn-secondary"
                                onclick="editPayment('${payment.id}')"
                            >
                                Editar
                            </button>

                            <button
                                class="btn btn-small btn-danger"
                                onclick="deletePayment('${payment.id}')"
                            >
                                Eliminar
                            </button>

                        </div>

                    </td>
                `;


                paymentsTableBody.appendChild(
                    tr
                );
            }
        );
}


/* =========================================================
   RECURRENTES
========================================================= */

function renderRecurringPayments() {

    recurringList.innerHTML =
        "";


    if (
        state.recurringPayments.length ===
        0
    ) {

        recurringList.innerHTML = `
            <div class="empty-message">
                No hay pagos automáticos programados.
            </div>
        `;

        return;
    }


    state.recurringPayments.forEach(
        recurring => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "recurring-item";


            const next =
                new Date(
                    recurring.nextRunAt
                );


            div.innerHTML = `

                <div class="recurring-info">

                    <div class="recurring-name">
                        ${escapeHTML(
                            recurring.name
                        )}
                    </div>

                    <div class="recurring-details">
                        ${escapeHTML(
                            recurring.concept
                        )}
                        ·
                        ${frequencyText(
                            recurring.frequency
                        )}
                        · Próximo:
                        ${next.toLocaleString(
                            "es-MX"
                        )}
                    </div>

                </div>

                <div class="recurring-amount">
                    ${money(
                        recurring.amount
                    )}
                </div>

                <button
                    class="btn btn-small btn-danger"
                    onclick="deleteRecurring('${recurring.id}')"
                >
                    Cancelar
                </button>
            `;


            recurringList.appendChild(
                div
            );
        }
    );
}


/* =========================================================
   GRÁFICO
========================================================= */

function renderChart() {

    if (
        typeof Chart === "undefined"
    ) {

        console.warn(
            "Chart.js todavía no está disponible."
        );

        if (chartEmpty) {
            chartEmpty.style.display =
                "block";

            chartEmpty.textContent =
                "No se pudo cargar Chart.js.";
        }

        return;
    }


    const grouped = {};


    state.payments.forEach(
        payment => {

            const concept =
                payment.concept ||
                "Otro";


            grouped[concept] =
                (
                    grouped[concept] ||
                    0
                ) +
                Number(
                    payment.amount || 0
                );
        }
    );


    const labels =
        Object.keys(grouped);

    const values =
        Object.values(grouped);


    if (expensesChart) {

        expensesChart.destroy();

        expensesChart = null;
    }


    if (values.length === 0) {

        chartEmpty.style.display =
            "block";

        return;
    }


    chartEmpty.style.display =
        "none";


    expensesChart =
        new Chart(
            chartCanvas,
            {

                type: "pie",

                data: {

                    labels:

                        labels,

                    datasets: [
                        {
                            data:
                                values,

                            borderWidth:
                                2,

                            borderColor:
                                "#ffffff"
                        }
                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            position:
                                "bottom"
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        const value =
                                            context.parsed;

                                        const total =
                                            values.reduce(
                                                (
                                                    a,
                                                    b
                                                ) =>
                                                    a + b,
                                                0
                                            );

                                        const percentage =
                                            total
                                                ? (
                                                    value /
                                                    total *
                                                    100
                                                ).toFixed(1)
                                                : 0;

                                        return (
                                            `${context.label}: ` +
                                            `${money(value)} ` +
                                            `(${percentage}%)`
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================================
   EXPORTAR CSV
========================================================= */

function exportToExcel() {

    if (
        state.payments.length ===
        0
    ) {

        alert(
            "No hay pagos para exportar."
        );

        return;
    }


    const rows = [];


    rows.push([
        "Empleado",
        "Concepto",
        "Fecha",
        "Monto",
        "Origen"
    ]);


    state.payments.forEach(
        payment => {

            rows.push([
                payment.name,
                payment.concept,
                payment.date,
                Number(
                    payment.amount
                ).toFixed(2),
                payment.source ===
                    "automatic"
                    ? "Automático"
                    : "Manual"
            ]);
        }
    );


    rows.push([]);

    rows.push([
        "RESUMEN FINANCIERO"
    ]);

    rows.push([
        "Presupuesto Inicial",
        Number(
            state.initialBudget
        ).toFixed(2)
    ]);

    rows.push([
        "Total Gastado",
        Number(
            getTotalSpent()
        ).toFixed(2)
    ]);

    rows.push([
        "Presupuesto Restante",
        Number(
            getRemainingBudget()
        ).toFixed(2)
    ]);

    rows.push([
        "Número de Pagos",
        state.payments.length
    ]);


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            csvEscape
                        )
                        .join(",")
            )
            .join("\r\n");


    const blob =
        new Blob(
            [
                "\uFEFF" + csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;

    link.download =
        `nomina_${getTodayISO()}.csv`;


    document.body.appendChild(
        link
    );

    link.click();

    link.remove();


    URL.revokeObjectURL(
        url
    );
}


function csvEscape(value) {

    const text =
        String(
            value ?? ""
        );


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {

        return (
            '"' +
            text.replace(
                /"/g,
                '""'
            ) +
            '"'
        );
    }


    return text;
}


/* =========================================================
   REINICIAR
========================================================= */

function resetApplication() {

    const first =
        confirm(
            "⚠️ ADVERTENCIA\n\n" +
            "Se eliminarán presupuesto, pagos " +
            "y automatizaciones.\n\n" +
            "¿Deseas continuar?"
        );


    if (!first) {
        return;
    }


    const second =
        confirm(
            "ÚLTIMA CONFIRMACIÓN\n\n" +
            "Todos los datos serán eliminados.\n\n" +
            "¿REALMENTE deseas reiniciar todo?"
        );


    if (!second) {
        return;
    }


    localStorage.removeItem(
        STORAGE_KEY
    );


    state = {

        initialBudget: 0,

        payments: [],

        recurringPayments: []
    };


    cancelPaymentEdit();


    if (recurringForm) {
        recurringForm.reset();
    }


    renderEverything();


    alert(
        "Todo ha sido reiniciado correctamente."
    );
}


/* =========================================================
   FUNCIONES GLOBALES PARA BOTONES DE TABLA
========================================================= */

window.editPayment =
    editPayment;

window.deletePayment =
    deletePayment;

window.deleteRecurring =
    deleteRecurring;