window.HELP_IMPROVE_VIDEOJS = false;

const CASES_DATA_URL = 'static/data/vulnerability_cases.json?v=20260704-3';

let vulnerabilityCases = [];
let filteredCases = [];
let selectedCaseId = null;
const caseFilters = {
    search: '',
    firmware: '',
    category: '',
};
const SUMMARY_LABELS = [
    'Original expected observation',
    'Why this looks like a real logic issue',
    'Why this looks real after context check',
    'Why this survived the absence check',
    'Why this survived context check',
    'Why this survived the checks',
    'Why this survived checks',
    'This creates inconsistent semantics',
    'This is a logic/contract issue',
    'This is a logic/expectation mismatch',
    'Why this is a real logic issue',
    'Why this is a real issue',
    'Implementation mechanism',
    'Relevant evidence read',
    'Relevant code read',
    'Context/guard check',
    'Review evidence',
    'Code evidence read',
    'Evidence checked',
    'Observed behavior',
    'Expected behavior',
    'Trigger/input',
    'Verified code',
    'Evidence read',
    'Mechanism',
    'Rationale',
    'Evidence',
    'Example',
    'Impact',
    'Claim',
];

// More Works Dropdown Functionality
function toggleMoreWorks() {
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');

    if (!dropdown || !button) {
        return;
    }

    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.more-works-container');
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');

    if (container && dropdown && button && !container.contains(event.target)) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key !== 'Escape') {
        return;
    }

    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    if (dropdown && button) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');

    if (!bibtexElement || !button) {
        return;
    }

    const copyText = button.querySelector('.copy-text');
    const markCopied = function() {
        button.classList.add('copied');
        if (copyText) {
            copyText.textContent = 'Cop';
        }

        setTimeout(function() {
            button.classList.remove('copied');
            if (copyText) {
                copyText.textContent = 'Copy';
            }
        }, 2000);
    };

    navigator.clipboard.writeText(bibtexElement.textContent).then(markCopied).catch(function(err) {
        console.error('Failed to copy: ', err);
        const textArea = document.createElement('textarea');
        textArea.value = bibtexElement.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        markCopied();
    });
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (!scrollButton) {
        return;
    }

    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

// Video carousel autoplay when in view
function setupVideoCarouselAutoplay() {
    const carouselVideos = document.querySelectorAll('.results-carousel video');

    if (carouselVideos.length === 0 || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(e => {
                    console.log('Autoplay prevented:', e);
                });
            } else {
                video.pause();
            }
        });
    }, {
        threshold: 0.5
    });

    carouselVideos.forEach(video => {
        observer.observe(video);
    });
}

