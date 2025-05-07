const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { createObjectCsvWriter } = require("csv-writer");

// Define input and output paths
const inputFile = path.join(
  __dirname,
  "output",
  "csv",
  "merged_data_2025-03-27T03-00-15-552Z.csv"
);
const outputDir = path.join(__dirname, "output", "csv", "by-ailment");

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to normalize ailment names (handle spelling variations)
function normalizeAilmentName(ailment) {
  ailment = ailment.toLowerCase();

  // Handle common variations
  if (ailment.includes("crohn") || ailment.includes("chron")) {
    return "crohns_disease";
  } else if (ailment === "diabetes") {
    return "diabetes";
  } else if (ailment === "arthritis") {
    return "arthritis";
  } else if (ailment.includes("chronic pain")) {
    return "chronic_pain";
  } else if (ailment === "gout") {
    return "gout";
  } else if (ailment === "ibs") {
    return "ibs";
  } else if (ailment === "ibd") {
    return "ibd";
  } else if (ailment === "ms" || ailment.includes("multiple sclerosis")) {
    return "multiple_sclerosis";
  } else if (ailment === "als") {
    return "als";
  } else if (ailment.includes("migraine")) {
    return "migraines";
  } else if (ailment.includes("neuropathy")) {
    return "neuropathy";
  } else if (ailment.includes("menstrual")) {
    return "menstrual_cramps";
  } else if (ailment.includes("autoimmune")) {
    return "autoimmune";
  } else if (ailment.includes("inflammation")) {
    return "inflammation";
  } else if (ailment.includes("concussion")) {
    return "concussion";
  } else if (ailment.includes("colitis")) {
    return "colitis";
  } else if (ailment === "pcos") {
    return "pcos";
  } else if (ailment.includes("lyme")) {
    return "lyme";
  } else {
    return ailment; // Return as is if no specific handling
  }
}

// Process the CSV file
async function processCSV() {
  const ailmentGroups = {};
  const headers = [];
  let firstRow = true;

  console.log(`Reading CSV file: ${inputFile}`);

  return new Promise((resolve, reject) => {
    fs.createReadStream(inputFile)
      .pipe(csv())
      .on("headers", (headerList) => {
        headers.push(...headerList);
      })
      .on("data", (row) => {
        // Extract ailments from the "Ailment Tags" column
        const ailmentTagsStr = row["Ailment Tags"] || "";
        const ailmentTags = ailmentTagsStr.split(";").map((tag) => tag.trim());

        // Process each ailment in the row
        ailmentTags.forEach((ailmentTag) => {
          if (!ailmentTag) return;

          const normalizedAilment = normalizeAilmentName(ailmentTag);

          // Initialize array for this ailment if it doesn't exist
          if (!ailmentGroups[normalizedAilment]) {
            ailmentGroups[normalizedAilment] = [];
          }

          // Add the row to the ailment group (only once per row)
          if (
            !ailmentGroups[normalizedAilment].some(
              (existingRow) =>
                existingRow["Email Address"] === row["Email Address"]
            )
          ) {
            ailmentGroups[normalizedAilment].push(row);
          }
        });
      })
      .on("end", async () => {
        try {
          console.log(
            `Found ${Object.keys(ailmentGroups).length} unique ailment groups`
          );

          // Write each ailment group to its own CSV file
          for (const [ailment, rows] of Object.entries(ailmentGroups)) {
            if (rows.length > 0) {
              const outputFile = path.join(outputDir, `${ailment}.csv`);

              const csvWriter = createObjectCsvWriter({
                path: outputFile,
                header: headers.map((header) => ({
                  id: header,
                  title: header,
                })),
              });

              await csvWriter.writeRecords(rows);
              console.log(`Created ${outputFile} with ${rows.length} records`);
            }
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

// Run the script
processCSV()
  .then(() => {
    console.log("CSV splitting completed successfully!");
  })
  .catch((error) => {
    console.error("Error processing CSV:", error);
  });
