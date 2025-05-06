// Global variables
let fullDataset = []; // Will store all CSV data
let uniqueCompanies = []; // Will store unique company names
let priceChart = null; // Chart.js instance for price chart
let volumeChart = null; // Chart.js instance for volume chart
let metricsChart = null; // Chart.js instance for metrics chart
let currentChartType = 'line'; // Default chart type
let selectedCompany = null; // Currently selected company
let currentPage = 1; // Current page for data table pagination
let rowsPerPage = 50; // Number of rows per page in data table

// Required CSV headers and their data types
const REQUIRED_HEADERS = [
    'index_name', 'index_date', 'open_index_value', 'high_index_value',
    'low_index_value', 'closing_index_value'
];

// Optional headers (that might be missing for some companies)
const OPTIONAL_HEADERS = [
    'points_change', 'change_percent', 'volume', 
    'turnover_rs_cr', 'pe_ratio', 'pb_ratio', 'div_yield'
];

// DOM elements
const companyList = document.getElementById('company-list');
const companySearch = document.getElementById('company-search');
const selectedCompanyElement = document.getElementById('selected-company');
const dateRangeForm = document.getElementById('date-range-form');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const errorMessage = document.getElementById('error-message');
const dataTableBody = document.getElementById('data-table-body');
const lineBtn = document.getElementById('line-btn');
const candlestickBtn = document.getElementById('candlestick-btn');

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Initialize the application
 */
function initApp() {
    // Check if required libraries are loaded
    if (typeof Papa === 'undefined') {
        showError('PapaParse library not loaded. Please check your internet connection.');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        showError('Chart.js library not loaded. Please check your internet connection.');
        return;
    }
    
    // Add missing CSS for message types and pagination if they don't exist
    addRequiredStyles();
    
    // Load and process the CSV data
    loadCSVData();
    
    // Set up event listeners
    setupEventListeners();
}

/**
 * Add required CSS styles if they don't exist already
 */
