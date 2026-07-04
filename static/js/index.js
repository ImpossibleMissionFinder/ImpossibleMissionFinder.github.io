window.HELP_IMPROVE_VIDEOJS = false;

const CASES_DATA_URL = 'static/data/vulnerability_cases.json';

let vulnerabilityCases = [];
let filteredCases = [];
let selectedCaseId = null;
const caseFilters = {
    search: '',
    firmware: '',
    category: '',
};

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

    const inlineData = readInlineCasesData();
    if (inlineData) {
        loadVulnerabilityCases(inlineData);
        return;
    }

    if (window.VULNERABILITY_CASES_DATA) {
        loadVulnerabilityCases(window.VULNERABILITY_CASES_DATA);
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
            setCaseStatus('Unable to load vulnerability cases. Please check the embedded data or static data file.');
            caseList.replaceChildren(createEmptyMessage('Vulnerability cases could not be loaded.'));
        });
}

function readInlineCasesData() {
    const inlineData = document.getElementById('vulnerability-cases-data');
    if (!inlineData || !inlineData.textContent.trim()) {
        return null;
    }

    try {
        return JSON.parse(inlineData.textContent);
    } catch (error) {
        console.error('Unable to parse embedded vulnerability cases data.', error);
        return null;
    }
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
            item.subcategory,
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
        caseList.replaceChildren(createEmptyMessage('No cases match the current filters.'));
        renderCaseDetail(null);
        setCaseStatus(`Showing 0 of ${vulnerabilityCases.length} cases`);
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
    setCaseStatus(`Showing ${filteredCases.length} of ${vulnerabilityCases.length} cases`);
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
    category.textContent = [item.category || 'Unspecified', item.subcategory || 'Unspecified'].join(' / ');

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
        panel.replaceChildren(createCaseDetailPlaceholder('No case matches the current filters.'));
        return;
    }

    const meta = document.createElement('div');
    meta.className = 'case-detail-meta';
    meta.append(
        createMetaTag(item.firmware),
        createMetaTag(item.mav_cmd),
        createMetaTag(item.category || 'Unspecified'),
        createMetaTag(item.subcategory || 'Unspecified')
    );

    const title = document.createElement('h3');
    title.className = 'case-detail-title';
    title.textContent = item.title || `Case ${item.id}`;

    const summaryHeading = document.createElement('h4');
    summaryHeading.className = 'case-detail-heading';
    summaryHeading.textContent = 'Observation Summary';

    const summary = document.createElement('div');
    summary.className = 'case-detail-summary';
    summary.textContent = item.observation_summary || 'No observation summary provided.';

    panel.replaceChildren(meta, title, summaryHeading, summary);
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

function createEmptyRow(message) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'case-empty-row';
    cell.textContent = message;
    row.appendChild(cell);
    return row;
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
    var options = {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 5000,
    };

    if (window.bulmaCarousel) {
        bulmaCarousel.attach('.carousel', options);
    }

    if (window.bulmaSlider) {
        bulmaSlider.attach();
    }

    setupVideoCarouselAutoplay();
    initVulnerabilityCases();
});
