# man-z-bounce

A Node.js application for validating email addresses using ZeroBounce API.

## Features

- Process CSV files with email addresses
- Validate email format locally
- Validate email addresses using ZeroBounce API
- Save results as JSON and CSV files

## Installation

1. Clone this repository or copy all files to your local machine.
2. Navigate to the project directory:
   ```
   cd man-z-bounce
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file with your ZeroBounce API key:
   ```
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

Run the application with a CSV file containing email addresses:

```
node index.js path/to/your/file.csv [email_limit]
```

Or place your CSV file in the `input` folder and run:

```
node index.js filename.csv [email_limit]
```

Parameters:

- `path/to/your/file.csv` or `filename.csv`: Path to the CSV file with email addresses (required)
- `email_limit`: Maximum number of emails to process (optional, default: 5, use 0 for no limit)

The CSV file should have an "email" column containing the email addresses to validate.

## Output

The application will create an `output` directory with validated emails:

- `output/json/valid_emails_[timestamp].json`: Valid email addresses in JSON format
- `output/json/invalid_emails_[timestamp].json`: Invalid email addresses in JSON format
- `output/csv/valid_emails_[timestamp].csv`: Valid email addresses in CSV format
- `output/csv/invalid_emails_[timestamp].csv`: Invalid email addresses in CSV format

## License

ISC
