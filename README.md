# stock_app_test
This public repo to share the data in between the candidate and interviewer 

# Financial Data Visualization

A simple, responsive web application that visualizes financial market data from the provided CSV file. This project allows users to explore company/index data through interactive charts and tables.

## Features

- Display a list of companies/indices from the CSV file
- Show interactive charts when a company is selected:
  - Price history (line and simulated candlestick views)
  - Trading volume
  - Performance metrics (PE ratio, PB ratio, dividend yield)
- Filter data by date range
- Responsive design for desktop and mobile devices
- Search functionality to find specific companies

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js (for data visualization)
- PapaParse (for CSV parsing)

## Setup Instructions

### Prerequisites
- A modern web browser
- Basic local web server (recommended for local development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rohiitgit/financial-data-visualization.git
   cd financial-data-visualization
   ```

2. Place the `dump.csv` file in the root directory of the project.

3. Start a local server:
   
   Using Python:
   ```bash
   # Python 3
   python -m http.server
   
   # Python 2
   python -m SimpleHTTPServer
   ```
   
   Or using Node.js:
   ```bash
   # Using npx and http-server
   npx http-server
   ```

4. Open your browser and navigate to the application:
   - If using Python: `http://localhost:8000`
   - If using http-server: `http://localhost:8080`

### Direct Usage

You can also directly open the `index.html` file in your browser, but some browsers may block loading the CSV file due to security restrictions. A local server is recommended for development.

## File Structure

```
/
├── index.html      # Main HTML structure
├── styles.css      # CSS styles
├── script.js       # JavaScript functionality
├── dump.csv        # Data file (you need to add this)
└── README.md       # This documentation file
```

## Usage Guide

1. **Viewing Companies**: Companies are listed in the sidebar. Click on any company to display its data.

2. **Searching**: Use the search box at the top of the sidebar to filter the company list.

3. **Viewing Charts**: When a company is selected, three charts are displayed:
   - Price History: Shows closing prices over time
   - Trading Volume: Displays trading volume over time
   - Performance Metrics: Shows average and latest values for PE ratio, PB ratio, and dividend yield

4. **Changing Chart View**: Toggle between line view and candlestick view using the buttons above the price chart.

5. **Filtering by Date**: Use the date range form at the top of the main content area to filter data by a specific date range.

6. **Viewing Detailed Data**: Scroll down to see a table with detailed historical data.

## Implementation Notes

- The application processes CSV data with the following structure:
  - index_name: Company/index name
  - index_date: Date of the data point
  - open_index_value: Opening value
  - high_index_value: Highest value
  - low_index_value: Lowest value
  - closing_index_value: Closing value
  - points_change: Change in points
  - change_percent: Percentage change
  - volume: Trading volume
  - turnover_rs_cr: Turnover in crores
  - pe_ratio: Price-to-earnings ratio
  - pb_ratio: Price-to-book ratio
  - div_yield: Dividend yield

- For large datasets, data points are sampled to maintain good performance in chart rendering.
- The table view shows the most recent 50 data points for performance reasons.

## License

This project is available under the MIT License.# financial-data-visualization
