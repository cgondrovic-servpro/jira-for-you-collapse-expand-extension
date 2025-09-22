class JiraSwimlaneCollapser {
  constructor() {
    this.collapsedSections = new Set();
    this.init();
  }

  async init() {
    await this.loadState();
    this.observePageChanges();
    setTimeout(() => this.processSwimlanes(), 500);
  }

  async loadState() {
    try {
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      const result = await storage.local.get(['collapsedSections']);
      this.collapsedSections = new Set(result.collapsedSections || []);
    } catch (error) {
      console.log('Error loading state:', error);
    }
  }

  async saveState() {
    try {
      const storage = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
      await storage.local.set({
        collapsedSections: Array.from(this.collapsedSections)
      });
    } catch (error) {
      console.log('Error saving state:', error);
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

  processSwimlanes() {
    const sections = this.findStatusSections();
    console.log('Found sections:', sections.length);

    sections.forEach(section => {
      this.addCollapseControls(section);
      this.updateItemCount(section);
    });
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

  findStatusSections() {
    const sections = [];

    const mainContainer = document.querySelector('[data-testid="global-pages.home.common.ui.item-list.list"]');
    if (!mainContainer) {
      console.log('Main container not found');
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