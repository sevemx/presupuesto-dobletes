/* =========================================================
   CONTROL DE PRESUPUESTO Y NÓMINA
   Persistencia: LocalStorage
   Gráfico: Chart.js
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const STORAGE_KEY = "control_nomina_presupuesto_v1";

const CHECK_INTERVAL = 10 * 1000;

let state = {
    initialBudget: 0,
    payments: [],
    recurringPayments: []
};

let expensesChart = null;


/* =========================================================
   REFERENCIAS DOM
========================================================= */

const budgetForm = document.getElementById("budgetForm");
const initialBudgetInput = document.getElementById("initialBudget");

const paymentForm = document.getElementById("paymentForm");
const editingPaymentId = document.getElementById("editingPaymentId");
const employeeName = document.getElementById("employeeName");
const paymentConcept = document.getElementById("paymentConcept");
const paymentDate = document.getElementById("paymentDate");
const paymentAmount = document.getElementById("paymentAmount");
const paymentSubmit = document.getElementById("paymentSubmit");
const cancelEdit = document.getElementById("cancelEdit");

const recurringForm = document.getElementById("recurringForm");
const recurringName = document.getElementById("recurringName");
const recurringConcept = document.getElementById("recurringConcept");
const recurringFrequency = document.getElementById("recurringFrequency");
const recurringAmount = document.getElementById("recurringAmount");

const recurringList = document.getElementById("recurringList");

const paymentsTableBody = document.getElementById("paymentsTableBody");
const emptyHistory = document.getElementById("emptyHistory");

const searchPayments = document.getElementById("searchPayments");

const budgetIndicator = document.getElementById("budgetIndicator");
const remainingBudget = document.getElementById("remainingBudget");
const budgetPercentage = document.getElementById("budgetPercentage");

const totalBudget = document.getElementById("totalBudget");
const totalSpent = document.getElementById("totalSpent");
const paymentCount = document.getElementById("paymentCount");

const chartCanvas = document.getElementById("expensesChart");
const chartEmpty = document.getElementById("chartEmpty");

const exportExcel = document.getElementById("exportExcel");
const resetAll = document.getElementById("resetAll");


/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadState();

    setTodayIfEmpty();

    renderEverything();

    /*
     * Revisar inmediatamente al abrir.
     * Esto permite procesar pagos vencidos aunque
     * la página haya estado cerrada.
     */
    processRecurringPayments();

    /*
     * Revisar cada 10 segundos.
     */
    setInterval(processRecurringPayments, CHECK_INTERVAL);
});


/* =========================================================
   LOCAL STORAGE
========================================================= */

function loadState() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return;
        }

        const parsed = JSON.parse(saved);

        state = {
            initialBudget: Number(parsed.initialBudget) || 0,
            payments: Array.isArray(parsed.payments)
                ? parsed.payments
                : [],
            recurringPayments: Array.isArray(parsed.recurringPayments)
                ? parsed.recurringPayments
                : []
        };

    } catch (error) {

        console.error(
            "Error leyendo LocalStorage:",
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

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );
}


/* =========================================================
   UTILIDADES
========================================================= */

function generateId() {

    return (
        Date.now().toString(36) +
        Math.random().toString(36).substring(2, 9)
    );
}


function money(value) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    ).format(Number(value) || 0);
}


function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date = new Date(
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


function getTodayISO() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function setTodayIfEmpty() {

    if (!paymentDate.value) {
        paymentDate.value = getTodayISO();
    }
}


function getTotalSpent() {

    return state.payments.reduce(
        (total, payment) =>
            total + Number(payment.amount || 0),
        0
    );
}


function getRemainingBudget() {

    return (
        Number(state.initialBudget || 0) -
        getTotalSpent()
    );
}


/* =========================================================
   PRESUPUESTO
========================================================= */

budgetForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const value = Number(
            initialBudgetInput.value
        );

        if (!Number.isFinite(value) || value < 0) {

            alert(
                "Ingresa un presupuesto válido."
            );

            return;
        }

        state.initialBudget = value;

        saveState();

        renderEverything();

        alert(
            "Presupuesto guardado correctamente."
        );
    }
);


