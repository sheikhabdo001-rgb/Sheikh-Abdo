window.FINANCIAL_REPORTS_VIEW = `
    <main id="financialReportsView" class="main-content view-section" style="display: none;">
        <div class="financial-reports-heading">
            <div>
                <span class="financial-reports-eyebrow"><i class="fas fa-chart-line"></i> مركز المتابعة المالية</span>
                <h1 class="hero-title-gradient">التقارير المالية</h1>
                <p class="hero-subtitle">تابع الإيرادات والمصروفات والرصيد الحالي في لمحة واحدة.</p>
            </div>
            <div class="financial-report-heading-actions">
                <span class="financial-updated-note"><i class="fas fa-arrows-rotate"></i> تتحدث تلقائياً</span>
                <button id="printFinancialReportBtn" class="report-btn ghost financial-print-btn no-print" type="button">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    <span>طباعة / حفظ PDF</span>
                </button>
            </div>
        </div>

        <!-- Sticky toolbar: quick ranges, exact dates, and grade scope -->
        <div class="reports-toolbar glass-panel" id="financialReportsToolbar">
            <div class="rep-toolbar-group">
                <span class="rep-toolbar-label"><i class="fas fa-calendar-alt"></i> الفترة:</span>
                <div class="range-switch" id="dateRangeSwitch">
                    <button type="button" class="range-btn active" data-range="today">اليوم</button>
                    <button type="button" class="range-btn" data-range="week">هذا الأسبوع</button>
                    <button type="button" class="range-btn" data-range="month">هذا الشهر</button>
                    <button type="button" class="range-btn" data-range="year">هذه السنة</button>
                    <button type="button" class="range-btn" data-range="all">الكل</button>
                    <button type="button" class="range-btn" data-range="custom">فترة مخصصة</button>
                </div>
                <div class="range-dates" id="rangeDates" style="display:none;">
                    <label for="rangeFrom">تاريخ البداية</label>
                    <input type="date" id="rangeFrom" class="analytics-select">
                    <span class="range-sep">إلى</span>
                    <label for="rangeTo">تاريخ النهاية</label>
                    <input type="date" id="rangeTo" class="analytics-select">
                </div>
                <button type="button" id="resetReportFilters" class="report-btn ghost"><i class="fas fa-rotate-left"></i> إعادة الضبط</button>
            </div>
            <div class="rep-toolbar-group">
                <label class="rep-toolbar-label"><i class="fas fa-layer-group"></i> المرحلة / المجموعة:</label>
                <select id="reportStageFilter" class="analytics-select"><option value="all">كل المراحل</option></select>
                <select id="reportClassFilter" class="analytics-select"><option value="all">كل الصفوف</option></select>
            </div>
            <div class="rep-toolbar-group rep-actions">
                <button id="addExpenseBtn" class="report-btn primary"><i class="fas fa-plus"></i> إضافة مصروف</button>
            </div>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid" id="kpiGrid">
            <div class="kpi-card revenue">
                <div class="kpi-top"><span class="kpi-icon"><i class="fas fa-money-bill-trend-up"></i></span><span class="kpi-label">إجمالي الإيرادات</span><span class="kpi-trend">↗</span></div>
                <strong class="kpi-value" id="kpiRevenue">0 ج.م</strong>
                <span class="kpi-sub" id="kpiRevenueSub">إيرادات الطلاب</span>
            </div>
            <div class="kpi-card profit">
                <div class="kpi-top"><span class="kpi-icon"><i class="fas fa-arrow-trend-up"></i></span><span class="kpi-label">إجمالي الأرباح</span><span class="kpi-trend">↗</span></div>
                <strong class="kpi-value" id="kpiProfit">0 ج.م</strong>
                <span class="kpi-sub" id="kpiProfitSub">صافي ربح الإيرادات</span>
            </div>
            <div class="kpi-card expense">
                <div class="kpi-top"><span class="kpi-icon"><i class="fas fa-receipt"></i></span><span class="kpi-label">المصروفات الشخصية</span></div>
                <strong class="kpi-value" id="kpiExpense">0 ج.م</strong>
                <span class="kpi-sub" id="kpiExpenseSub">مصروفات في الفترة</span>
                <button type="button" id="kpiAddExpenseBtn" class="kpi-quick-action"><i class="fas fa-plus"></i> إضافة مصروف</button>
            </div>
            <div class="kpi-card balance" id="kpiBalanceCard">
                <div class="kpi-top"><span class="kpi-icon"><i class="fas fa-wallet"></i></span><span class="kpi-label">الرصيد الصافي الحالي</span></div>
                <strong class="kpi-value" id="kpiBalance">0 ج.م</strong>
                <span class="kpi-sub" id="kpiBalanceSub">الإيرادات - المصروفات</span>
            </div>
        </div>

        <!-- Debts & Advances -->
        <section class="debt-analytics-section" aria-labelledby="debtAnalyticsTitle">
            <div class="debt-analytics-heading">
                <div>
                    <span class="debt-analytics-eyebrow"><i class="fas fa-scale-balanced"></i> متابعة الالتزامات</span>
                    <h2 id="debtAnalyticsTitle">واجب السداد والاشتراكات</h2>
                </div>
                <span class="debt-analytics-note" id="debtAnalyticsNote">الشهر الحالي + المقدم القادم</span>
            </div>
            <div class="kpi-grid debt-kpi-grid">
                <div class="kpi-card debt-overdue">
                    <div class="kpi-top">
                        <span class="kpi-icon"><i class="fas fa-triangle-exclamation"></i></span>
                        <span class="kpi-label">إجمالي الشهور المؤخرة</span>
                    </div>
                    <strong class="kpi-value" id="kpiOverdue">0 ج.م</strong>
                    <span class="kpi-sub" id="kpiOverdueSub">لا توجد مديونيات مستحقة</span>
                </div>
                <div class="kpi-card debt-advance">
                    <div class="kpi-top">
                        <span class="kpi-icon"><i class="fas fa-wallet"></i></span>
                        <span class="kpi-label">إجمالي الشهور المقدمة</span>
                    </div>
                    <strong class="kpi-value" id="kpiAdvance">0 ج.م</strong>
                    <span class="kpi-sub" id="kpiAdvanceSub">المقدم المطلوب عن الشهر القادم</span>
                </div>
                <div class="kpi-card debt-net positive" id="kpiNetDebtCard">
                    <div class="kpi-top">
                        <span class="kpi-icon"><i class="fas fa-scale-balanced"></i></span>
                        <span class="kpi-label">إجمالي صافي المديونيات</span>
                    </div>
                    <strong class="kpi-value" id="kpiNetDebt">0 ج.م</strong>
                    <span class="kpi-sub" id="kpiNetDebtSub">الشهر الحالي + مقدم الشهر القادم</span>
                </div>
            </div>
        </section>

        <!-- Charts -->
        <div class="charts-grid">
            <div class="chart-card glass-panel">
                <div class="chart-head">
                    <h3><i class="fas fa-chart-column"></i> الإيرادات مقابل المصاريف</h3>
                    <span class="chart-hint" id="revExpChartHint">يومياً</span>
                </div>
                <div class="chart-body">
                    <svg id="revExpChart" class="bar-chart" viewBox="0 0 600 260" preserveAspectRatio="none"></svg>
                    <div class="legend-row">
                        <span class="legend-item"><span class="legend-dot rev"></span> الإيرادات</span>
                        <span class="legend-item"><span class="legend-dot exp"></span> المصاريف</span>
                    </div>
                </div>
            </div>
            <div class="chart-card glass-panel">
                <div class="chart-head">
                    <h3><i class="fas fa-chart-pie"></i> الإيرادات حسب المرحلة / المجموعة</h3>
                    <span class="chart-hint">توزيع الدخل</span>
                </div>
                <div class="chart-body pie-layout">
                    <svg id="gradePieChart" class="pie-chart" viewBox="0 0 200 200"></svg>
                    <div class="pie-legend" id="gradePieLegend"></div>
                </div>
            </div>
        </div>

        <!-- Expense Management -->
        <div class="rep-panel glass-panel">
            <div class="rep-panel-head">
                <div class="rep-panel-title">
                    <h3><i class="fas fa-receipt"></i> المصروفات الشخصية</h3>
                    <span class="rep-panel-count" id="expenseCount">0 مصروف</span>
                </div>
                <div class="rep-panel-controls">
                    <div class="rep-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="expenseSearch" placeholder="بحث في المصاريف...">
                    </div>
                    <select id="expenseCategoryFilter" class="analytics-select">
                        <option value="all">كل التصنيفات</option>
                        <option value="office">أدوات مكتبية</option>
                        <option value="rent">إيجار</option>
                        <option value="personal">شخصي</option>
                        <option value="salaries">رواتب المساعدين</option>
                        <option value="printing">طباعة مذكرة</option>
                        <option value="bills">فواتير</option>
                        <option value="other">أخرى</option>
                    </select>
                </div>
            </div>
            <div class="rep-table-wrap">
                <table class="rep-table">
                    <thead>
                        <tr>
                            <th>العنوان</th>
                            <th>التصنيف</th>
                            <th>المبلغ</th>
                            <th>التاريخ والوقت</th>
                            <th>ملاحظات</th>
                            <th>الإيصال</th>
                            <th class="th-actions">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="expensesTable"></tbody>
                </table>
            </div>
        </div>

        <!-- Revenue Ledger -->
        <div class="rep-panel glass-panel">
            <div class="rep-panel-head">
                <div class="rep-panel-title">
                    <h3><i class="fas fa-clock-rotate-left"></i> سجل المدفوعات الأخير</h3>
                    <span class="rep-panel-count" id="ledgerCount">0 معاملة</span>
                </div>
                <div class="rep-panel-controls">
                    <div class="rep-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="ledgerSearch" placeholder="بحث بالاسم أو الكود...">
                    </div>
                </div>
            </div>
            <div class="rep-table-wrap">
                <table class="rep-table">
                    <thead>
                        <tr>
                            <th>اسم الطالب</th>
                            <th>المرحلة والصف</th>
                            <th>نوع المعاملة</th>
                            <th>المبلغ</th>
                            <th>التاريخ</th>
                            <th>الوقت</th>
                            <th>التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody id="revenueLedgerTable"></tbody>
                </table>
            </div>
        </div>

        <!-- Add / Edit Expense Modal -->
        <div id="expenseModal" class="modal-overlay expense-modal-overlay">
            <div class="modal-content glass-modal expense-modal-content" style="max-width: 520px;">
                <div class="modal-header">
                    <h3 id="expenseModalTitle"><i class="fas fa-receipt"></i> إضافة مصروف جديد</h3>
                    <button class="close-modal-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="expense-form">
                        <div class="input-group">
                            <label>عنوان المصروف / التصنيف <i class="fas fa-tag"></i></label>
                            <input type="text" id="expenseTitle" class="rep-input" placeholder="مثال: إيجار القاعة">
                            <select id="expenseCategory" class="analytics-select" style="margin-top:0.6rem;">
                                <option value="office">أدوات مكتبية</option>
                                <option value="rent">إيجار</option>
                                <option value="personal">شخصي</option>
                                <option value="salaries">رواتب المساعدين</option>
                                <option value="printing">طباعة مذكرة</option>
                                <option value="bills">فواتير</option>
                                <option value="other">أخرى</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>المبلغ <i class="fas fa-money-bill-wave"></i></label>
                            <div class="amount-input">
                                <input type="number" id="expenseAmount" class="rep-input" placeholder="0" min="0" step="0.01">
                                <span class="amount-unit">ج.م</span>
                            </div>
                        </div>
                        <div class="input-group">
                            <label>التاريخ والوقت <i class="fas fa-clock"></i></label>
                            <div class="dt-inputs">
                                <input type="datetime-local" id="expenseDateTime" class="rep-input">
                            </div>
                        </div>
                        <div class="input-group">
                            <label>ملاحظات <i class="fas fa-sticky-note"></i></label>
                            <textarea id="expenseNotes" class="rep-input" rows="2" placeholder="ملاحظات اختيارية..."></textarea>
                        </div>
                        <div class="input-group">
                            <label>صورة الإيصال (اختياري) <i class="fas fa-camera"></i></label>
                            <label class="receipt-upload">
                                <input type="file" id="expenseReceipt" accept="image/*" hidden>
                                <i class="fas fa-cloud-upload-alt"></i>
                                <span id="receiptFileName">اضغط لرفع صورة الإيصال</span>
                            </label>
                            <img id="receiptPreview" class="receipt-preview" alt="معاينة الإيصال" style="display:none;">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancelExpenseBtn" class="action-btn-styled secondary" style="flex:1;">إلغاء</button>
                    <button id="saveExpenseBtn" class="action-btn-styled" style="flex:1; background:var(--gradient-success); color:white; border:none;">حفظ المصروف</button>
                </div>
            </div>
        </div>
    </main>
`;