function initVulnerabilityCases() {
    const caseList = document.getElementById('cases-list');
    if (!caseList) {
        return;
    }

    fetch(CASES_DATA_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Unable to load ${CASES_DATA_URL}`);
            }
            return response.json();
        })
        .then(loadVulnerabilityCases)
        .catch(error => {
            console.error(error);
            setCaseStatus('Unable to load logic flaws. Please check the static data file.');
            caseList.replaceChildren(createEmptyMessage('Logic flaws could not be loaded.'));
        });
}

function loadVulnerabilityCases(data) {
    vulnerabilityCases = Array.isArray(data.cases) ? data.cases : [];
    filteredCases = vulnerabilityCases.slice();
    selectedCaseId = vulnerabilityCases[0] ? vulnerabilityCases[0].id : null;
    populateCaseStats(data);
    populateCaseFilters(vulnerabilityCases);
    bindCaseControls();
    renderCases();
}

function populateCaseStats(data) {
    setText('total-case-count', data.row_count || vulnerabilityCases.length);
    setText('ardupilot-case-count', (data.by_firmware && data.by_firmware.ArduPilot) || 0);
    setText('px4-case-count', (data.by_firmware && data.by_firmware.PX4) || 0);
}

function populateCaseFilters(cases) {
    const firmwareSelect = document.getElementById('firmware-filter');
    const categorySelect = document.getElementById('category-filter');
    const firmwareValues = uniqueSorted(cases.map(item => item.firmware).filter(Boolean));
    const categoryValues = uniqueSorted(cases.map(item => item.category || 'Unspecified'));

    populateSelect(firmwareSelect, firmwareValues, 'All firmware');
    populateSelect(categorySelect, categoryValues, 'All categories');
}

function bindCaseControls() {
    const searchInput = document.getElementById('case-search');
    const firmwareSelect = document.getElementById('firmware-filter');
    const categorySelect = document.getElementById('category-filter');
    const clearButton = document.getElementById('clear-case-filters');

    if (searchInput) {
        searchInput.addEventListener('input', function(event) {
            caseFilters.search = event.target.value.trim().toLowerCase();
            applyCaseFilters();
        });
    }

    if (firmwareSelect) {
        firmwareSelect.addEventListener('change', function(event) {
            caseFilters.firmware = event.target.value;
            applyCaseFilters();
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', function(event) {
            caseFilters.category = event.target.value;
            applyCaseFilters();
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', function() {
            caseFilters.search = '';
            caseFilters.firmware = '';
            caseFilters.category = '';

            if (searchInput) searchInput.value = '';
            if (firmwareSelect) firmwareSelect.value = '';
            if (categorySelect) categorySelect.value = '';

            applyCaseFilters();
        });
    }

}

function applyCaseFilters() {
    const searchTerms = caseFilters.search.split(/\s+/).filter(Boolean);

    filteredCases = vulnerabilityCases.filter(item => {
        const category = item.category || 'Unspecified';
        const matchesFirmware = !caseFilters.firmware || item.firmware === caseFilters.firmware;
        const matchesCategory = !caseFilters.category || category === caseFilters.category;
        const haystack = [
            item.firmware,
            item.mav_cmd,
            item.category,
            item.title,
            item.observation_summary,
        ].join(' ').toLowerCase();
        const matchesSearch = searchTerms.every(term => haystack.includes(term));

        return matchesFirmware && matchesCategory && matchesSearch;
    });

    renderCases();
}

function renderCases() {
    const caseList = document.getElementById('cases-list');
    if (!caseList) {
        return;
    }

    if (filteredCases.length === 0) {
        caseList.replaceChildren(createEmptyMessage('No logic flaws match the current filters.'));
        renderCaseDetail(null);
        setCaseStatus(`Showing 0 of ${vulnerabilityCases.length} logic flaws`);
        return;
    }

    if (!filteredCases.some(item => item.id === selectedCaseId)) {
        selectedCaseId = filteredCases[0].id;
    }

    const fragment = document.createDocumentFragment();
    filteredCases.forEach(item => {
        fragment.appendChild(createCaseListItem(item));
    });

    caseList.replaceChildren(fragment);
    renderCaseDetail(filteredCases.find(item => item.id === selectedCaseId));
    setCaseStatus(`Showing ${filteredCases.length} of ${vulnerabilityCases.length} logic flaws`);
}

function createCaseListItem(item) {
    const button = document.createElement('button');
    button.className = 'case-list-item';
    button.type = 'button';
    button.setAttribute('aria-pressed', item.id === selectedCaseId ? 'true' : 'false');
    if (item.id === selectedCaseId) {
        button.classList.add('is-active');
    }

    const header = document.createElement('span');
    header.className = 'case-list-header';
    header.appendChild(createMetaTag(item.firmware));
    header.appendChild(createMetaTag(item.mav_cmd));

    const title = document.createElement('strong');
    title.className = 'case-list-title';
    title.textContent = item.title || `Case ${item.id}`;

    const category = document.createElement('span');
    category.className = 'case-list-category';
    category.textContent = item.category || 'Unspecified';

    const preview = document.createElement('span');
    preview.className = 'case-list-preview';
    preview.textContent = truncate(item.observation_summary || '', 180);

    button.append(header, title, category, preview);
    button.addEventListener('click', function() {
        selectedCaseId = item.id;
        renderCases();
    });

    return button;
}

function renderCaseDetail(item) {
    const panel = document.getElementById('case-detail-panel');
    if (!panel) {
        return;
    }

    if (!item) {
        panel.replaceChildren(createCaseDetailPlaceholder('No logic flaw matches the current filters.'));
        return;
    }

    const meta = document.createElement('div');
    meta.className = 'case-detail-meta';
    meta.append(
        createMetaTag(item.firmware),
        createMetaTag(item.mav_cmd),
        createMetaTag(item.category || 'Unspecified')
    );

    const title = document.createElement('h3');
    title.className = 'case-detail-title';
    title.textContent = item.title || `Case ${item.id}`;

    const summaryHeading = document.createElement('h4');
    summaryHeading.className = 'case-detail-heading';
    summaryHeading.textContent = 'Observation Summary';

    const summary = createStructuredSummary(item.observation_summary || 'No observation summary provided.');

    panel.replaceChildren(meta, title, summaryHeading, summary);
}

function createStructuredSummary(value) {
    const summary = document.createElement('div');
    summary.className = 'case-detail-summary';

    parseSummarySections(value).forEach(section => {
        const sectionElement = document.createElement('section');
        sectionElement.className = 'case-summary-section';

        if (section.label) {
            const heading = document.createElement('h5');
            heading.className = 'case-summary-label';
            heading.textContent = section.label;
            sectionElement.appendChild(heading);
        }

        const body = document.createElement('div');
        body.className = 'case-summary-body';
        renderMarkdownishContent(section.content, body);
        sectionElement.appendChild(body);
        summary.appendChild(sectionElement);
    });

    return summary;
}

function parseSummarySections(value) {
    const text = String(value || '').trim();
    if (!text) {
        return [{ label: '', content: 'No observation summary provided.' }];
    }

    const labelPattern = SUMMARY_LABELS
        .slice()
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|');
    const labelRegex = new RegExp(`(^|\\s)(${labelPattern}):\\s*`, 'g');
    const matches = [];
    let match;

    while ((match = labelRegex.exec(text)) !== null) {
        matches.push({
            label: match[2],
            labelStart: match.index + match[1].length,
            contentStart: labelRegex.lastIndex,
        });
    }

    if (matches.length === 0) {
        return [{ label: '', content: text }];
    }

    const sections = [];
    if (matches[0].labelStart > 0) {
        sections.push({
            label: '',
            content: text.slice(0, matches[0].labelStart).trim(),
        });
    }

    matches.forEach((current, index) => {
        const next = matches[index + 1];
        const contentEnd = next ? next.labelStart : text.length;
        const content = text.slice(current.contentStart, contentEnd).trim();
        if (content) {
            sections.push({ label: current.label, content });
        }
    });

    return sections.length ? sections : [{ label: '', content: text }];
}

function renderMarkdownishContent(value, container) {
    const text = String(value || '').trim();
    if (!text) {
        return;
    }

    const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        appendTextContent(text.slice(lastIndex, match.index), container);
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        if (match[1]) {
            code.className = `language-${match[1]}`;
        }
        code.textContent = match[2].trim();
        pre.appendChild(code);
        container.appendChild(pre);
        lastIndex = codeBlockRegex.lastIndex;
    }

    appendTextContent(text.slice(lastIndex), container);
}

function appendTextContent(value, container) {
    const normalized = String(value || '')
        .replace(/\s+-\s+/g, '\n- ')
        .replace(/[ \t]+/g, ' ')
        .trim();

    if (!normalized) {
        return;
    }

    const lines = normalized.split(/\n+/).map(line => line.trim()).filter(Boolean);
    let list = null;

    lines.forEach(line => {
        if (line.startsWith('- ')) {
            if (!list) {
                list = document.createElement('ul');
                container.appendChild(list);
            }
            const item = document.createElement('li');
            appendInlineMarkdown(line.slice(2).trim(), item);
            list.appendChild(item);
            return;
        }

        list = null;
        const paragraph = document.createElement('p');
        appendInlineMarkdown(line, paragraph);
        container.appendChild(paragraph);
    });
}

function appendInlineMarkdown(value, container) {
    const parts = String(value || '').split(/(`[^`]+`)/g);
    parts.forEach(part => {
        if (!part) {
            return;
        }

        if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) {
            const code = document.createElement('code');
            code.textContent = part.slice(1, -1);
            container.appendChild(code);
            return;
        }

        container.appendChild(document.createTextNode(part));
    });
}