/* =========================================================
   REGISTRAR / EDITAR PAGOS
========================================================= */

paymentForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const name =
            employeeName.value.trim();

        const concept =
            paymentConcept.value;

        const date =
            paymentDate.value;

        const amount =
            Number(paymentAmount.value);

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


        /* =============================================
           EDITAR
        ============================================= */

        if (editingId) {

            const payment =
                state.payments.find(
                    item => item.id === editingId
                );

            if (!payment) {
                cancelPaymentEdit();
                return;
            }

            const oldAmount =
                Number(payment.amount);

            const difference =
                amount - oldAmount;

            /*
             * Si la edición incrementa el gasto,
             * comprobamos el presupuesto disponible.
             */
            if (difference > 0) {

                const available =
                    getRemainingBudget();

                if (difference > available) {

                    const proceed = confirm(
                        "Este cambio hará que el gasto adicional supere " +
                        "el presupuesto disponible.\n\n" +
                        "¿Deseas continuar?"
                    );

                    if (!proceed) {
                        return;
                    }
                }
            }


            payment.name = name;
            payment.concept = concept;
            payment.date = date;
            payment.amount = amount;

            saveState();

            cancelPaymentEdit();

            renderEverything();

            return;
        }


        /* =============================================
           NUEVO PAGO
        ============================================= */

        const available =
            getRemainingBudget();

        if (amount > available) {

            const proceed = confirm(
                "⚠️ El monto de este pago supera " +
                "el presupuesto disponible.\n\n" +
                "Presupuesto disponible: " +
                money(available) +
                "\nMonto del pago: " +
                money(amount) +
                "\n\n¿Deseas registrar el gasto de todas formas?"
            );

            if (!proceed) {
                return;
            }
        }


        const payment = {

            id: generateId(),

            name: name,

            concept: concept,

            date: date,

            amount: amount,

            source: "manual",

            createdAt: Date.now()
        };


        state.payments.push(payment);

        saveState();

        paymentForm.reset();

        editingPaymentId.value = "";

        setTodayIfEmpty();

        renderEverything();
    }
);


/* =========================================================
   EDITAR PAGO
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


cancelEdit.addEventListener(
    "click",
    cancelPaymentEdit
);


function cancelPaymentEdit() {

    paymentForm.reset();

    editingPaymentId.value = "";

    paymentSubmit.textContent =
        "Registrar Pago";

    cancelEdit.classList.add(
        "hidden"
    );

    setTodayIfEmpty();
}


/* =========================================================
   ELIMINAR PAGO
========================================================= */

function deletePayment(id) {

    const payment =
        state.payments.find(
            item => item.id === id
        );

    if (!payment) {
        return;
    }

    const confirmed = confirm(
        `¿Eliminar el pago de "${payment.name}" por ${money(payment.amount)}?`
    );

    if (!confirmed) {
        return;
    }

    state.payments =
        state.payments.filter(
            item => item.id !== id
        );

    saveState();

    renderEverything();
}


/* =========================================================
   PAGOS RECURRENTES
========================================================= */

recurringForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const name =
            recurringName.value.trim();

        const concept =
            recurringConcept.value;

        const frequency =
            recurringFrequency.value;

        const amount =
            Number(recurringAmount.value);


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


        const recurring = {

            id: generateId(),

            name: name,

            concept: concept,

            frequency: frequency,

            amount: amount,

            active: true,

            /*
             * Primera ejecución:
             * se programa a partir del momento actual.
             */
            nextRunAt:
                calculateNextRun(
                    Date.now(),
                    frequency
                ),

            createdAt: Date.now()
        };


        state.recurringPayments.push(
            recurring
        );

        saveState();

        recurringForm.reset();

        renderRecurringPayments();

        alert(
            "Pago recurrente programado correctamente."
        );
    }
);