function addRequiredStyles() {
    // Check if styles already exist
    if (document.querySelector('style#dynamic-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'dynamic-styles';
    style.textContent = `
        /* Message types */
        .error-message, .success-message, .info-message, .warning-message {
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
            display: none;
        }
        
        .error-message.visible, .success-message.visible, .info-message.visible, .warning-message.visible {
            display: block;
        }
        
        .error-message {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .success-message {
            background-color: #d4edda;
            color: #155724;
        }
        
        .info-message {
            background-color: #d1ecf1;
            color: #0c5460;
        }
        
        .warning-message {
            background-color: #fff3cd;
            color: #856404;
        }
        
        /* Pagination styles */
        .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1rem;
            padding: 0.5rem;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
        
        .pagination-info {
            font-size: 0.9rem;
            color: #6c757d;
        }
        
        .pagination-controls {
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        
        .page-display {
            font-size: 0.9rem;
        }
        
        /* Data summary */
        .data-summary {
            background-color: #f8f9fa;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
            font-size: 0.9rem;
            color: #2c3e50;
        }
        
        /* No data placeholder */
        .no-data-placeholder {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            background-color: #f8f9fa;
            color: #6c757d;
            font-style: italic;
            border-radius: 4px;
        }
        
        /* Data completeness indicator */
        .data-completeness {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            padding: 0.5rem;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
        
        .data-field {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .completeness-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        
        .complete {
            background-color: #28a745;
        }
        
        .partial {
            background-color: #ffc107;
        }
        
        .missing {
            background-color: #dc3545;
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Load and process CSV data
 */
function loadCSVData() {
    // Show loading state
    companyList.innerHTML = '<div class="loading">Loading companies...</div>';
    showMessage('Loading data, please wait...', 'info');
    
    // Fetch the CSV file
    fetch('dump.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch CSV file. Status: ' + response.status);
            }
            return response.text();
        })
        .then(csvText => {
            // Parse CSV using PapaParse
            const parseResult = Papa.parse(csvText, {
                header: true,
                dynamicTyping: true, // Auto-convert numbers
                skipEmptyLines: true,
                complete: processCSVData,
                error: (error) => {
                    showError('Error parsing CSV data: ' + error.message);
                }
            });
        })
        .catch(error => {
            showError('Error loading CSV file: ' + error.message);
        });
}

/**
 * Process the parsed CSV data
 * @param {Object} results - PapaParse results object
 */
function processCSVData(results) {
    console.log('CSV data loaded:', results);
    
    // Check if we have valid data
    if (!results || !results.data || !Array.isArray(results.data)) {
        showError('Invalid CSV data structure.');
        return;
    }
    
    // Verify required headers exist
    const missingRequiredHeaders = REQUIRED_HEADERS.filter(header => 
        !results.meta.fields.includes(header)
    );
    
    if (missingRequiredHeaders.length > 0) {
        showError(`Missing required CSV headers: ${missingRequiredHeaders.join(', ')}. Expected headers: ${REQUIRED_HEADERS.join(', ')}`);
        console.error('Available headers:', results.meta.fields);
        return;
    }
    
    // Check for optional headers
    const missingOptionalHeaders = OPTIONAL_HEADERS.filter(header => 
        !results.meta.fields.includes(header)
    );
    
    if (missingOptionalHeaders.length > 0) {
        showMessage(`Some optional data fields are missing: ${missingOptionalHeaders.join(', ')}. Some visualizations may be incomplete.`, 'warning');
        console.warn('Missing optional headers:', missingOptionalHeaders);
    }
    
    // Store the full dataset with data validation
    fullDataset = results.data
        .filter(row => {
            // Filter out rows with missing or invalid essential data
            return (
                row.index_name && 
                validateDate(row.index_date) && 
                isValidNumber(row.closing_index_value)
            );
        })
        .map(row => {
            // Ensure numeric fields are proper numbers, setting to null if invalid
            return {
                ...row,
                open_index_value: ensureNumber(row.open_index_value, null),
                high_index_value: ensureNumber(row.high_index_value, null),
                low_index_value: ensureNumber(row.low_index_value, null),
                closing_index_value: ensureNumber(row.closing_index_value, null),
                points_change: ensureNumber(row.points_change, null),
                change_percent: ensureNumber(row.change_percent, null),
                volume: ensureNumber(row.volume, null),
                turnover_rs_cr: ensureNumber(row.turnover_rs_cr, null),
                pe_ratio: ensureNumber(row.pe_ratio, null),
                pb_ratio: ensureNumber(row.pb_ratio, null),
                div_yield: ensureNumber(row.div_yield, null)
            };
        });
    
    // Check if data is empty after validation
    if (fullDataset.length === 0) {
        showError('No valid data found in CSV file after validation.');
        return;
    }
    
    console.log('Valid data rows:', fullDataset.length);
    
    // Show data validation summary
    const originalRows = results.data.length;
    const validRows = fullDataset.length;
    const invalidRows = originalRows - validRows;
    
    if (invalidRows > 0) {
        showMessage(`Loaded ${validRows} valid rows. Filtered out ${invalidRows} rows with invalid data.`, 'info');
    } else {
        showMessage(`Successfully loaded ${validRows} rows of data.`, 'success');
    }
    
    // Extract unique company names
    uniqueCompanies = [...new Set(fullDataset.map(row => row.index_name))]
        .filter(Boolean)
        .sort();
    
    // Check if any companies were found
    if (uniqueCompanies.length === 0) {
        showError('No company names found in data.');
        return;
    }
    
    console.log('Found', uniqueCompanies.length, 'unique companies');
    
    // Populate the company list
    populateCompanyList();
    
    // Select the first company by default
    selectCompany(uniqueCompanies[0]);
}

/**
 * Validate a date string
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if the date is valid
 */
function validateDate(dateStr) {
    if (!dateStr) return false;
    
    // Try parsing the date
    const date = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        // For special formats, try manual parsing
        const formats = [
            // DD/MM/YYYY
            {
                regex: /^(\d{2})\/(\d{2})\/(\d{4})$/,
                parse: (match) => new Date(`${match[3]}-${match[2]}-${match[1]}`)
            },
            // MM-DD-YYYY
            {
                regex: /^(\d{2})-(\d{2})-(\d{4})$/,
                parse: (match) => new Date(`${match[3]}-${match[1]}-${match[2]}`)
            }
        ];
        
        for (const format of formats) {
            const match = dateStr.match(format.regex);
            if (match) {
                const parsedDate = format.parse(match);
                if (!isNaN(parsedDate.getTime())) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    return true;
}

/**
 * Check if a value is a valid number
 * @param {any} value - Value to check
 * @returns {boolean} True if the value is a valid number
 */
function isValidNumber(value) {
    return value !== null && 
           value !== undefined && 
           !isNaN(parseFloat(value)) && 
           isFinite(value);
}

/**
 * Ensure a value is a number, return defaultValue if invalid
 * @param {any} value - Value to convert
 * @param {any} defaultValue - Default value to return if invalid (default is 0)
 * @returns {number|null} Numeric value or defaultValue if invalid
 */
function ensureNumber(value, defaultValue = 0) {
    return isValidNumber(value) ? parseFloat(value) : defaultValue;
}

/**
 * Populate the sidebar company list
 */
function populateCompanyList() {
    // Clear the loading state
    companyList.innerHTML = '';
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Add each company to the list
    uniqueCompanies.forEach(company => {
        const item = document.createElement('div');
        item.className = 'company-item';
        item.textContent = company;
        item.dataset.company = company;
        item.addEventListener('click', () => selectCompany(company));
        fragment.appendChild(item);
    });
    
    // Append all items at once
    companyList.appendChild(fragment);
}

/**
 * Filter the company list based on search input
 * @param {string} searchTerm - Search term to filter by
 */
function filterCompanyList(searchTerm) {
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    // Get all company items
    const items = companyList.getElementsByClassName('company-item');
    
    // Check each item for a match
    Array.from(items).forEach(item => {
        const companyName = item.textContent.toLowerCase();
        if (companyName.includes(normalizedSearchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

/**
 * Select a company and display its data
 * @param {string} company - Company name to select
 */
function selectCompany(company) {
    // Update global selected company
    selectedCompany = company;
    
    // Update the UI to show selected company
    selectedCompanyElement.textContent = company;
    
    // Update active class on company items
    const items = companyList.getElementsByClassName('company-item');
    Array.from(items).forEach(item => {
        if (item.dataset.company === company) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Show loading message
    showMessage(`Loading data for ${company}...`, 'info');
    
    // Get filtered data for the selected company
    const companyData = fullDataset.filter(row => row.index_name === company);
    
    if (companyData.length === 0) {
        showError(`No data found for ${company}.`);
        return;
    }
    
    // Apply any date filters
    const filteredData = filterDataByDateRange(companyData);
    
    if (filteredData.length === 0) {
        showError(`No data found for ${company} in the selected date range.`);
        return;
    }
    
    // Reset pagination to first page
    currentPage = 1;
    
    // Analyze data completeness for this company
    analyzeDataCompleteness(filteredData);
    
    // Update charts and data table
    updateCharts(filteredData);
    updateDataTable(filteredData);
    
    // Show dataset size
    showMessage(`Displaying ${filteredData.length} data points for ${company}.`, 'success');
}

/**
 * Analyze data completeness and display indicators
 * @param {Array} data - Data to analyze
 */
function analyzeDataCompleteness(data) {
    // Check completeness of various data fields
    const fields = [
        {name: 'Price', field: 'closing_index_value'},
        {name: 'Volume', field: 'volume'},
        {name: 'P/E Ratio', field: 'pe_ratio'},
        {name: 'P/B Ratio', field: 'pb_ratio'},
        {name: 'Div Yield', field: 'div_yield'}
    ];
    
    const completeness = fields.map(field => {
        const validValues = data.filter(row => isValidNumber(row[field.field]));
        const percent = (validValues.length / data.length) * 100;
        
        let status;
        if (percent === 0) {
            status = 'missing';
        } else if (percent < 90) {
            status = 'partial';
        } else {
            status = 'complete';
        }
        
        return {
            name: field.name,
            percent: percent.toFixed(1),
            status
        };
    });
    
    // Create or update the data completeness indicator
    let completenessElement = document.querySelector('.data-completeness');
    
    if (!completenessElement) {
        completenessElement = document.createElement('div');
        completenessElement.className = 'data-completeness';
        
        // Add to DOM before the charts container
        const chartsContainer = document.querySelector('.charts-container');
        if (chartsContainer) {
            chartsContainer.parentNode.insertBefore(completenessElement, chartsContainer);
        }
    }
    
    // Clear existing content
    completenessElement.innerHTML = '<strong>Data Completeness:</strong> ';
    
    // Add indicator for each field
    completeness.forEach(field => {
        const fieldElement = document.createElement('div');
        fieldElement.className = 'data-field';
        
        const indicator = document.createElement('span');
        indicator.className = `completeness-indicator ${field.status}`;
        
        const label = document.createElement('span');
        label.textContent = `${field.name}: ${field.percent}%`;
        
        fieldElement.appendChild(indicator);
        fieldElement.appendChild(label);
        completenessElement.appendChild(fieldElement);
    });
}

/**
 * Filter data by date range
 * @param {Array} data - Data to filter
 * @returns {Array} Filtered data
 */
function filterDataByDateRange(data) {
    let filteredData = [...data];
    
    // Apply start date filter if set
    if (startDateInput.value) {
        const startDate = new Date(startDateInput.value);
        filteredData = filteredData.filter(row => {
            const rowDate = new Date(row.index_date);
            return !isNaN(rowDate.getTime()) && rowDate >= startDate;
        });
    }
    
    // Apply end date filter if set
    if (endDateInput.value) {
        const endDate = new Date(endDateInput.value);
        filteredData = filteredData.filter(row => {
            const rowDate = new Date(row.index_date);
            return !isNaN(rowDate.getTime()) && rowDate <= endDate;
        });
    }
    
    // Sort data by date
    filteredData.sort((a, b) => {
        const dateA = new Date(a.index_date);
        const dateB = new Date(b.index_date);
        
        // Handle invalid dates
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateA - dateB;
    });
    
    return filteredData;
}

/**
 * Update all charts with the filtered data
 * @param {Array} data - Data to display in charts
 */
function updateCharts(data) {
    // Use improved sampling method for better data representation
    const chartData = smartSampleData(data, 150);
    
    // Update price chart
    updatePriceChart(chartData);
    
    // Update volume chart
    updateVolumeChart(chartData);
    
    // Update metrics chart
    updateMetricsChart(chartData);
    
    // Display data summary
    displayDataSummary(data);
}

/**
 * Display summary statistics for the dataset
 * @param {Array} data - Data to analyze
 */
function displayDataSummary(data) {
    if (data.length === 0) return;
    
    // Calculate summary statistics for closing values
    const closingValues = data.map(row => row.closing_index_value).filter(isValidNumber);
    
    if (closingValues.length === 0) return;
    
    // Calculate min, max, average
    const min = Math.min(...closingValues);
    const max = Math.max(...closingValues);
    const avg = closingValues.reduce((sum, val) => sum + val, 0) / closingValues.length;
    
    // Calculate standard deviation
    const variance = closingValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / closingValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate date range
    const sortedDates = data
        .map(row => new Date(row.index_date))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a - b);
    
    const dateRange = sortedDates.length > 1 
        ? `${formatDate(sortedDates[0])} to ${formatDate(sortedDates[sortedDates.length - 1])}`
        : 'N/A';
    
    // Display summary
    const summaryElement = document.createElement('div');
    summaryElement.className = 'data-summary';
    summaryElement.innerHTML = `
        <strong>Data Summary:</strong> 
        ${data.length} data points | 
        Date Range: ${dateRange} | 
        Price Range: ${formatNumber(min)} - ${formatNumber(max)} | 
        Avg: ${formatNumber(avg)} | 
        Std Dev: ${formatNumber(stdDev)}
    `;
    
    // Add or update summary in the DOM
    const existingSummary = document.querySelector('.data-summary');
    if (existingSummary) {
        existingSummary.parentNode.replaceChild(summaryElement, existingSummary);
    } else {
        const chartContainer = document.querySelector('.charts-container');
        if (chartContainer) {
            chartContainer.parentNode.insertBefore(summaryElement, chartContainer);
        }
    }
}

/**
 * Smart data sampling that preserves important data points
 * @param {Array} data - Original data array
 * @param {number} maxPoints - Maximum number of points to include
 * @returns {Array} Sampled data array
 */
function smartSampleData(data, maxPoints) {
    if (!data || data.length === 0) return [];
    if (data.length <= maxPoints) return data;
    
    // Implementation of LTTB (Largest-Triangle-Three-Buckets) algorithm
    // This algorithm preserves visual characteristics of the data
    
    // Always include first and last points
    const sampled = [data[0]];
    
    // Bucket size
    const bucketSize = (data.length - 2) / (maxPoints - 2);
    
    // For each bucket, find the point that creates the largest triangle with the current point and the next bucket
    for (let i = 0; i < maxPoints - 2; i++) {
        // Calculate the boundaries of the current bucket
        const startIdx = Math.floor((i + 0) * bucketSize) + 1;
        const endIdx = Math.floor((i + 1) * bucketSize) + 1;
        
        // Find the point with the highest value in current bucket
        let maxArea = -1;
        let maxAreaIdx = startIdx;
        
        // a is the last sampled point
        const a = sampled[sampled.length - 1];
        
        // c is representative of the next bucket
        const nextBucketIdx = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1);
        const c = data[nextBucketIdx];
        
        // Find point in current bucket that creates largest triangle with a and c
        for (let j = startIdx; j <= endIdx && j < data.length - 1; j++) {
            const b = data[j];
            
            // Skip if closing value is not valid
            if (!isValidNumber(a.closing_index_value) || 
                !isValidNumber(b.closing_index_value) || 
                !isValidNumber(c.closing_index_value)) {
                continue;
            }
            
            // Calculate triangle area (using closing values)
            const area = Math.abs(
                (a.index_date - c.index_date) * (b.closing_index_value - a.closing_index_value) - 
                (a.index_date - b.index_date) * (c.closing_index_value - a.closing_index_value)
            );
            
            if (area > maxArea) {
                maxArea = area;
                maxAreaIdx = j;
            }
        }
        
        // Add the point that creates the largest triangle
        sampled.push(data[maxAreaIdx]);
    }
    
    // Add the last point
    sampled.push(data[data.length - 1]);
    
    return sampled;
}

/**
 * Update the price chart
 * @param {Array} data - Data for the chart
 */
function updatePriceChart(data) {
    // Get the canvas context
    const ctx = document.getElementById('price-chart').getContext('2d');
    
    // Check if we have valid data for the chart
    const hasValidData = data.some(row => 
        isValidNumber(row.closing_index_value)
    );
    
    if (!hasValidData) {
        displayNoDataMessage('price-chart', 'No price data available for this company');
        return;
    }
    
    // Prepare data based on chart type
    let chartConfig;
    
    if (currentChartType === 'line') {
        // Line chart configuration
        chartConfig = {
            type: 'line',
            data: {
                labels: data.map(row => formatDate(row.index_date)),
                datasets: [{
                    label: 'Closing Price',
                    data: data.map(row => row.closing_index_value),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        };
    } else {
        // "Candlestick" simulation with bar chart
        const validOHLCData = data.filter(row => 
            isValidNumber(row.open_index_value) && 
            isValidNumber(row.high_index_value) && 
            isValidNumber(row.low_index_value) && 
            isValidNumber(row.closing_index_value)
        );
        
        if (validOHLCData.length === 0) {
            // Fall back to line chart if we don't have OHLC data
            currentChartType = 'line';
            updatePriceChart(data);
            return;
        }
        
        chartConfig = {
            type: 'bar',
            data: {
                labels: validOHLCData.map(row => formatDate(row.index_date)),
                datasets: [
                    // Price range (high-low)
                    {
                        label: 'Price Range',
                        data: validOHLCData.map(row => row.high_index_value - row.low_index_value),
                        backgroundColor: validOHLCData.map(row => 
                            row.closing_index_value >= row.open_index_value 
                                ? 'rgba(40, 167, 69, 0.5)' 
                                : 'rgba(220, 53, 69, 0.5)'
                        ),
                        borderColor: validOHLCData.map(row => 
                            row.closing_index_value >= row.open_index_value 
                                ? 'rgba(40, 167, 69, 1)' 
                                : 'rgba(220, 53, 69, 1)'
                        ),
                        borderWidth: 1,
                        barPercentage: 0.3,
                        categoryPercentage: 1,
                        base: validOHLCData.map(row => row.low_index_value)
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const dataIndex = context.dataIndex;
                                const dataPoint = validOHLCData[dataIndex];
                                return [
                                    `Open: ${formatNumber(dataPoint.open_index_value)}`,
                                    `High: ${formatNumber(dataPoint.high_index_value)}`,
                                    `Low: ${formatNumber(dataPoint.low_index_value)}`,
                                    `Close: ${formatNumber(dataPoint.closing_index_value)}`
                                ];
                            }
                        }
                    }
                }
            }
        };
    }
    
    // Create or update chart
    if (priceChart) {
        priceChart.data = chartConfig.data;
        priceChart.options = chartConfig.options;
        priceChart.update();
    } else {
        priceChart = new Chart(ctx, chartConfig);
    }
}

/**
 * Update the volume chart
 * @param {Array} data - Data for the chart
 */
function updateVolumeChart(data) {
    // Get the canvas context
    const ctx = document.getElementById('volume-chart').getContext('2d');
    
    // Check if we have valid volume data
    const hasVolumeData = data.some(row => isValidNumber(row.volume) && row.volume > 0);
    
    if (!hasVolumeData) {
        displayNoDataMessage('volume-chart', 'No volume data available for this company');
        return;
    }
    
    // Filter to only include valid volume data
    const validData = data.filter(row => isValidNumber(row.volume));
    
    // Prepare data
    const chartConfig = {
        type: 'bar',
        data: {
            labels: validData.map(row => formatDate(row.index_date)),
            datasets: [{
                label: 'Volume',
                data: validData.map(row => row.volume),
                backgroundColor: 'rgba(155, 89, 182, 0.5)',
                borderColor: 'rgba(155, 89, 182, 1)',
                borderWidth: 1,
                barPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    };
    
    // Create or update chart
    if (volumeChart) {
        volumeChart.destroy(); // Destroy existing chart completely
        volumeChart = new Chart(ctx, chartConfig);
    } else {
        volumeChart = new Chart(ctx, chartConfig);
    }
}

/**
 * Update the metrics chart
 * @param {Array} data - Data for the chart
 */
function updateMetricsChart(data) {
    // Get the canvas context
    const ctx = document.getElementById('metrics-chart').getContext('2d');
    
    // Check if we have valid metrics data
    const hasPE = data.some(row => isValidNumber(row.pe_ratio) && row.pe_ratio > 0);
    const hasPB = data.some(row => isValidNumber(row.pb_ratio) && row.pb_ratio > 0);
    const hasYield = data.some(row => isValidNumber(row.div_yield) && row.div_yield > 0);
    
    if (!hasPE && !hasPB && !hasYield) {
        displayNoDataMessage('metrics-chart', 'No metrics data available for this company');
        return;
    }
    
    // Calculate average metrics (excluding null/undefined/NaN values)
    const calculateAverage = (values) => {
        const filteredValues = values
            .filter(v => isValidNumber(v) && v > 0);
        return filteredValues.length > 0 
            ? filteredValues.reduce((sum, val) => sum + val, 0) / filteredValues.length 
            : null;
    };
    
    const peRatios = data.map(row => row.pe_ratio);
    const pbRatios = data.map(row => row.pb_ratio);
    const divYields = data.map(row => row.div_yield);
    
    const avgPE = calculateAverage(peRatios);
    const avgPB = calculateAverage(pbRatios);
    const avgDivYield = calculateAverage(divYields);
    
    // Find the latest values (from valid data)
    const getLatestValidValue = (data, field) => {
        const validData = data
            .filter(row => isValidNumber(row[field]) && row[field] > 0)
            .sort((a, b) => new Date(b.index_date) - new Date(a.index_date));
        
        return validData.length > 0 ? validData[0][field] : null;
    };
    
    const latestPE = getLatestValidValue(data, 'pe_ratio');
    const latestPB = getLatestValidValue(data, 'pb_ratio');
    const latestDivYield = getLatestValidValue(data, 'div_yield');
    
    // Prepare data - only include metrics that have valid data
    const labels = [];
    const avgData = [];
    const latestData = [];
    
    if (hasPE) {
        labels.push('P/E Ratio');
        avgData.push(avgPE);
        latestData.push(latestPE);
    }
    
    if (hasPB) {
        labels.push('P/B Ratio');
        avgData.push(avgPB);
        latestData.push(latestPB);
    }
    
    if (hasYield) {
        labels.push('Dividend Yield (%)');
        avgData.push(avgDivYield);
        latestData.push(latestDivYield);
    }
    
    const chartConfig = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Average',
                    data: avgData,
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Latest',
                    data: latestData,
                    backgroundColor: 'rgba(46, 204, 113, 0.5)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatNumber(context.parsed.y, 2)}`;
                        }
                    }
                }
            }
        }
    };
    
    // Create or update chart
    if (metricsChart) {
        metricsChart.destroy(); // Destroy existing chart completely
        metricsChart = new Chart(ctx, chartConfig);
    } else {
        metricsChart = new Chart(ctx, chartConfig);
    }
}

