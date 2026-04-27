class JiraSwimlaneCollapser {
  constructor() {
    this.collapsedSections = new Set();
    this.priorityCache = new Map(); // Cache for priority data
    this.isActive = false; // Track if we're on the assigned tab
    this.init();
  }

  async init() {
    await this.waitForTab();
    await this.loadState();
    this.observePageChanges();
    this.observeTabChanges();
    if (this.isAssignedToMeTab()) {
      this.scheduleProcessSwimlanesRetries();
    }
  }

  /** Initial paint is often after document_end; retry a few times if lists are not mounted yet. */
  scheduleProcessSwimlanesRetries() {
    const delays = [0, 400, 1200, 3000];
    delays.forEach((ms) => {
      setTimeout(() => {
        if (this.isAssignedToMeTab()) {
          this.processSwimlanes();
        }
      }, ms);
    });
  }

  /**
   * The element that carries aria-selected for "Assigned to me". In current Jira the
   * data-testid lives on a div *inside* the tab button, so we must use closest('[role="tab"]').
   */
  getAssignedTabButton() {
    const byAria = document.querySelector(
      'button[aria-controls="assigned-tab-panel"][role="tab"]'
    );
    if (byAria) {
      return byAria;
    }
    const byAriaLoose = document.querySelector('button[aria-controls="assigned-tab-panel"]');
    if (byAriaLoose) {
      return byAriaLoose;
    }
    const legacy = document.getElementById('your-work-page-tabs-2');
    if (legacy) {
      return legacy;
    }
    const label = document.querySelector(
      '[data-testid="global-pages.home.ui.tab-container.navigation.item.assigned"]'
    );
    if (label) {
      return label.closest('[role="tab"]') || label.closest('button');
    }
    return null;
  }

  async waitForTab() {
    for (let i = 0; i < 50; i++) {
      if (this.getAssignedTabButton() || document.getElementById('assigned-tab-panel')) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  isAssignedToMeTab() {
    const tab = this.getAssignedTabButton();
    if (!tab) {
      return false;
    }
    return tab.getAttribute('aria-selected') === 'true';
  }

  observeTabChanges() {
    const observer = new MutationObserver(() => {
      const wasActive = this.isActive;
      const isActive = this.isAssignedToMeTab();

      if (!wasActive && isActive) {
        this.isActive = true;
        setTimeout(() => this.processSwimlanes(), 200);
      } else if (wasActive && !isActive) {
        this.isActive = false;
      }
    });

    const assignedTab = this.getAssignedTabButton();
    if (assignedTab) {
      observer.observe(assignedTab, {
        attributes: true,
        attributeFilter: ['aria-selected'],
      });
    }

    const tablist = document.querySelector('[role="tablist"]');
    if (tablist) {
      observer.observe(tablist, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-selected'],
      });
    }

    this.isActive = this.isAssignedToMeTab();
  }

  async fetchIssuePriority(issueKey) {
    if (this.priorityCache.has(issueKey)) {
      return this.priorityCache.get(issueKey);
    }

    try {
      const response = await fetch(`/rest/api/3/issue/${issueKey}?fields=priority`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const priorityData = {
        name: data.fields.priority?.name?.toLowerCase() || 'unknown',
        iconUrl: data.fields.priority?.iconUrl || null,
      };

      this.priorityCache.set(issueKey, priorityData);
      return priorityData;
    } catch (error) {
      return null;
    }
  }

  extractIssueKey(item) {
    const link =
      item.querySelector('a[href*="/browse/"]:not([aria-hidden="true"])') ||
      item.querySelector('a[href*="/browse/"]');
    if (link) {
      const match = link.href.match(/\/browse\/([A-Z]+-\d+)/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  async loadState() {
    try {
      const stored = localStorage.getItem('jira-collapsed-sections');
      this.collapsedSections = new Set(stored ? JSON.parse(stored) : []);
    } catch (error) {
      // Silently fail
    }
  }

  async saveState() {
    try {
      localStorage.setItem('jira-collapsed-sections', JSON.stringify(Array.from(this.collapsedSections)));
    } catch (error) {
      // Silently fail
    }
  }

  observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      if (!this.isAssignedToMeTab()) {
        return;
      }

      let shouldProcess = false;
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && this.containsJiraContent(node)) {
              shouldProcess = true;
            }
          });
        }
      });

      if (shouldProcess) {
        setTimeout(() => this.processSwimlanes(), 200);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setInterval(() => {
      const isActive = this.isAssignedToMeTab();
      if (isActive !== this.isActive) {
        this.isActive = isActive;
        if (isActive) {
          setTimeout(() => this.processSwimlanes(), 200);
        }
      }
    }, 1000);
  }

  containsJiraContent(element) {
    if (!element.querySelector) return false;

    return (
      element.matches('[data-testid*="global-pages.home"]') ||
      element.querySelector('[data-testid*="global-pages.home"]') ||
      element.querySelector('h3 span') ||
      element.querySelector('ul.css-d3qtv2') ||
      element.matches('ul[data-testid="home-list-ui"]') ||
      element.querySelector('ul[data-testid="home-list-ui"]')
    );
  }

  async processSwimlanes() {
    if (!this.isAssignedToMeTab()) {
      return;
    }

    const sections = this.findStatusSections();

    for (const section of sections) {
      await this.sortItemsByPriority(section);
      this.addPriorityIcons(section);
      this.addCollapseControls(section);
      this.updateItemCount(section);
    }
  }

  updateItemCount(section) {
    const control = section.headerDiv.querySelector('.jira-collapse-control');
    if (!control) return;

    const countSpan = control.querySelector('.jira-collapse-count');
    if (countSpan) {
      const itemCount = this.getItemCount(section);
      countSpan.textContent = `(${itemCount})`;
    }
  }

  async sortItemsByPriority(section) {
    if (!section.itemsList) return;

    const items = Array.from(section.itemsList.querySelectorAll('li'));
    if (items.length === 0) return;

    const priorityOrder = {
      highest: 1,
      critical: 1,
      blocker: 1,
      high: 2,
      major: 2,
      medium: 3,
      normal: 3,
      low: 4,
      minor: 4,
      lowest: 5,
      trivial: 5,
    };

    const itemsWithPriority = await Promise.all(
      items.map(async (item) => {
        const issueKey = this.extractIssueKey(item);
        let priority = 999;
        let priorityName = 'unknown';
        let priorityIconUrl = null;

        if (issueKey) {
          const priorityData = await this.fetchIssuePriority(issueKey);
          if (priorityData) {
            priorityName = priorityData.name;
            priority = priorityOrder[priorityName] || 999;
            priorityIconUrl = priorityData.iconUrl;
          }
        }

        item.dataset.priorityName = priorityName;
        item.dataset.priorityIconUrl = priorityIconUrl || '';
        item.dataset.priority = priority;

        return { item, priority, priorityName };
      })
    );

    itemsWithPriority.sort((a, b) => a.priority - b.priority);

    itemsWithPriority.forEach(({ item }) => {
      section.itemsList.appendChild(item);
    });
  }

  getMainListContainer() {
    const sel = '[data-testid="global-pages.home.common.ui.item-list.list"]';
    let el = document.querySelector(sel);
    if (el) {
      return el;
    }
    const panel = document.getElementById('assigned-tab-panel');
    if (panel) {
      el = panel.querySelector(sel);
      if (el) {
        return el;
      }
      el = panel.querySelector('[data-testid*="item-list.list"]');
      if (el) {
        return el;
      }
    }
    return null;
  }

  getSectionStatusText(headerDiv) {
    const h3span = headerDiv.querySelector('h3 span');
    if (h3span) {
      return h3span.textContent.trim();
    }
    for (const child of headerDiv.children) {
      if (child.classList?.contains('jira-collapse-control')) {
        continue;
      }
      if (child.tagName === 'H3') {
        const s = child.querySelector('span');
        if (s) return s.textContent.trim();
      }
      if (child.tagName === 'SPAN') {
        const t = child.textContent.trim();
        if (t) return t;
      }
    }
    const sp = headerDiv.querySelector('span');
    return sp ? sp.textContent.trim() : '';
  }

  getSectionTitleLabelElement(headerDiv) {
    const h3 = headerDiv.querySelector('h3');
    if (h3) {
      return h3.querySelector('span') || h3;
    }
    for (const child of headerDiv.children) {
      if (child.classList?.contains('jira-collapse-control')) {
        continue;
      }
      if (child.tagName === 'SPAN') {
        return child;
      }
    }
    return null;
  }

  findItemsListFromHeader(headerDiv, mainContainer) {
    if (!mainContainer || !headerDiv || !mainContainer.contains(headerDiv)) {
      return null;
    }
    const next = headerDiv.nextElementSibling;
    if (!next) {
      return null;
    }
    if (next.tagName === 'UL') {
      return next;
    }
    return (
      next.querySelector('ul[data-testid="home-list-ui"]') || next.querySelector('ul')
    );
  }

  addPriorityIcons(section) {
    if (!section.itemsList) return;

    const items = section.itemsList.querySelectorAll('li');

    items.forEach((item) => {
      if (item.querySelector('.jira-priority-icon-display')) {
        return;
      }

      const typeIcon = item.querySelector('img[alt]');
      if (!typeIcon) {
        return;
      }

      const priorityIconUrl = item.dataset.priorityIconUrl;
      const priorityName = item.dataset.priorityName;

      if (!priorityIconUrl || priorityIconUrl === '') {
        return;
      }

      const priorityIcon = document.createElement('img');
      priorityIcon.src = priorityIconUrl;
      priorityIcon.alt = `Priority: ${priorityName}`;
      priorityIcon.title = `Priority: ${priorityName}`;
      priorityIcon.classList.add('jira-priority-icon-display');

      const typeIconStyles = window.getComputedStyle(typeIcon);
      priorityIcon.style.width = typeIconStyles.width;
      priorityIcon.style.height = typeIconStyles.height;
      priorityIcon.style.setProperty('margin-inline-end', '12px', 'important');
      priorityIcon.style.setProperty('margin-right', '12px', 'important');
      priorityIcon.style.verticalAlign = 'middle';
      priorityIcon.style.setProperty('display', 'inline-block', 'important');
      priorityIcon.style.setProperty('flex-shrink', '0', 'important');

      const parentDiv = typeIcon.parentNode;
      parentDiv.classList.add('jira-issue-icons-cluster');
      parentDiv.style.setProperty('display', 'flex', 'important');
      parentDiv.style.setProperty('flex-direction', 'row', 'important');
      parentDiv.style.setProperty('align-items', 'center', 'important');
      parentDiv.style.setProperty('justify-content', 'flex-start', 'important');
      parentDiv.style.setProperty('gap', '12px', 'important');
      parentDiv.style.setProperty('column-gap', '12px', 'important');
      parentDiv.style.setProperty('padding', '2px 8px', 'important');
      parentDiv.style.setProperty('box-sizing', 'border-box', 'important');
      parentDiv.style.setProperty('width', 'max-content', 'important');
      parentDiv.style.setProperty('max-width', 'none', 'important');
      parentDiv.style.setProperty('min-width', 'max-content', 'important');
      parentDiv.style.setProperty('overflow', 'visible', 'important');
      parentDiv.style.setProperty('overflow-x', 'visible', 'important');
      parentDiv.style.setProperty('flex', '0 0 auto', 'important');
      parentDiv.style.setProperty('flex-shrink', '0', 'important');
      parentDiv.style.setProperty('margin-right', '32px', 'important');

      let ancestor = parentDiv.parentElement;
      for (let d = 0; d < 2 && ancestor && ancestor !== item; d++) {
        if (ancestor.nodeType === Node.ELEMENT_NODE) {
          ancestor.style.setProperty('overflow', 'visible', 'important');
          ancestor.style.setProperty('overflow-x', 'visible', 'important');
          ancestor.style.setProperty('max-width', 'none', 'important');
        }
        ancestor = ancestor.parentElement;
      }

      typeIcon.style.setProperty('flex-shrink', '0', 'important');

      const mainLink =
        item.querySelector('a[href*="/browse/"]:not([aria-hidden="true"])') ||
        item.querySelector('a[href*="/browse/"]');
      if (mainLink) {
        const linkCol = mainLink.parentElement;
        if (linkCol) {
          linkCol.style.setProperty('flex', '1 1 auto', 'important');
          linkCol.style.setProperty('min-width', '0', 'important');
        }
        const titleInner = mainLink.querySelector('span') || mainLink;
        titleInner.classList.add('jira-for-you-item-title');
        titleInner.style.setProperty('overflow', 'hidden', 'important');
        titleInner.style.setProperty('text-overflow', 'ellipsis', 'important');
        titleInner.style.setProperty('white-space', 'nowrap', 'important');
        titleInner.style.setProperty('display', 'block', 'important');
      }

      const rowCols = item.querySelectorAll(':scope > div');
      if (rowCols.length) {
        rowCols[rowCols.length - 1].style.setProperty('flex-shrink', '0', 'important');
      }

      parentDiv.insertBefore(priorityIcon, typeIcon);
    });
  }

  findStatusSections() {
    const mainContainer = this.getMainListContainer();
    if (!mainContainer) {
      return [];
    }

    const byList = new Map();

    const addSection = (headerDiv, itemsList, statusText) => {
      if (!headerDiv || !itemsList || !statusText) {
        return;
      }
      if (byList.has(itemsList)) {
        return;
      }
      byList.set(itemsList, { headerDiv, statusText, itemsList });
    };

    mainContainer.querySelectorAll('ul[data-testid="home-list-ui"]').forEach((ul) => {
      let el = ul;
      while (el && el.parentElement && el.parentElement !== mainContainer) {
        el = el.parentElement;
      }
      if (!el || el.parentElement !== mainContainer) {
        return;
      }
      const headerDiv = el.previousElementSibling;
      if (!headerDiv) {
        return;
      }
      const statusText = this.getSectionStatusText(headerDiv);
      if (statusText) {
        addSection(headerDiv, ul, statusText);
      }
    });

    if (byList.size === 0) {
      const headerDivs = mainContainer.querySelectorAll('div:has(> h3)');
      headerDivs.forEach((headerDiv) => {
        const h3 = headerDiv.querySelector('h3 span');
        if (h3) {
          const statusText = h3.textContent.trim();
          const nextElement = headerDiv.nextElementSibling;
          if (nextElement && nextElement.tagName === 'UL') {
            addSection(headerDiv, nextElement, statusText);
          }
        }
      });
    }

    if (byList.size === 0) {
      mainContainer.querySelectorAll('h3').forEach((h3) => {
        const span = h3.querySelector('span');
        if (span) {
          const statusText = span.textContent.trim();
          let nextElement = h3.parentElement.nextElementSibling;
          while (nextElement && nextElement.tagName !== 'UL') {
            nextElement = nextElement.nextElementSibling;
          }
          if (nextElement && nextElement.tagName === 'UL') {
            addSection(h3.parentElement, nextElement, statusText);
          }
        }
      });
    }

    return Array.from(byList.values());
  }

  addCollapseControls(section) {
    if (section.headerDiv.querySelector('.jira-collapse-control')) {
      return;
    }

    const headerDiv = section.headerDiv;
    if (!headerDiv.classList.contains('jira-section-header')) {
      headerDiv.classList.add('jira-section-header');
    }
    const labelEl = this.getSectionTitleLabelElement(headerDiv);
    if (labelEl) {
      labelEl.classList.add('jira-for-you-section-label');
    }

    const sectionId = this.generateSectionId(section.statusText);
    const isCollapsed = this.collapsedSections.has(sectionId);
    const itemCount = this.getItemCount(section);

    const control = this.createCollapseControl(sectionId, section.statusText, isCollapsed, itemCount);

    headerDiv.insertBefore(control, headerDiv.firstChild);

    this.applyCollapseState(section, isCollapsed);
  }

  createCollapseControl(sectionId, statusText, isCollapsed, itemCount) {
    const control = document.createElement('div');
    control.className = 'jira-collapse-control';
    control.setAttribute('data-section-id', sectionId);

    const button = document.createElement('button');
    button.className = 'jira-collapse-button';
    button.innerHTML = `
      <span class="jira-collapse-icon">${isCollapsed ? '▶' : '▼'}</span>
      <span class="jira-collapse-text">${isCollapsed ? 'Expand' : 'Collapse'} ${statusText}</span>
      <span class="jira-collapse-count">(${itemCount})</span>
    `;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleSection(sectionId);
    });

    control.appendChild(button);
    return control;
  }

  getItemCount(section) {
    if (!section.itemsList) return 0;
    return section.itemsList.querySelectorAll('li').length;
  }

  generateSectionId(statusText) {
    return statusText.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  toggleSection(sectionId) {
    const control = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!control) return;

    const section = this.findSectionForControl(control);
    if (!section) return;

    const isCurrentlyCollapsed = this.collapsedSections.has(sectionId);
    const newCollapsedState = !isCurrentlyCollapsed;

    if (newCollapsedState) {
      this.collapsedSections.add(sectionId);
    } else {
      this.collapsedSections.delete(sectionId);
    }

    this.applyCollapseState(section, newCollapsedState);
    this.updateControlAppearance(control, newCollapsedState);
    this.saveState();
  }

  findSectionForControl(control) {
    const headerDiv = control.parentElement;
    if (!headerDiv) return null;

    const mainContainer = this.getMainListContainer();
    if (!mainContainer) return null;

    const statusText = this.getSectionStatusText(headerDiv);
    if (!statusText) return null;

    const itemsList = this.findItemsListFromHeader(headerDiv, mainContainer);
    if (!itemsList) {
      return null;
    }

    return {
      headerDiv,
      statusText,
      itemsList,
    };
  }

  applyCollapseState(section, isCollapsed) {
    if (section.itemsList) {
      section.itemsList.style.display = isCollapsed ? 'none' : '';
    }

    section.headerDiv.classList.toggle('jira-collapsed', isCollapsed);
  }

  updateControlAppearance(control, isCollapsed) {
    const icon = control.querySelector('.jira-collapse-icon');
    const text = control.querySelector('.jira-collapse-text');

    if (icon) {
      icon.textContent = isCollapsed ? '▶' : '▼';
    }

    if (text) {
      const statusText = text.textContent.replace(/^(Expand|Collapse)\s/, '');
      text.textContent = `${isCollapsed ? 'Expand' : 'Collapse'} ${statusText}`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new JiraSwimlaneCollapser();
  });
} else {
  new JiraSwimlaneCollapser();
}
