const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

/**
 * Read a CSV file and return the data as an array of objects
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array<object>>} - Array of row objects
 */
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

/**
 * Main function to merge CSV data
 */
async function main() {
  try {
    if (process.argv.length < 4) {
      console.error("Please provide both input CSV files");
      console.log(
        "Usage: node merge-csv-data.js path/to/original/input.csv path/to/zerobounce/output.csv"
      );
      process.exit(1);
    }

    const inputCsvPath = process.argv[2]; // Original input CSV with ailment tags and Instagram accounts
    const zeroBounceOutputPath = process.argv[3]; // ZeroBounce output CSV

    // Check if files exist
    if (!fs.existsSync(inputCsvPath)) {
      console.error(`Input file not found: ${inputCsvPath}`);
      process.exit(1);
    }

    if (!fs.existsSync(zeroBounceOutputPath)) {
      console.error(
        `ZeroBounce output file not found: ${zeroBounceOutputPath}`
      );
      process.exit(1);
    }

    console.log("Reading input files...");

    // Read both CSV files
    const inputData = await readCSV(inputCsvPath);
    const zeroBounceData = await readCSV(zeroBounceOutputPath);

    console.log(`Read ${inputData.length} rows from input CSV`);
    console.log(
      `Read ${zeroBounceData.length} rows from ZeroBounce output CSV`
    );

    // Display sample of input data to understand its structure
    if (inputData.length > 0) {
      console.log("Input CSV sample data:");
      console.log(inputData[0]);
    }

    // Display sample of ZeroBounce data
    if (zeroBounceData.length > 0) {
      console.log("ZeroBounce CSV sample data:");
      console.log(zeroBounceData[0]);
    }

    // Create a map of email to additional data in the input CSV
    const emailToAdditionalDataMap = new Map();

    // We need to identify the email field in the input CSV
    // Based on the input file structure
    const inputEmailFields = [
      "Email",
      "email",
      "email_address",
      "Email Address",
    ];
    const ailmentFields = [
      "Ailment Mentions",
      "ailment",
      "Tags",
      "tags",
      "Ailment Tags",
    ];
    const instagramFields = [
      "Instagram Username",
      "instagram",
      "Insta",
      "instagram_account",
    ];

    // Find the actual field names in the input data
    let emailField, ailmentField, instagramField;

    if (inputData.length > 0) {
      const firstRow = inputData[0];

      // Find email field
      emailField = inputEmailFields.find(
        (field) => firstRow[field] !== undefined
      );

      // Find ailment field
      ailmentField = ailmentFields.find(
        (field) => firstRow[field] !== undefined
      );

      // Find Instagram field
      instagramField = instagramFields.find(
        (field) => firstRow[field] !== undefined
      );

      console.log(
        `Found fields - Email: ${emailField}, Ailment: ${ailmentField}, Instagram: ${instagramField}`
      );
    }

    if (!emailField) {
      console.error("Could not find email field in input CSV");
      process.exit(1);
    }

    // Map emails to additional data
    inputData.forEach((row) => {
      const email = row[emailField];
      if (email) {
        emailToAdditionalDataMap.set(email.toLowerCase(), {
          ailment: ailmentField && row[ailmentField] ? row[ailmentField] : "",
          instagram:
            instagramField && row[instagramField] ? row[instagramField] : "",
        });
      }
    });

    // Find email field in ZeroBounce data
    let zbEmailField;

    if (zeroBounceData.length > 0) {
      const firstZbRow = zeroBounceData[0];
      // In ZeroBounce output, the email field is likely "Email Address"
      zbEmailField = Object.keys(firstZbRow).find(
        (field) => field.includes("Email") || field.includes("email")
      );
      console.log(`Found ZeroBounce email field: ${zbEmailField}`);
    }

    if (!zbEmailField) {
      console.error("Could not find email field in ZeroBounce CSV");
      process.exit(1);
    }

    // Create merged data
    const mergedData = zeroBounceData.map((row) => {
      const email = row[zbEmailField]
        ? row[zbEmailField].replace(/^"|"$/g, "")
        : "";
      const additionalData = email
        ? emailToAdditionalDataMap.get(email.toLowerCase())
        : null;

      // Create a new object with all ZeroBounce data
      const newRow = { ...row };

      // Add ailment and Instagram data if available
      if (additionalData) {
        newRow["Ailment Tags"] = additionalData.ailment;
        newRow["Instagram Account"] = additionalData.instagram;
      } else {
        newRow["Ailment Tags"] = "";
        newRow["Instagram Account"] = "";
      }

      return newRow;
    });

    console.log(`Created ${mergedData.length} merged records`);

    // Create the output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "output", "csv");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create filename for merged data
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(outputDir, `merged_data_${timestamp}.csv`);

    // Convert merged data to CSV
    const headers = mergedData.length > 0 ? Object.keys(mergedData[0]) : [];

    let csvContent = headers.join(",") + "\n";

    mergedData.forEach((row) => {
      const csvRow = headers
        .map((header) => {
          const value = row[header] || "";
          // Escape quotes and wrap in quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",");

      csvContent += csvRow + "\n";
    });

    // Write merged CSV
    fs.writeFileSync(outputPath, csvContent);

    console.log(`Merged data saved to: ${outputPath}`);
  } catch (error) {
    console.error("An error occurred:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
