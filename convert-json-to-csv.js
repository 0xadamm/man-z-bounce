const fs = require("fs");
const path = require("path");

/**
 * Convert JSON file to CSV
 * @param {string} jsonFilePath - Path to JSON file
 * @returns {string} CSV content
 */
function convertJsonToCsv(jsonFilePath) {
  // Read and parse JSON file
  const jsonContent = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));

  if (!Array.isArray(jsonContent) || jsonContent.length === 0) {
    return "No data found";
  }

  // Create header row using ZeroBounce field names
  const csvContent = [
    "Email Address,Status,Sub Status,Account,Domain,First Name,Last Name,Gender,Free Email,MX Found,MX Record,SMTP Provider,Custom",
  ];

  // Convert each JSON object to CSV row
  jsonContent.forEach((item) => {
    // Find the email address key by looking for keys that contain "Email Address"
    const emailKey = Object.keys(item).find((key) =>
      key.includes("Email Address")
    );
    const email = emailKey ? item[emailKey] : "";

    const row = [
      email,
      item["ZB Status"] || "",
      item["ZB Sub status"] || "",
      item["ZB Account"] || "",
      item["ZB Domain"] || "",
      item["ZB First Name"] || "",
      item["ZB Last Name"] || "",
      item["ZB Gender"] || "",
      item["ZB Free Email"] || "",
      item["ZB MX Found"] || "",
      item["ZB MX Record"] || "",
      item["ZB SMTP Provider"] || "",
      item["Custom"] || "",
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(",");

    csvContent.push(row);
  });

  return csvContent.join("\n");
}

function main() {
  try {
    // Get JSON file path from command line argument
    const jsonFilePath = process.argv[2];
    if (!jsonFilePath) {
      console.error("Please provide the JSON file path");
      console.log("Usage: node convert-json-to-csv.js path/to/json/file.json");
      process.exit(1);
    }

    // Check if file exists
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`File not found: ${jsonFilePath}`);
      process.exit(1);
    }

    // Convert JSON to CSV
    console.log(`Converting ${jsonFilePath} to CSV...`);
    const csvContent = convertJsonToCsv(jsonFilePath);

    // Create output filename based on input filename
    const outputDir = path.dirname(jsonFilePath);
    const baseFileName = path.basename(jsonFilePath, ".json");
    const csvFilePath = path.join(outputDir, `${baseFileName}_converted.csv`);

    // Write CSV file
    fs.writeFileSync(csvFilePath, csvContent);
    console.log(`Successfully converted! CSV file saved as: ${csvFilePath}`);
  } catch (error) {
    console.error("An error occurred:", error.message);
    process.exit(1);
  }
}

// Run the script
main();