/**
 * Display a "no data" message in place of a chart
 * @param {string} chartId - ID of the chart canvas
 * @param {string} message - Message to display
 */
function displayNoDataMessage(chartId, message) {
    // Get the chart container
    const canvas = document.getElementById(chartId);
    const container = canvas.parentNode;
    
    // Hide the canvas
    canvas.style.display = 'none';
    
    // Check if we already have a message
    let noDataMessage = container.querySelector('.no-data-placeholder');
    
    if (!noDataMessage) {
        // Create message element
        noDataMessage = document.createElement('div');
        noDataMessage.className = 'no-data-placeholder';
        container.appendChild(noDataMessage);
    }
    
    // Update message
    noDataMessage.textContent = message;
    noDataMessage.style.height = '100%';
    noDataMessage.style.display = 'flex';
    
    // Make sure we destroy any existing chart
    if (chartId === 'price-chart' && priceChart) {
        priceChart.destroy();
        priceChart = null;
    } else if (chartId === 'volume-chart' && volumeChart) {
        volumeChart.destroy();
        volumeChart = null;
    } else if (chartId === 'metrics-chart' && metricsChart) {
        metricsChart.destroy();
        metricsChart = null;
    }
}

/**
 * Update the data table with the filtered data
 * @param {Array} data - Data to display in the table
 */
