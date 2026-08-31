// UI rendering logic for students module
window.StudentUI = {
    updateStatus(stage, grade) {
        const statusBar = document.getElementById('selectionStatus');
        const statusText = document.getElementById('statusText');
        const actionBox = document.getElementById('studentActionBox');
        const searchBox = document.getElementById('studentSearchContainer');
        const gradeFilters = document.getElementById('studentGradeFiltersWrapper');

        if (stage && grade) {
            statusBar.style.display = 'flex';
            const data = window.STUDENT_CONFIG.stageData[stage];
            const stageName = data.name;
            
            if (data.isFlat || stage.startsWith('custom_')) {
                statusText.innerHTML = `العرض الآن للمرحلة <span class="highlight-name">${stageName}</span>`;
                if (gradeFilters) gradeFilters.style.display = 'none';
            } else {
                const gradeName = window.STUDENT_CONFIG.gradeNames[stage][grade - 1];
                statusText.innerHTML = `العرض الآن للمرحلة <span class="highlight-name">${stageName}</span> وللصف <span class="highlight-name">${gradeName}</span>`;
                if (gradeFilters) gradeFilters.style.display = 'block';
            }

            if (actionBox) actionBox.style.display = 'block';
            if (searchBox) searchBox.style.display = 'block';
        } else {
            statusBar.style.display = 'none';
            if (actionBox) actionBox.style.display = 'none';
            if (searchBox) searchBox.style.display = 'none';
        }
    },

    renderTable(students, container, options = {}) {
        const {
            isSearch = false,
            searchQuery = '',
            onEdit,
            onDelete,
            onExpel,
            deleteMode = false,
            selectedIds = new Set(),
            onToggleSelect
        } = options;
        
        container.innerHTML = `
            <div class="table-responsive">
                <table class="students-table ${deleteMode ? 'mode-selection' : ''}">
                    <thead>
                        <tr>
                            ${deleteMode ? '<th class="col-checkbox"><i class="fas fa-check-square"></i></th>' : ''}
                            <th class="col-id">م</th>
                            <th style="min-width: 200px;">اسم الطالب</th>
                            <th style="width: 110px;">كود الطالب</th>
                            <th style="width: 150px;">باركود الطالب</th>
                            <th class="col-phone">هاتف الطالب</th>
                            <th class="col-phone">هاتف ولي الأمر</th>
                            <th class="col-join-date">تاريخ الانضمام</th>
                            <th class="col-actions">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="studentsTableBody"></tbody>
                </table>
            </div>
        `;

        const tbody = document.getElementById('studentsTableBody');
        students.forEach((student) => {
            const isEmpty = window.StudentStore?.isEmptySlot
                ? window.StudentStore.isEmptySlot(student)
                : !student.name;
            const isSelected = selectedIds.has(student.id);
            const tr = document.createElement('tr');
            tr.style.animation = 'fadeInUp 0.3s ease';
            if (deleteMode) tr.classList.add('student-row');
            
            if (isEmpty) tr.classList.add('row-empty');
            if (isSelected) tr.classList.add('row-selected');
            
            if (isSearch && searchQuery) {
                const query = searchQuery.toLowerCase();
                const nameMatch = student.name && student.name.toLowerCase() === query;
                const serialMatch = student.originalSerial.toString() === query;
                if (nameMatch || serialMatch) {
                    tr.classList.add('row-exact-match');
                }
            }

            const joinDate = student.createdAt 
                ? window.AppUtils.formatFullDateTime(student.createdAt)
                : '---';

            tr.innerHTML = `
                ${deleteMode ? `
                    <td class="col-checkbox">
                        <label class="custom-checkbox ${isEmpty ? 'disabled' : ''}">
                            <input
                                type="checkbox"
                                class="student-select-checkbox"
                                aria-label="تحديد الطالب"
                                ${isSelected ? 'checked' : ''}
                                ${isEmpty ? 'disabled' : ''}
                            >
                            <span class="checkmark"></span>
                        </label>
                    </td>
                ` : ''}
                <td class="col-id">${student.originalSerial}</td>
                <td class="student-name-cell">
                    ${!isEmpty && student.name ? `
                        <a href="#" class="clickable-student-link student-name-link" data-student-id="${student.id}" data-from-view="students">
                            ${student.name}
                        </a>
                    ` : ''}
                    ${!isEmpty && student.family_group_id ? `<span title="عائلة مرتبطة" style="display:inline-flex;align-items:center;gap:3px;background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.35);border-radius:20px;padding:1px 7px;font-size:0.68rem;color:#c084fc;margin-right:6px;vertical-align:middle;"><i class="fas fa-users" style="font-size:0.6rem;"></i> أقارب</span>` : ''}
                </td>
                <td style="text-align: center;">
                    ${!isEmpty && student.name ? `<a href="#" class="time-pill student-name-link" data-student-id="${student.id}" data-from-view="students" style="background:rgba(16,185,129,0.1); border-color:rgba(16,185,129,0.3); color:#10b981; font-family:monospace; letter-spacing:1px; font-size: 0.85rem;">${student.studentCode || '------'}</a>` : ''}
                </td>
                <td class="col-barcode">
                    ${!isEmpty && student.name && student.studentCode ? `<svg class="student-barcode-svg" id="bc_${student.id}" data-code="${student.studentCode}"></svg>` : ''}
                </td>
                <td class="col-phone">${isEmpty ? '' : (student.phone || '---')}</td>
                <td class="col-phone">${isEmpty ? '' : (student.parentPhone || '---')}</td>
                <td class="col-join-date">${isEmpty ? '' : joinDate}</td>
                <td class="col-actions">
                    ${!isEmpty ? `<div class="action-btns-group">
                        <button class="table-action-btn edit-btn-table" title="${isEmpty ? 'إضافة' : 'تعديل'}">
                            <i class="fas ${isEmpty ? 'fa-plus' : 'fa-pencil-alt'}"></i>
                        </button>
                        <button class="table-action-btn delete-btn-table" title="مسح">
                            <i class="fas fa-eraser"></i>
                        </button>
                        <button class="table-action-btn manual-expel-btn" title="طرد الطالب" aria-label="طرد الطالب">
                            <i class="fas fa-user-slash"></i>
                        </button>
                    </div>` : ''}
                </td>
            `;

            tr.querySelector('.edit-btn-table')?.addEventListener('click', event => {
                event.stopPropagation();
                onEdit(student);
            });
            if (!isEmpty) {
                const checkbox = tr.querySelector('.student-select-checkbox');
                if (checkbox && deleteMode) {
                    // Let the browser toggle the native checkbox, then sync
                    // the model exactly once from its change event.
                    checkbox.addEventListener('click', event => event.stopPropagation());
                    checkbox.addEventListener('change', event => {
                        event.stopPropagation();
                        onToggleSelect(student.id, checkbox.checked);
                    });
                }
                tr.querySelector('.delete-btn-table')?.addEventListener('click', event => {
                    event.stopPropagation();
                    onDelete(student.id);
                });
                tr.querySelector('.manual-expel-btn')?.addEventListener('click', event => {
                    event.stopPropagation();
                    onExpel?.(student.id);
                });
                if (deleteMode) {
                    tr.onclick = (e) => {
                        if (e.target.closest('.table-action-btn')) return;
                        // A checkbox or its label is handled by the native
                        // checkbox/change path above; do not toggle twice.
                        if (e.target.closest('.custom-checkbox')) return;
                        if (e.target.closest('.student-name-link')) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        onToggleSelect(student.id);
                    };
                }
            }

            tbody.appendChild(tr);


        });
        // Batch-render all barcodes in a single rAF pass after DOM is settled
        if (typeof JsBarcode === 'function') {
            requestAnimationFrame(() => {
                container.querySelectorAll('.student-barcode-svg[data-code]').forEach(svg => {
                    const code = window.AppUtils.formatNumber(svg.dataset.code);
                    try {
                        JsBarcode(svg, code, {
                            format: "CODE128", width: 1.2, height: 30,
                            displayValue: false, margin: 0,
                            background: "transparent", lineColor: "var(--text-primary)"
                        });
                    } catch(e) {}
                });
            });
        }
    }
};
