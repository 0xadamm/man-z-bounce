require("dotenv").config();
const ZeroBounceSDK = require("@zerobounce/zero-bounce-sdk");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const FormData = require("form-data");
const axios = require("axios");

const zeroBounce = new ZeroBounceSDK();
zeroBounce.init(process.env.ZERO_BOUNCE_API_KEY);

/**
 * Parses a CSV file and returns an array of objects
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array<object>>} - Array of row objects
 */
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Upload a file to ZeroBounce using direct API call (workaround for SDK issues)
 * @param {string} filePath - Path to the CSV file
 * @param {number} emailColumnIndex - Column index (1-based) of email addresses
 * @param {boolean} hasHeaderRow - Whether the file has a header row
 * @returns {Promise<string>} - File ID
 */
async function uploadFile(filePath, emailColumnIndex, hasHeaderRow) {
  const apiKey = process.env.ZERO_BOUNCE_API_KEY;
  const formData = new FormData();

  // Append the file
  formData.append("file", fs.createReadStream(filePath));

  // Append other required parameters
  formData.append("api_key", apiKey);
  formData.append("email_address_column", emailColumnIndex);
  formData.append("has_header_row", hasHeaderRow ? "true" : "false");

  try {
    const response = await axios.post(
      "https://bulkapi.zerobounce.net/v2/sendfile",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    console.log("Direct API response:", JSON.stringify(response.data, null, 2));

    if (response.data && response.data.success && response.data.file_id) {
      return response.data.file_id;
    } else if (response.data && response.data.file_id) {
      return response.data.file_id;
    } else {
      throw new Error(
        "No file ID in response: " + JSON.stringify(response.data)
      );
    }
  } catch (error) {
    console.error("Upload error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw new Error("Failed to upload file directly");
  }
}

/**
 * Check file status using direct API call
 * @param {string} fileId - The file ID
 * @returns {Promise<string>} - File status
 */
async function checkFileStatus(fileId) {
  const apiKey = process.env.ZERO_BOUNCE_API_KEY;

  try {
    const response = await axios.get(
      `https://bulkapi.zerobounce.net/v2/filestatus?api_key=${apiKey}&file_id=${fileId}`
    );

    console.log("Status API response:", JSON.stringify(response.data, null, 2));

    if (response.data && response.data.success && response.data.file_status) {
      return response.data.file_status;
    } else if (response.data && response.data.file_status) {
      return response.data.file_status;
    } else {
      console.warn("Unexpected status response:", response.data);
      return "Unknown";
    }
  } catch (error) {
    console.error("Status check error:", error.message);
    throw new Error("Failed to check file status");
  }
}

/**
 * Download result file using direct API call
 * @param {string} fileId - The file ID
 * @returns {Promise<string>} - Path to the downloaded file
 */
async function downloadFile(fileId) {
  const apiKey = process.env.ZERO_BOUNCE_API_KEY;
  const downloadDir = path.join(process.cwd(), "downloads");

  // Create downloads directory if it doesn't exist
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
  }

  const outputPath = path.join(downloadDir, `zb_results_${fileId}.csv`);
  const writer = fs.createWriteStream(outputPath);

  try {
    const response = await axios({
      method: "get",
      url: `https://bulkapi.zerobounce.net/v2/getfile?api_key=${apiKey}&file_id=${fileId}`,
      responseType: "stream",
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`Results downloaded to ${outputPath}`);
        resolve(outputPath);
      });

      writer.on("error", (err) => {
        console.error("Download error:", err);
        reject(new Error("Failed to download results file"));
      });
    });
  } catch (error) {
    console.error("Download error:", error.message);
    throw new Error("Failed to download results file");
  }
}

/**
 * Uses ZeroBounce bulk validation via uploading a CSV file
 *
 * @param {string} filePath - Path to the CSV file
 * @param {number} emailColumnIndex - Column index of email addresses (1-based)
 * @param {boolean} hasHeaderRow - Whether the file has a header row
 * @returns {Promise<[Array<any>, Array<any>]>} - Lists of valid and invalid user records
 */
