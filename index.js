require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const zeroBounceValidation = require("./utils/zeroBounceValidation");

/**
 * Simple email format validation
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email has valid format
 */
function isValidEmailFormat(email) {
  if (!email) return false;
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Processes a CSV file and extracts emails for validation
 * @param {string} filePath - Path to the CSV file
 * @param {number} limit - Maximum number of emails to process (0 = no limit)
 * @returns {Promise<Array<object>>} Array of objects with email data
 */
async function processCSVFile(filePath, limit = 5) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.toLowerCase(), // Convert all headers to lowercase
        })
      )
      .on("data", (data) => {
        // Only process until we reach the limit if limit > 0
        if (limit > 0 && results.length >= limit) return;

        // Check if data has email column
        if (data.email) {
          // Simple email format check
          if (isValidEmailFormat(data.email)) {
            // Add a tags field with email in JSON format for compatibility with zeroBounceValidation
            data.tags = JSON.stringify({ email: data.email });
            results.push(data);
          }
        }
      })
      .on("end", () => {
        console.log(
          `CSV processing completed. Found ${results.length} emails with valid format for ZeroBounce validation.`
        );
        if (limit > 0) {
          console.log(
            `Processing limited to ${limit} emails to save ZeroBounce credits.`
          );
        } else {
          console.log(`Processing all emails (no limit).`);
        }
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Main function to run the ZeroBounce validation
 */
async function main() {
  try {
    // Check if file path is provided
    let filePath = process.argv[2];
    if (!filePath) {
      console.error("Please provide a CSV file path as an argument");
      console.log("Usage: node index.js path/to/your/file.csv [email_limit]");
      console.log(
        "Or place your CSV file in the 'input' folder and run: node index.js filename.csv [email_limit]"
      );
      process.exit(1);
    }

    // If filePath doesn't have directory info, check the input folder
    if (!filePath.includes("/") && !filePath.includes("\\")) {
      const inputFilePath = path.join(process.cwd(), "input", filePath);
      if (fs.existsSync(inputFilePath)) {
        filePath = inputFilePath;
        console.log(`Using file from input directory: ${filePath}`);
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    // Get email limit (default: 5)
    const limit = process.argv[3] ? parseInt(process.argv[3]) : 5;
    if (limit === 0) {
      console.log(
        `Processing file: ${filePath} (NO LIMIT - processing all emails)`
      );
    } else {
      console.log(`Processing file: ${filePath} (limited to ${limit} emails)`);
    }

    const validEmailsFromCSV = await processCSVFile(filePath, limit);

    console.log("Starting ZeroBounce validation...");
    // Run ZeroBounce validation
    const [validEmails, invalidEmails] = await zeroBounceValidation(
      validEmailsFromCSV
    );

    console.log("\nValidation Results:");
    console.log("--------------------------");
    console.log(`Total emails processed: ${validEmailsFromCSV.length}`);
    console.log(`Valid emails: ${validEmails.length}`);
    console.log(`Invalid emails: ${invalidEmails.length}`);

    // Create output directories if they don't exist
    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Create separate directories for JSON and CSV
    const jsonOutputDir = path.join(outputDir, "json");
    const csvOutputDir = path.join(outputDir, "csv");

    if (!fs.existsSync(jsonOutputDir)) {
      fs.mkdirSync(jsonOutputDir);
    }

    if (!fs.existsSync(csvOutputDir)) {
      fs.mkdirSync(csvOutputDir);
    }

    // Save results to files
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // Save as JSON
    fs.writeFileSync(
      path.join(jsonOutputDir, `valid_emails_${timestamp}.json`),
      JSON.stringify(validEmails, null, 2)
    );

    fs.writeFileSync(
      path.join(jsonOutputDir, `invalid_emails_${timestamp}.json`),
      JSON.stringify(invalidEmails, null, 2)
    );

    // Convert to CSV and save
    // Helper function to convert JSON array to CSV
    const jsonToCSV = (jsonArray) => {
      if (jsonArray.length === 0) return "";

      // Get headers from first object
      const headers = Object.keys(jsonArray[0]);

      // Create CSV header row
      const csvRows = [headers.join(",")];

      // Add data rows
      for (const item of jsonArray) {
        const values = headers.map((header) => {
          const val = item[header];
          // Handle different data types and escape special characters
          if (val === null || val === undefined) return "";
          if (typeof val === "object")
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
        });
        csvRows.push(values.join(","));
      }

      return csvRows.join("\n");
    };

    // Save valid emails as CSV
    fs.writeFileSync(
      path.join(csvOutputDir, `valid_emails_${timestamp}.csv`),
      jsonToCSV(validEmails)
    );

    // Save invalid emails as CSV
    fs.writeFileSync(
      path.join(csvOutputDir, `invalid_emails_${timestamp}.csv`),
      jsonToCSV(invalidEmails)
    );

    console.log(`\nResults saved to output directories:`);
    console.log(`JSON format:`);
    console.log(`- Valid emails: output/json/valid_emails_${timestamp}.json`);
    console.log(
      `- Invalid emails: output/json/invalid_emails_${timestamp}.json`
    );
    console.log(`CSV format:`);
    console.log(`- Valid emails: output/csv/valid_emails_${timestamp}.csv`);
    console.log(`- Invalid emails: output/csv/invalid_emails_${timestamp}.csv`);
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

// Run the main function
main();