function createCaseDetailPlaceholder(message) {
    const placeholder = document.createElement('div');
    placeholder.className = 'case-detail-placeholder';

    const icon = document.createElement('span');
    icon.className = 'artifact-icon';
    const iconInner = document.createElement('i');
    iconInner.className = 'fas fa-search';
    icon.appendChild(iconInner);

    const text = document.createElement('p');
    text.textContent = message;
    placeholder.append(icon, text);
    return placeholder;
}

function createMetaTag(text) {
    const tag = document.createElement('span');
    tag.className = 'case-meta-tag';
    tag.textContent = text || 'N/A';
    return tag;
}

function createEmptyMessage(message) {
    const element = document.createElement('p');
    element.className = 'case-empty-row';
    element.textContent = message;
    return element;
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function populateSelect(select, values, defaultLabel) {
    if (!select) {
        return;
    }

    const options = [createOption('', defaultLabel)];
    values.forEach(value => {
        options.push(createOption(value, value));
    });
    select.replaceChildren(...options);
}

function createOption(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
}

function uniqueSorted(values) {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function truncate(value, limit) {
    if (!value || value.length <= limit) {
        return value;
    }

    return `${value.slice(0, limit).trim()}...`;
}

function setCaseStatus(message) {
    setText('case-table-status', message);
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initVulnerabilityCases();

    var options = {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 5000,
    };

    try {
        if (window.bulmaCarousel) {
            bulmaCarousel.attach('.carousel', options);
        }

        if (window.bulmaSlider) {
            bulmaSlider.attach();
        }

        setupVideoCarouselAutoplay();
    } catch (error) {
        console.warn('Optional media controls could not be initialized.', error);
    }
});
