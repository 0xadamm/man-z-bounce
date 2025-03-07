require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const zeroBounceValidationBulk = require("./utils/zeroBounceValidationBulk");

/**
 * Processes a CSV file and extracts emails for validation
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<{
 *   filePath: string,
 *   emailColumnIndex: number,
 *   hasHeaderRow: boolean
 * }>} Object with processed file info
 */
async function determineFileStructure(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const headers = [];
      let emailColumnIndex = 1; // Default to 1 (first column in 1-indexed system)
      let hasHeaderRow = true;
      let processed = false;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("headers", (headerList) => {
          // If we have headers, find the email column
          headers.push(...headerList);

          // Look for common email column names
          const emailHeaderOptions = [
            "email",
            "email_address",
            "emailaddress",
            "mail",
            "e-mail",
          ];
          for (let i = 0; i < headers.length; i++) {
            const headerName = headers[i].toLowerCase();
            if (emailHeaderOptions.includes(headerName)) {
              // Convert from 0-indexed to 1-indexed for ZeroBounce API
              emailColumnIndex = i + 1;
              break;
            }
          }
        })
        .on("data", (data) => {
          // Only process the first row to see if it looks like an email
          if (!processed) {
            processed = true;

            // If the first row doesn't seem to have a header (has an email in it)
            if (
              !headers.length ||
              (data[headers[0]] && data[headers[0]].includes("@"))
            ) {
              hasHeaderRow = false;
              // If no header, try to find which column has emails
              if (headers.length) {
                for (let i = 0; i < headers.length; i++) {
                  const value = data[headers[i]];
                  if (value && value.includes("@")) {
                    emailColumnIndex = i + 1; // 1-indexed for ZeroBounce
                    break;
                  }
                }
              }
            }

            // Stop after processing the first row
            resolve({
              filePath,
              emailColumnIndex,
              hasHeaderRow,
            });
          }
        })
        .on("end", () => {
          if (!processed) {
            // If we didn't process any rows (empty file)
            resolve({
              filePath,
              emailColumnIndex,
              hasHeaderRow: false,
            });
          }
        })
        .on("error", (error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Main function to run the ZeroBounce bulk validation
 */
async function main() {
  try {
    // Check if file path is provided
    let filePath = process.argv[2];
    if (!filePath) {
      console.error("Please provide a CSV file path as an argument");
      console.log("Usage: node bulk-index.js path/to/your/file.csv");
      console.log(
        "Or place your CSV file in the 'input' folder and run: node bulk-index.js filename.csv"
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

    console.log(
      `Processing file: ${filePath} (Bulk mode - processing ALL emails)`
    );

    // Determine file structure (find email column, check for header)
    const fileInfo = await determineFileStructure(filePath);
    console.log(`Detected email column at index ${fileInfo.emailColumnIndex}`);
    console.log(
      `File ${fileInfo.hasHeaderRow ? "has" : "does not have"} a header row`
    );

    console.log("\nStarting ZeroBounce bulk validation...");
    // Run ZeroBounce validation
    const [validEmails, invalidEmails] = await zeroBounceValidationBulk(
      fileInfo.filePath,
      fileInfo.emailColumnIndex,
      fileInfo.hasHeaderRow
    );

    console.log("\nValidation Results:");
    console.log("--------------------------");
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
      path.join(jsonOutputDir, `valid_emails_bulk_${timestamp}.json`),
      JSON.stringify(validEmails, null, 2)
    );

    fs.writeFileSync(
      path.join(jsonOutputDir, `invalid_emails_bulk_${timestamp}.json`),
      JSON.stringify(invalidEmails, null, 2)
    );

    // Manually create the CSV content for valid emails
    let validCsvContent;
    if (validEmails.length > 0) {
      // Create header row
      validCsvContent = "FirstName,LastName,Email,Company\n";

      // Add each row manually
      validEmails.forEach((item) => {
        const firstName = item.FirstName || item['"FirstName"'] || "";
        const lastName = item.LastName || "";
        const email = item.Email || "";
        const company = item.Company === "%" ? "" : item.Company || "";

        // Create clean CSV row
        validCsvContent += `${firstName},${lastName},${email},${company}\n`;
      });
    } else {
      validCsvContent = "No valid emails found";
    }

    // For invalid emails, let's manually create the CSV content
    let invalidCsvContent;
    if (invalidEmails.length > 0) {
      // Create header row
      invalidCsvContent = "FirstName,LastName,Email,Company\n";

      // Add each row manually
      invalidEmails.forEach((item) => {
        const firstName = item.FirstName || item['"FirstName"'] || "";
        const lastName = item.LastName || "";
        const email = item.Email || "";
        const company = item.Company === "%" ? "" : item.Company || "";

        // Create clean CSV row
        invalidCsvContent += `${firstName},${lastName},${email},${company}\n`;
      });
    } else {
      invalidCsvContent = "No invalid emails found";
    }

    // Save the CSV files
    fs.writeFileSync(
      path.join(csvOutputDir, `valid_emails_bulk_${timestamp}.csv`),
      validCsvContent
    );

    fs.writeFileSync(
      path.join(csvOutputDir, `invalid_emails_bulk_${timestamp}.csv`),
      invalidCsvContent
    );

    console.log(`\nResults saved to output directories:`);
    console.log(`JSON format:`);
    console.log(
      `- Valid emails: output/json/valid_emails_bulk_${timestamp}.json`
    );
    console.log(
      `- Invalid emails: output/json/invalid_emails_bulk_${timestamp}.json`
    );
    console.log(`CSV format:`);
    console.log(
      `- Valid emails: output/csv/valid_emails_bulk_${timestamp}.csv`
    );
    console.log(
      `- Invalid emails: output/csv/invalid_emails_bulk_${timestamp}.csv`
    );
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

// Run the main function
main();