/* =========================================================
   CALCULAR SIGUIENTE EJECUCIÓN
========================================================= */

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

            /*
             * Manejo especial para evitar
             * problemas con fechas como 31.
             */
            const originalDay =
                date.getDate();

            date.setDate(1);

            date.setMonth(
                date.getMonth() + 1
            );

            const lastDay =
                new Date(
                    date.getFullYear(),
                    date.getMonth() + 1,
                    0
                ).getDate();

            date.setDate(
                Math.min(
                    originalDay,
                    lastDay
                )
            );

            break;
    }

    return date.getTime();
}


/* =========================================================
   PROCESAR PAGOS RECURRENTES
========================================================= */

function processRecurringPayments() {

    const now = Date.now();

    let changed = false;

    state.recurringPayments.forEach(
        recurring => {

            if (!recurring.active) {
                return;
            }

            /*
             * Mientras la fecha de ejecución
             * haya quedado en el pasado,
             * generamos los pagos pendientes.
             *
             * Esto permite recuperar pagos
             * aunque la aplicación haya
             * estado cerrada.
             */
            let safetyCounter = 0;

            while (
                recurring.nextRunAt <= now &&
                safetyCounter < 100
            ) {

                const executionDate =
                    new Date(
                        recurring.nextRunAt
                    );

                const payment = {

                    id: generateId(),

                    name:
                        recurring.name,

                    concept:
                        recurring.concept,

                    date:
                        toISODate(executionDate),

                    amount:
                        Number(recurring.amount),

                    source:
                        "automatic",

                    recurringId:
                        recurring.id,

                    createdAt:
                        Date.now()
                };


                state.payments.push(
                    payment
                );

                /*
                 * Avanzar al siguiente periodo
                 * desde la ejecución anterior.
                 */
                recurring.nextRunAt =
                    calculateNextRun(
                        recurring.nextRunAt,
                        recurring.frequency
                    );

                changed = true;

                safetyCounter++;
            }
        }
    );


    if (changed) {

        saveState();

        renderEverything();
    }
}


/* =========================================================
   CONVERTIR DATE A YYYY-MM-DD
========================================================= */

