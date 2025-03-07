/**
 * Usage
 *
 * var MailChecker = require('mailchecker/platform/node')
 * MailChecker.isValid(String email);
 * @return {Boolean} true is the specified email is valid, false otherwise
 */

var range = require("node-range");

// Simplified blacklist with just a few sample domains
// The actual file contains thousands of blacklisted domains (55,803 lines)
var blacklist = new Set([
  "0-00.usa.cc",
  "0-mail.com",
  "00-tv.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "fakeinbox.com",
  "guerrillamail.com",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "spam4.me",
  "dispostable.com",
  "mailnull.com",
  "maildrop.cc",
  "10minutemail.com",
  // ... many more domains in the original file
]);

/**
 * Validates email by checking against blacklisted domains
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email is valid (not blacklisted)
 */
function isValid(email) {
  if (!email) {
    return false;
  }

  // Extract domain from email
  var domain = email.split("@").pop().toLowerCase();

  // Check if domain is in blacklist
  return !blacklist.has(domain);
}

// Export function
module.exports = { isValid };
