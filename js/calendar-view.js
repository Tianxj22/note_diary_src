/**
 * @file         js/calendar-view.js
 * @description  Note Diary — 日记日历视图：月历网格 + 日期筛选
 * @author       tianxj22
 * @created      2026-07-08
 * @version      1.0.0
 */

// ============================================================
// calendar-view.js — 日历视图
// ============================================================

(function () {
  var ND = window.ND;

  // ---- 状态初始化 ----
  ND.calendarYear = new Date().getFullYear();
  ND.calendarMonth = new Date().getMonth() + 1;
  ND.selectedDate = null;
  ND.notesByDate = {};
  ND.calendarDateField = 'created'; // 'created' | 'modified'

  var MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  var DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

  /**
   * 加载日历视图
   */
  function loadCalendar() {
    buildNotesByDate();
    renderCalendar(ND.calendarYear, ND.calendarMonth);
  }

  /**
   * 按日期分组笔记
   */
  function buildNotesByDate() {
    ND.notesByDate = {};
    var dateField = ND.calendarDateField || 'created';
    var timestampField = dateField === 'created' ? 'createdAt' : 'mtime';
    ND.notes.forEach(function (n) {
      var ts = n[timestampField] || n.createdAt;
      var d = new Date(ts);
      var dateStr = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
      if (!ND.notesByDate[dateStr]) ND.notesByDate[dateStr] = [];
      ND.notesByDate[dateStr].push(n);
    });
  }

  /**
   * 渲染月历
   * @param {number} year
   * @param {number} month - 1-12
   */
  function renderCalendar(year, month) {
    var grid = document.getElementById('calendar-grid');
    var label = document.getElementById('cal-month-label');
    if (!grid || !label) return;

    label.textContent = year + '年 ' + MONTH_NAMES[month - 1];
    grid.innerHTML = '';

    // 星期标题行
    DAY_LABELS.forEach(function (d) {
      var cell = document.createElement('div');
      cell.className = 'cal-day-header';
      cell.textContent = d;
      grid.appendChild(cell);
    });

    // 计算当月第一天是星期几（0=日）
    var firstDay = new Date(year, month - 1, 1).getDay();
    // 当月总天数
    var daysInMonth = new Date(year, month, 0).getDate();
    // 上个月总天数
    var prevMonthDays = new Date(year, month - 1, 0).getDate();

    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    // 填充上个月的空白格
    for (var i = firstDay - 1; i >= 0; i--) {
      var cell = document.createElement('div');
      cell.className = 'cal-day cal-other-month';
      cell.textContent = prevMonthDays - i;
      grid.appendChild(cell);
    }

    // 填充当月日期
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = year + '-' +
        String(month).padStart(2, '0') + '-' +
        String(day).padStart(2, '0');

      var cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = day;

      // 今天高亮
      if (dateStr === todayStr) {
        cell.classList.add('cal-today');
      }

      // 有笔记的日期加圆点
      if (ND.notesByDate[dateStr] && ND.notesByDate[dateStr].length > 0) {
        cell.classList.add('cal-has-notes');
        var count = ND.notesByDate[dateStr].length;
        var dot = document.createElement('span');
        dot.className = 'cal-dot';
        if (count > 1) dot.classList.add('cal-dot-multi');
        cell.appendChild(dot);
      }

      // 选中日期
      if (dateStr === ND.selectedDate) {
        cell.classList.add('cal-selected');
      }

      cell.addEventListener('click', function (d) {
        return function () { selectDate(d); };
      }(dateStr));

      grid.appendChild(cell);
    }
  }

  /**
   * 选择日期
   * @param {string} dateStr - YYYY-MM-DD
   */
  function selectDate(dateStr) {
    if (ND.selectedDate === dateStr) {
      ND.selectedDate = null;
    } else {
      ND.selectedDate = dateStr;
    }
    renderCalendar(ND.calendarYear, ND.calendarMonth);
    renderFilteredNotes(dateStr);
  }

  /**
   * 渲染选中日期的笔记列表
   * @param {string} dateStr
   */
  function renderFilteredNotes(dateStr) {
    var list = document.getElementById('calendar-notes-list');
    if (!list) return;

    list.innerHTML = '';
    if (!dateStr) {
      list.innerHTML = '<div class="empty">点击日期查看笔记</div>';
      return;
    }

    var notes = ND.notesByDate[dateStr] || [];
    if (notes.length === 0) {
      list.innerHTML = '<div class="empty">该日期无笔记</div>';
      return;
    }

    notes.forEach(function (n) {
      var item = document.createElement('div');
      item.className = 'note-item';

      var titleDiv = document.createElement('div');
      titleDiv.className = 'title';
      titleDiv.textContent = n.displayName;

      var metaDiv = document.createElement('div');
      metaDiv.className = 'meta';
      metaDiv.textContent = formatDate(n.mtime);

      item.appendChild(titleDiv);
      item.appendChild(metaDiv);

      item.addEventListener('click', function () {
        selectNote(n);
      });

      list.appendChild(item);
    });
  }

  /**
   * 月份导航
   * @param {number} delta
   */
  function navigateMonth(delta) {
    ND.calendarMonth += delta;
    if (ND.calendarMonth > 12) { ND.calendarMonth = 1; ND.calendarYear++; }
    if (ND.calendarMonth < 1) { ND.calendarMonth = 12; ND.calendarYear--; }
    renderCalendar(ND.calendarYear, ND.calendarMonth);
    if (ND.selectedDate) renderFilteredNotes(ND.selectedDate);
  }

  /**
   * 切换日期模式（创建时间/修改时间）
   */
  function toggleDateField() {
    ND.calendarDateField = ND.calendarDateField === 'created' ? 'modified' : 'created';
    var btn = document.getElementById('cal-date-mode');
    if (btn) btn.textContent = ND.calendarDateField === 'created' ? '📅创建时间' : '📅修改时间';
    buildNotesByDate();
    renderCalendar(ND.calendarYear, ND.calendarMonth);
    if (ND.selectedDate) {
      renderFilteredNotes(ND.selectedDate);
    }
  }

  // 暴露到 ND
  ND.loadCalendar = loadCalendar;
  ND.navigateMonth = navigateMonth;
  ND.toggleDateField = toggleDateField;

  // 绑定事件
  document.addEventListener('DOMContentLoaded', function () {
    var prevBtn = document.getElementById('cal-prev-month');
    var nextBtn = document.getElementById('cal-next-month');
    var modeBtn = document.getElementById('cal-date-mode');
    if (prevBtn) prevBtn.addEventListener('click', function () { ND.navigateMonth(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { ND.navigateMonth(1); });
    if (modeBtn) modeBtn.addEventListener('click', function () { ND.toggleDateField(); });
  });
})();
