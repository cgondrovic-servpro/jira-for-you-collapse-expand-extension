class JiraSwimlaneCollapser {
  constructor() {
    this.collapsedSections = new Set();
    this.priorityCache = new Map(); // Cache for priority data
    this.init();
  }

  async init() {
    await this.loadState();
    this.observePageChanges();
    setTimeout(() => this.processSwimlanes(), 500);
  }

  async fetchIssuePriority(issueKey) {
    // Check cache first
    if (this.priorityCache.has(issueKey)) {
      return this.priorityCache.get(issueKey);
    }

    try {
      const response = await fetch(`/rest/api/3/issue/${issueKey}?fields=priority`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const priorityData = {
        name: data.fields.priority?.name?.toLowerCase() || 'unknown',
        iconUrl: data.fields.priority?.iconUrl || null
      };

      // Cache the result
      this.priorityCache.set(issueKey, priorityData);
      return priorityData;
    } catch (error) {
      return null;
    }
  }

  extractIssueKey(item) {
    // Extract issue key from the link href (e.g., "/browse/SC-297")
    const link = item.querySelector('a[href*="/browse/"]');
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
      // Safari uses localStorage as fallback since it doesn't support extension storage in the same way
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
      subtree: true
    });
  }

  containsJiraContent(element) {
    if (!element.querySelector) return false;

    return element.matches('[data-testid*="global-pages.home"]') ||
           element.querySelector('[data-testid*="global-pages.home"]') ||
           element.querySelector('h3 span') ||
           element.querySelector('ul.css-d3qtv2');
  }

  async processSwimlanes() {
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

    // Priority mapping (Jira priority order)
    // Note: Jira instances can have custom priority names, so we map common ones
    const priorityOrder = {
      'highest': 1,
      'critical': 1,
      'blocker': 1,
      'high': 2,
      'major': 2,
      'medium': 3,
      'normal': 3,
      'low': 4,
      'minor': 4,
      'lowest': 5,
      'trivial': 5
    };

    // Fetch priorities for all items
    const itemsWithPriority = await Promise.all(items.map(async (item, index) => {
      const issueKey = this.extractIssueKey(item);
      let priority = 999; // Default for unknown priority
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

      // Store priority data on the element for later use
      item.dataset.priorityName = priorityName;
      item.dataset.priorityIconUrl = priorityIconUrl || '';
      item.dataset.priority = priority;

      return { item, priority, priorityName };
    }));

    // Sort by priority ascending (1 = highest priority first)
    itemsWithPriority.sort((a, b) => a.priority - b.priority);

    // Re-append items in sorted order
    itemsWithPriority.forEach(({ item }) => {
      section.itemsList.appendChild(item);
    });
  }

  addPriorityIcons(section) {
    if (!section.itemsList) return;

    const items = section.itemsList.querySelectorAll('li');

    items.forEach((item) => {
      // Check if we already added the priority icon
      if (item.querySelector('.jira-priority-icon-display')) {
        return;
      }

      // Find the type icon (the issue type image - Task, Subtask, etc.)
      const typeIcon = item.querySelector('img[alt]');
      if (!typeIcon) {
        return;
      }

      // Get priority data from dataset (set during sorting)
      const priorityIconUrl = item.dataset.priorityIconUrl;
      const priorityName = item.dataset.priorityName;

      if (!priorityIconUrl || priorityIconUrl === '') {
        return;
      }

      // Create the priority icon
      const priorityIcon = document.createElement('img');
      priorityIcon.src = priorityIconUrl;
      priorityIcon.alt = `Priority: ${priorityName}`;
      priorityIcon.title = `Priority: ${priorityName}`;
      priorityIcon.classList.add('jira-priority-icon-display');

      // Copy styling from type icon to match size
      const typeIconStyles = window.getComputedStyle(typeIcon);
      priorityIcon.style.width = typeIconStyles.width;
      priorityIcon.style.height = typeIconStyles.height;
      priorityIcon.style.marginRight = '4px';
      priorityIcon.style.verticalAlign = 'middle';
      priorityIcon.style.display = 'inline-block';
      priorityIcon.style.flexShrink = '0'; // Prevent icon from shrinking

      // Ensure the parent container displays children inline
      const parentDiv = typeIcon.parentNode;
      parentDiv.style.setProperty('display', 'flex', 'important');
      parentDiv.style.setProperty('align-items', 'center', 'important');
      parentDiv.style.setProperty('gap', '4px', 'important');
      parentDiv.style.setProperty('flex-shrink', '0', 'important');
      parentDiv.style.setProperty('margin-right', '32px', 'important'); // Add space after icon container

      // Make type icon not shrink
      typeIcon.style.flexShrink = '0';

      // Adjust the main link container
      const linkElement = item.querySelector('a');
      if (linkElement) {
        linkElement.style.setProperty('display', 'flex', 'important');
        linkElement.style.setProperty('align-items', 'center', 'important');
        linkElement.style.setProperty('flex-wrap', 'nowrap', 'important');
      }

      // Ensure text span can grow and handle overflow properly
      const textSpan = item.querySelector('span._16jlouyt');
      if (textSpan) {
        textSpan.style.setProperty('flex', '1 1 auto', 'important');
        textSpan.style.setProperty('min-width', '0', 'important');
        textSpan.style.setProperty('overflow', 'hidden', 'important');

        // Make sure the h4 inside can also shrink
        const h4 = textSpan.querySelector('h4');
        if (h4) {
          h4.style.setProperty('overflow', 'hidden', 'important');
          h4.style.setProperty('text-overflow', 'ellipsis', 'important');
          h4.style.setProperty('white-space', 'nowrap', 'important');
          h4.style.setProperty('display', 'block', 'important');
        }
      }

      // Ensure status badge doesn't shrink
      const statusSpan = item.querySelector('span.bu4bgh-2');
      if (statusSpan) {
        statusSpan.style.flexShrink = '0';
      }

      // Insert BEFORE the type icon
      parentDiv.insertBefore(priorityIcon, typeIcon);
    });
  }

  findStatusSections() {
    const sections = [];

    const mainContainer = document.querySelector('[data-testid="global-pages.home.common.ui.item-list.list"]');
    if (!mainContainer) {
      return sections;
    }

    const headerDivs = mainContainer.querySelectorAll('div:has(> h3)');
    headerDivs.forEach(headerDiv => {
      const h3 = headerDiv.querySelector('h3 span');
      if (h3) {
        const statusText = h3.textContent.trim();
        const nextElement = headerDiv.nextElementSibling;

        if (nextElement && nextElement.tagName === 'UL') {
          sections.push({
            headerDiv,
            statusText,
            itemsList: nextElement,
            h3
          });
        }
      }
    });

    if (sections.length === 0) {
      const allH3s = mainContainer.querySelectorAll('h3');
      allH3s.forEach(h3 => {
        const span = h3.querySelector('span');
        if (span) {
          const statusText = span.textContent.trim();
          let nextElement = h3.parentElement.nextElementSibling;

          while (nextElement && nextElement.tagName !== 'UL') {
            nextElement = nextElement.nextElementSibling;
          }

          if (nextElement && nextElement.tagName === 'UL') {
            sections.push({
              headerDiv: h3.parentElement,
              statusText,
              itemsList: nextElement,
              h3
            });
          }
        }
      });
    }

    return sections;
  }

  addCollapseControls(section) {
    if (section.headerDiv.querySelector('.jira-collapse-control')) return;

    const sectionId = this.generateSectionId(section.statusText);
    const isCollapsed = this.collapsedSections.has(sectionId);
    const itemCount = this.getItemCount(section);

    const control = this.createCollapseControl(sectionId, section.statusText, isCollapsed, itemCount);

    section.headerDiv.insertBefore(control, section.headerDiv.firstChild);

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
    const h3 = headerDiv.querySelector('h3 span');
    if (!h3) return null;

    const statusText = h3.textContent.trim();
    let nextElement = headerDiv.nextElementSibling;

    while (nextElement && nextElement.tagName !== 'UL') {
      nextElement = nextElement.nextElementSibling;
    }

    if (nextElement && nextElement.tagName === 'UL') {
      return {
        headerDiv,
        statusText,
        itemsList: nextElement,
        h3
      };
    }

    return null;
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