function updateDataTable(data) {
    // Clear existing table content
    dataTableBody.innerHTML = '';
    
    if (data.length === 0) {
        // Show a message if no data
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 10;
        td.textContent = 'No data available for the selected criteria.';
        td.style.textAlign = 'center';
        tr.appendChild(td);
        dataTableBody.appendChild(tr);
        return;
    }
    
    // Calculate total pages
    const totalPages = Math.ceil(data.length / rowsPerPage);
    
    // Ensure current page is within bounds
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    
    // Calculate slice indices
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, data.length);
    
    // Get data slice for the current page
    const pageData = data.slice(startIndex, endIndex);
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Add each row to the table
    pageData.forEach(row => {
        const tr = document.createElement('tr');
        
        // Format date
        const dateTd = document.createElement('td');
        dateTd.textContent = formatDate(row.index_date);
        tr.appendChild(dateTd);
        
        // Open value
        const openTd = document.createElement('td');
        openTd.textContent = formatNumber(row.open_index_value);
        tr.appendChild(openTd);
        
        // High value
        const highTd = document.createElement('td');
        highTd.textContent = formatNumber(row.high_index_value);
        tr.appendChild(highTd);
        
        // Low value
        const lowTd = document.createElement('td');
        lowTd.textContent = formatNumber(row.low_index_value);
        tr.appendChild(lowTd);
        
        // Close value
        const closeTd = document.createElement('td');
        closeTd.textContent = formatNumber(row.closing_index_value);
        tr.appendChild(closeTd);
        
        // Change percent
        const changeTd = document.createElement('td');
        const changeValue = row.change_percent;
        changeTd.textContent = formatNumber(changeValue, 2) + '%';
        changeTd.className = isValidNumber(changeValue) && changeValue >= 0 ? 'positive' : 'negative';
        tr.appendChild(changeTd);
        
        // Volume
        const volumeTd = document.createElement('td');
        volumeTd.textContent = isValidNumber(row.volume) ? formatLargeNumber(row.volume) : '-';
        tr.appendChild(volumeTd);
        
        // P/E Ratio
        const peTd = document.createElement('td');
        peTd.textContent = isValidNumber(row.pe_ratio) ? formatNumber(row.pe_ratio, 2) : '-';
        tr.appendChild(peTd);
        
        // P/B Ratio
        const pbTd = document.createElement('td');
        pbTd.textContent = isValidNumber(row.pb_ratio) ? formatNumber(row.pb_ratio, 2) : '-';
        tr.appendChild(pbTd);
        
        // Dividend Yield
        const yieldTd = document.createElement('td');
        yieldTd.textContent = isValidNumber(row.div_yield) ? formatNumber(row.div_yield, 2) + '%' : '-';
        tr.appendChild(yieldTd);
        
        // Add the row to the fragment
        fragment.appendChild(tr);
    });
    
    // Append all rows at once
    dataTableBody.appendChild(fragment);
    
    // Update or create pagination controls
    updatePagination(data.length, totalPages);
}