const zeroBounceValidationBulk = async (
  filePath,
  emailColumnIndex = 1,
  hasHeaderRow = true
) => {
  try {
    console.log("Starting bulk validation process...");

    // Step 1: Upload file using direct API call (workaround for SDK issues)
    console.log("Uploading file to ZeroBounce...");
    let fileId;
    try {
      // Install required dependencies if not already installed
      try {
        require("form-data");
        require("axios");
      } catch (moduleError) {
        console.log("Installing required dependencies...");
        const { execSync } = require("child_process");
        execSync("npm install form-data axios --save", { stdio: "inherit" });
        console.log("Dependencies installed.");
      }

      fileId = await uploadFile(filePath, emailColumnIndex, hasHeaderRow);
      console.log(`File uploaded successfully. File ID: ${fileId}`);
    } catch (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw new Error("Failed to upload file to ZeroBounce");
    }

    // Step 2: Check file status until complete
    console.log("Checking file status...");
    let fileStatus = null;
    let statusComplete = false;
    const startTime = Date.now();

    while (!statusComplete) {
      // Wait 5 seconds between status checks
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        fileStatus = await checkFileStatus(fileId);
        const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`File status: ${fileStatus} (${timeElapsed}s elapsed)`);

        // Check if processing complete or failed
        if (["Complete", "Failed", "Success"].includes(fileStatus)) {
          statusComplete = true;
        }
      } catch (statusError) {
        console.error("Error checking file status:", statusError);
        throw new Error("Failed to check file status");
      }
    }

    if (fileStatus === "Failed") {
      throw new Error("ZeroBounce file processing failed");
    }

    // Step 3: Download the results file
    console.log("File processing complete. Retrieving results...");
    let resultFilePath;
    try {
      resultFilePath = await downloadFile(fileId);
    } catch (downloadError) {
      console.error("Error retrieving results:", downloadError);
      throw new Error("Failed to get validation results");
    }

    // Step 4: Process the results
    console.log(`Processing validation results from ${resultFilePath}...`);

    let validList = [];
    let invalidList = [];

    // Parse the downloaded CSV file
    if (fs.existsSync(resultFilePath)) {
      try {
        const parsedResults = await parseCSV(resultFilePath);
        console.log(`Parsed ${parsedResults.length} results from file`);

        // Debug the first result to see the structure
        if (parsedResults.length > 0) {
          console.log(
            "Sample result structure:",
            JSON.stringify(parsedResults[0], null, 2)
          );
        }

        // Process each row based on the ZeroBounce validation result
        // Look for different possible column names for validation status
        const possibleStatusColumns = [
          "validation_status",
          "status",
          "result",
          "zerobounce_status",
          "valid",
        ];

        for (const row of parsedResults) {
          // Clean up any potential data issues
          Object.keys(row).forEach((key) => {
            // Remove trailing % characters or other unexpected data
            if (typeof row[key] === "string") {
              row[key] = row[key].replace(/%$/, "").trim();
            }
          });

          // Handle specific Company field issue
          if (row.Company === "%") {
            row.Company = "";
          }

          let isValid = false;

          // Check each possible status column
          for (const statusCol of possibleStatusColumns) {
            if (
              row[statusCol] &&
              (row[statusCol].toLowerCase() === "valid" ||
                row[statusCol].toLowerCase() === "true")
            ) {
              isValid = true;
              break;
            }
          }

          // If no status column found, check if there's any field that looks like a status
          if (!isValid) {
            for (const key in row) {
              if (
                key.toLowerCase().includes("status") ||
                key.toLowerCase().includes("valid")
              ) {
                if (
                  row[key] &&
                  (row[key].toLowerCase() === "valid" ||
                    row[key].toLowerCase() === "true")
                ) {
                  isValid = true;
                  break;
                }
              }
            }
          }

          if (isValid) {
            validList.push(row);
          } else {
            invalidList.push(row);
          }
        }

        console.log(
          `Validation complete. Found ${validList.length} valid and ${invalidList.length} invalid emails.`
        );
      } catch (parseError) {
        console.error("Error parsing results file:", parseError);
        throw new Error("Failed to parse validation results");
      }
    } else {
      console.error("Result file not found:", resultFilePath);
      throw new Error("Results file not found");
    }

    // Step 5: Clean up by deleting the local file
    try {
      fs.unlinkSync(resultFilePath);
      console.log("Cleanup complete: Local file deleted");
    } catch (deleteError) {
      console.warn("Warning: Could not delete local file:", deleteError);
    }

    return [validList, invalidList];
  } catch (error) {
    console.error("Bulk validation error:", error);
    throw error;
  }
};

module.exports = zeroBounceValidationBulk;
