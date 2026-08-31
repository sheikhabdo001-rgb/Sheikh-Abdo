// UI rendering specifically for Groups Management
window.GroupsUI = {
    renderGroupsList(container, groups, onSelectGroup) {
        container.innerHTML = groups.map((g, idx) => {
            const colorClass = idx < 3 ? `group-${idx + 1}` : 'custom';
            return `
                <div class="group-card ${colorClass}" data-name="${g.name}">
                    <i class="fas fa-users"></i>
                    <h4>${g.name}</h4>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.group-card').forEach(card => {
            card.onclick = () => onSelectGroup(card.getAttribute('data-name'));
        });
    },

    renderGroupSelector(container, groups, currentGroupName, onSelect) {
        if (groups.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-secondary);">لا توجد مجموعات مضافة لهذا الصف.</p>';
            return;
        }

        container.innerHTML = groups.map(g => {
            const isActive = g.name === currentGroupName;
            const scheduleHtml = g.schedule && g.schedule.length > 0 
                ? g.schedule.map(s => `<div class="mini-schedule-item"><i class="far fa-clock"></i> ${s.day}: ${s.time || '--:--'}</div>`).join('')
                : '<div class="no-schedule-text">لم يتم تحديد مواعيد</div>';

            return `
                <div class="selection-group-card ${isActive ? 'active-group-glow' : ''}" data-name="${g.name}">
                    <div class="card-header-inner">
                        <i class="fas fa-users"></i>
                        <h4>${g.name}</h4>
                    </div>
                    <div class="card-body-inner">
                        ${scheduleHtml}
                    </div>
                    ${isActive ? '<div class="active-badge">نشط حالياً</div>' : ''}
                </div>
            `;
        }).join('');

        container.querySelectorAll('.selection-group-card').forEach(card => {
            card.onclick = () => onSelect(card.getAttribute('data-name'));
        });
    },

    renderScheduleTable(tbody, tempSchedule, onTimeInput, onRemove) {
        if (tempSchedule.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-secondary);">لا توجد أيام محددة</td></tr>';
            return;
        }

        tbody.innerHTML = tempSchedule.map((s, idx) => `
            <tr>
                <td>${s.day}</td>
                <td style="position: relative;">
                    <input type="time" value="${s.time || ''}" data-idx="${idx}" class="schedule-time-input">
                    <div class="conflict-msg">هذا الموعد محجوز!</div>
                </td>
                <td><button class="remove-day-btn" data-idx="${idx}"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('') || '';

        tbody.querySelectorAll('.schedule-time-input').forEach(input => {
            input.oninput = (e) => onTimeInput(parseInt(e.target.getAttribute('data-idx')), e.target.value);
        });

        tbody.querySelectorAll('.remove-day-btn').forEach(btn => {
            btn.onclick = () => onRemove(parseInt(btn.getAttribute('data-idx')));
        });
    },

    renderLinkGroupsManager(container, groups, onInput) {
        const filteredGroups = groups.filter(g => g.schedule && g.schedule.length > 0);
        if (filteredGroups.length === 0) {
            container.innerHTML = '<p class="no-data">لا توجد مجموعات بها مواعيد للربط.</p>';
            return;
        }

        container.innerHTML = filteredGroups.map(group => `
            <div class="link-group-section">
                <div class="group-title-mini">${group.name}</div>
                ${group.schedule.map((s, sIdx) => `
                    <div class="link-item-row">
                        <span class="day-time-label">${s.day} - ${s.time || '--:--'}</span>
                        <input type="text"
                               class="route-id-input link-id-input"
                               value="${s.linkId || ''}"
                               placeholder="ID المسار"
                               title="أدخل رقم المسار لربط الحصة بتعويضها (مثال: 1)"
                               data-group="${group.name}"
                               data-sidx="${sIdx}"
                               style="width: 75px; text-align: center; font-weight: bold; background: #1e1b4b; color: #c084fc; border: 1px solid #6b21a8; border-radius: 6px; padding: 4px 8px;">
                    </div>
                `).join('')}
            </div>
        `).join('');

        container.querySelectorAll('.route-id-input').forEach(input => {
            input.onchange = (e) => onInput(
                input.dataset.group, 
                parseInt(input.dataset.sidx), 
                e.target.value
            );
        });
    }
};