/**
 * Update pagination controls
 * @param {number} totalItems - Total number of items
 * @param {number} totalPages - Total number of pages
 */
function updatePagination(totalItems, totalPages) {
    // Find or create pagination container
    let paginationContainer = document.querySelector('.pagination-container');
    
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        
        // Add to DOM after the table
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.after(paginationContainer);
        }
    }
    
    // Clear existing pagination
    paginationContainer.innerHTML = '';
    
    // Create pagination info
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = `Showing ${(currentPage - 1) * rowsPerPage + 1} to ${Math.min(currentPage * rowsPerPage, totalItems)} of ${totalItems} entries`;
    
    // Create pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'btn btn-small';
    prevButton.textContent = 'Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            if (selectedCompany) {
                const companyData = fullDataset.filter(row => row.index_name === selectedCompany);
                const filteredData = filterDataByDateRange(companyData);
                updateDataTable(filteredData);
            }
        }
    });
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'btn btn-small';
    nextButton.textContent = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            if (selectedCompany) {
                const companyData = fullDataset.filter(row => row.index_name === selectedCompany);
                const filteredData = filterDataByDateRange(companyData);
                updateDataTable(filteredData);
            }
        }
    });
    
    // Page number display
    const pageDisplay = document.createElement('span');
    pageDisplay.className = 'page-display';
    pageDisplay.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Add all elements to pagination controls
    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageDisplay);
    paginationControls.appendChild(nextButton);
    
    // Add to pagination container
    paginationContainer.appendChild(paginationInfo);
    paginationContainer.appendChild(paginationControls);
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Company search input
    if (companySearch) {
        companySearch.addEventListener('input', (e) => {
            filterCompanyList(e.target.value);
        });
    }
    
    // Date range form
    if (dateRangeForm) {
        dateRangeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (selectedCompany) {
                // Re-filter and update with current date range
                const companyData = fullDataset.filter(row => row.index_name === selectedCompany);
                const filteredData = filterDataByDateRange(companyData);
                
                if (filteredData.length === 0) {
                    showError('No data found for the selected date range.');
                    return;
                }
                
                // Reset pagination to first page
                currentPage = 1;
                
                updateCharts(filteredData);
                updateDataTable(filteredData);
            }
        });
    }
    
    // Chart type toggle buttons
    if (lineBtn) {
        lineBtn.addEventListener('click', () => {
            if (currentChartType !== 'line') {
                currentChartType = 'line';
                lineBtn.classList.add('btn-active');
                candlestickBtn.classList.remove('btn-active');
                if (selectedCompany) {
                    const companyData = fullDataset.filter(row => row.index_name === selectedCompany);
                    const filteredData = filterDataByDateRange(companyData);
                    updatePriceChart(filteredData);
                }
            }
        });
    }
    
    if (candlestickBtn) {
        candlestickBtn.addEventListener('click', () => {
            if (currentChartType !== 'candlestick') {
                currentChartType = 'candlestick';
                candlestickBtn.classList.add('btn-active');
                lineBtn.classList.remove('btn-active');
                if (selectedCompany) {
                    const companyData = fullDataset.filter(row => row.index_name === selectedCompany);
                    const filteredData = filterDataByDateRange(companyData);
                    updatePriceChart(filteredData);
                }
            }
        });
    }
    
    // Export data button (if added to HTML)
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (selectedCompany) {
                exportDataToCSV(selectedCompany);
            }
        });
    }
}