function toISODate(date) {

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


/* =========================================================
   ELIMINAR AUTOMATIZACIÓN
========================================================= */

function deleteRecurring(id) {

    const recurring =
        state.recurringPayments.find(
            item => item.id === id
        );

    if (!recurring) {
        return;
    }

    const confirmed = confirm(
        `¿Cancelar la automatización de "${recurring.name}"?`
    );

    if (!confirmed) {
        return;
    }

    state.recurringPayments =
        state.recurringPayments.filter(
            item => item.id !== id
        );

    saveState();

    renderRecurringPayments();
}


/* =========================================================
   TEXTO DE FRECUENCIA
========================================================= */

function frequencyText(frequency) {

    const labels = {

        daily: "Diario",

        weekly: "Semanal",

        biweekly: "Quincenal",

        monthly: "Mensual"
    };

    return labels[frequency] || frequency;
}


/* =========================================================
   RENDER PRINCIPAL
========================================================= */

function renderEverything() {

    initialBudgetInput.value =
        state.initialBudget || "";

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
        Number(state.initialBudget || 0);

    const spent =
        getTotalSpent();

    const remaining =
        budget - spent;

    let percentage = 0;

    if (budget > 0) {

        percentage =
            (remaining / budget) * 100;
    }


    remainingBudget.textContent =
        money(remaining);

    totalBudget.textContent =
        money(budget);

    totalSpent.textContent =
        money(spent);

    paymentCount.textContent =
        state.payments.length;


    if (budget <= 0) {

        budgetPercentage.textContent =
            "Sin presupuesto configurado";

    } else {

        budgetPercentage.textContent =
            `${Math.max(percentage, 0).toFixed(1)}% disponible`;
    }


    /*
     * Limpiar estados anteriores.
     */
    budgetIndicator.classList.remove(
        "normal",
        "warning",
        "danger"
    );


    /*
     * Rojo:
     * presupuesto agotado o negativo.
     */
    if (
        budget > 0 &&
        remaining <= 0
    ) {

        budgetIndicator.classList.add(
            "danger"
        );

        return;
    }


    /*
     * Amarillo:
     * menos del 20%.
     */
    if (
        budget > 0 &&
        percentage < 20
    ) {

        budgetIndicator.classList.add(
            "warning"
        );

        return;
    }


    /*
     * Verde:
     * situación normal.
     */
    budgetIndicator.classList.add(
        "normal"
    );
}


/* =========================================================
   RENDER HISTORIAL
========================================================= */

function renderPayments() {

    const query =
        searchPayments.value
            .trim()
            .toLowerCase();


    const filtered =
        state.payments.filter(
            payment => {

                const name =
                    String(payment.name)
                        .toLowerCase();

                const concept =
                    String(payment.concept)
                        .toLowerCase();

                return (
                    name.includes(query) ||
                    concept.includes(query)
                );
            }
        );


    paymentsTableBody.innerHTML = "";


    if (filtered.length === 0) {

        emptyHistory.style.display =
            "block";

        return;

    } else {

        emptyHistory.style.display =
            "none";
    }


    /*
     * Mostrar más recientes primero.
     */
    filtered
        .slice()
        .sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        )
        .forEach(payment => {

            const tr =
                document.createElement("tr");


            const sourceClass =
                payment.source === "automatic"
                    ? "origin-auto"
                    : "origin-manual";


            const sourceText =
                payment.source === "automatic"
                    ? "Automático"
                    : "Manual";


            tr.innerHTML = `

                <td>
                    ${escapeHTML(payment.name)}
                </td>

                <td>
                    ${escapeHTML(payment.concept)}
                </td>

                <td>
                    ${formatDate(payment.date)}
                </td>

                <td class="amount-cell">
                    ${money(payment.amount)}
                </td>

                <td>
                    <span class="origin-badge ${sourceClass}">
                        ${sourceText}
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


            paymentsTableBody.appendChild(tr);
        });
}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   BUSCADOR
========================================================= */

searchPayments.addEventListener(
    "input",
    renderPayments
);


/* =========================================================
   RENDER AUTOMATIZACIONES
========================================================= */

function renderRecurringPayments() {

    recurringList.innerHTML = "";


    if (
        state.recurringPayments.length === 0
    ) {

        recurringList.innerHTML = `
            <div class="empty-message">
                No hay pagos automáticos programados.
            </div>
        `;

        return;
    }


    state.recurringPayments
        .filter(item => item.active)
        .forEach(recurring => {

            const item =
                document.createElement("div");

            item.className =
                "recurring-item";


            const nextDate =
                new Date(
                    recurring.nextRunAt
                );


            item.innerHTML = `

                <div class="recurring-info">

                    <div class="recurring-name">
                        ${escapeHTML(recurring.name)}
                    </div>

                    <div class="recurring-details">

                        ${escapeHTML(recurring.concept)}
                        ·
                        ${frequencyText(recurring.frequency)}
                        ·
                        Próximo:
                        ${nextDate.toLocaleString("es-MX")}

                    </div>

                </div>


                <div class="recurring-amount">
                    ${money(recurring.amount)}
                </div>


                <button
                    class="btn btn-small btn-danger"
                    onclick="deleteRecurring('${recurring.id}')"
                >
                    Cancelar
                </button>

            `;


            recurringList.appendChild(item);
        });
}


/* =========================================================
   GRÁFICO
========================================================= */

function renderChart() {

    const grouped = {};


    state.payments.forEach(payment => {

        const concept =
            payment.concept || "Otro";

        grouped[concept] =
            (grouped[concept] || 0) +
            Number(payment.amount || 0);
    });


    const labels =
        Object.keys(grouped);

    const values =
        Object.values(grouped);


    /*
     * Destruir instancia anterior.
     * Esto evita superposición de gráficos
     * y fugas de renderizado.
     */
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

                    labels: labels,

                    datasets: [
                        {
                            data: values,

                            borderWidth: 2,

                            borderColor: "#ffffff"
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        const value =
                                            context.parsed;

                                        const total =
                                            values.reduce(
                                                (a, b) =>
                                                    a + b,
                                                0
                                            );

                                        const percentage =
                                            total > 0
                                                ? (
                                                    value /
                                                    total *
                                                    100
                                                ).toFixed(1)
                                                : 0;

                                        return (
                                            ` ${context.label}: ` +
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
   EXPORTAR CSV PARA EXCEL
========================================================= */

exportExcel.addEventListener(
    "click",
    exportToExcel
);


function exportToExcel() {

    if (state.payments.length === 0) {

        alert(
            "No hay pagos para exportar."
        );

        return;
    }


    const rows = [];


    /*
     * Encabezados
     */
    rows.push([
        "Empleado",
        "Concepto",
        "Fecha",
        "Monto",
        "Origen"
    ]);


    /*
     * Historial completo.
     */
    state.payments.forEach(payment => {

        rows.push([
            payment.name,
            payment.concept,
            payment.date,
            Number(payment.amount).toFixed(2),
            payment.source === "automatic"
                ? "Automático"
                : "Manual"
        ]);
    });


    /*
     * Línea en blanco.
     */
    rows.push([]);


    /*
     * Resumen financiero.
     */
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


    /*
     * Convertir a CSV.
     */
    const csv =
        rows
            .map(
                row =>
                    row
                        .map(csvEscape)
                        .join(",")
            )
            .join("\r\n");


    /*
     * BOM UTF-8.
     *
     * Esto es importante para que Excel
     * reconozca correctamente:
     *
     * ñ, á, é, í, ó, ú, etc.
     */
    const BOM = "\uFEFF";

    const blob =
        new Blob(
            [
                BOM + csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `nomina_${getTodayISO()}.csv`;


    document.body.appendChild(link);

    link.click();

    link.remove();


    URL.revokeObjectURL(url);
}


function csvEscape(value) {

    const text =
        String(value ?? "");

    /*
     * CSV requiere comillas
     * si contiene:
     * coma, comillas o saltos de línea.
     */
    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {

        return `"${text.replaceAll(
            '"',
            '""'
        )}"`;
    }

    return text;
}


/* =========================================================
   REINICIAR TODO
========================================================= */

resetAll.addEventListener(
    "click",
    resetApplication
);


function resetApplication() {

    /*
     * Primera confirmación.
     */
    const first =
        confirm(
            "⚠️ ADVERTENCIA\n\n" +
            "Esto eliminará permanentemente:\n\n" +
            "• Presupuesto inicial\n" +
            "• Historial de pagos\n" +
            "• Pagos automáticos\n\n" +
            "¿Deseas continuar?"
        );


    if (!first) {
        return;
    }


    /*
     * Segunda confirmación.
     */
    const second =
        confirm(
            "ÚLTIMA CONFIRMACIÓN\n\n" +
            "Todos los datos guardados en este navegador " +
            "serán eliminados y no podrán recuperarse.\n\n" +
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

    recurringForm.reset();

    renderEverything();


    alert(
        "La aplicación ha sido reiniciada correctamente."
    );
}


/* =========================================================
   EXPOSICIÓN DE FUNCIONES PARA BOTONES DINÁMICOS
========================================================= */

window.editPayment =
    editPayment;

window.deletePayment =
    deletePayment;

window.deleteRecurring =
    deleteRecurring;