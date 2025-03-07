# man-z-bounce

A Node.js application for validating email addresses using ZeroBounce API.

## Features

- Process CSV files with email addresses
- Validate email format locally
- Validate email addresses using ZeroBounce API
- Two validation methods: regular (with limits) and bulk (for larger datasets)
- Save results as JSON and CSV files

## Installation

1. Clone this repository or copy all files to your local machine.
2. Navigate to the project directory:

   ```bash
   cd man-z-bounce
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file with your ZeroBounce API key:

   ```bash
   cp .env.example .env
   ```

   Then edit the `.env` file to add your ZeroBounce API key.

## Project Structure

- `input/`: Place your CSV files here for easy access
- `output/`: Contains validation results
  - `output/json/`: Results in JSON format
  - `output/csv/`: Results in CSV format
- `utils/`: Helper functions

## Usage

### Regular Validation (index.js)

The standard method with control over how many emails to validate:

```bash
node index.js path/to/your/file.csv [email_limit]
```

Or if your file is in the `input` folder, simply use:

```bash
node index.js filename.csv [email_limit]
```

Parameters:

- `path/to/your/file.csv` or `filename.csv`: Path to CSV file or just the filename if in the input folder (required)
- `email_limit`: Maximum number of emails to process (optional, default: 5, use 0 for no limit)

### Bulk Validation (bulk-index.js)

Process entire CSV files at once, with automatic email column detection:

```bash
node bulk-index.js filename.csv
```

Parameters:

- `filename.csv`: Name of the CSV file to process (required)

Features:

- Works with the `input` folder - just provide the filename if your file is in the input folder
- Automatically detects which column contains emails
- Always processes ALL emails (no limit)
- Ideal for large batches of emails

Example usage with a file in the input folder:

```bash
node bulk-index.js emails.csv
```

The CSV file should have an "email" column containing the email addresses to validate. If using bulk validation, the system will try to automatically detect the email column.

## Output

The application will create an `output` directory with validated emails:

- `output/json/valid_emails_[timestamp].json`: Valid email addresses in JSON format
- `output/json/invalid_emails_[timestamp].json`: Invalid email addresses in JSON format
- `output/csv/valid_emails_[timestamp].csv`: Valid email addresses in CSV format
- `output/csv/invalid_emails_[timestamp].csv`: Invalid email addresses in CSV format

For bulk validation, file names will include "bulk" (e.g., `valid_emails_bulk_[timestamp].json`).

## License

ISC