/**
 * Export the current filtered data to CSV
 * @param {string} companyName - Name of the company for the filename
 */
function exportDataToCSV(companyName) {
    if (!selectedCompany) return;
    
    // Get filtered data
    const companyData = fullDataset.filter(row => row.index_name === selectedCompany);
    const filteredData = filterDataByDateRange(companyData);
    
    if (filteredData.length === 0) {
        showError('No data to export.');
        return;
    }
    
    // Convert to CSV
    const csvContent = Papa.unparse(filteredData);
    
    // Create a blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.csv`);
    link.style.visibility = 'hidden';
    
    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Show an error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    if (!errorMessage) return;
    
    errorMessage.textContent = message;
    errorMessage.className = 'error-message visible';
    
    // Log error to console as well
    console.error(message);
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorMessage.className = 'error-message';
    }, 5000);
}

/**
 * Show an informational message
 * @param {string} message - Message to display
 * @param {string} type - Message type (info, success, warning)
 */
function showMessage(message, type = 'info') {
    if (!errorMessage) return;
    
    errorMessage.textContent = message;
    
    // Set class based on message type
    switch (type) {
        case 'success':
            errorMessage.className = 'success-message visible';
            break;
        case 'warning':
            errorMessage.className = 'warning-message visible';
            break;
        case 'info':
        default:
            errorMessage.className = 'info-message visible';
            break;
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
        errorMessage.className = errorMessage.className.replace(' visible', '');
    }, 3000);
}

/**
 * Helper function to format dates
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // Try to extract date parts manually for common formats
        const formats = [
            // DD/MM/YYYY
            {
                regex: /^(\d{2})\/(\d{2})\/(\d{4})$/,
                parse: (match) => `${match[3]}-${match[2]}-${match[1]}`
            },
            // MM-DD-YYYY
            {
                regex: /^(\d{2})-(\d{2})-(\d{4})$/,
                parse: (match) => `${match[3]}-${match[1]}-${match[2]}`
            }
        ];
        
        for (const format of formats) {
            const match = dateString.match(format.regex);
            if (match) {
                return format.parse(match);
            }
        }
        
        return dateString;
    }
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Helper function to format numbers
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
function formatNumber(num, decimals = 2) {
    if (!isValidNumber(num)) return '-';
    return parseFloat(num).toFixed(decimals);
}

/**
 * Helper function to format large numbers (e.g., volume)
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatLargeNumber(num) {
    if (!isValidNumber(num)) return '-';
    
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    
    return num.toString();
}