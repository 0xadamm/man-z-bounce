require("dotenv").config();
const ZeroBounceSDK = require("@zerobounce/zero-bounce-sdk");
const { isValid } = require("./validateEmails");

const zeroBounce = new ZeroBounceSDK();
zeroBounce.init(process.env.ZERO_BOUNCE_API_KEY);

/**
 * Validates email addresses of the users.
 *
 * @param {Array<any>} users - List of users with email information.
 * @returns {Promise<[Array<any>, Array<any>]>} - Lists of valid and invalid users.
 */
const zeroBounceValidation = async (users) => {
  try {
    let count = 0;
    let validList = [];
    let invalidList = [];

    for (const user of users) {
      process.stdout.write(
        `ZeroBounce: ${++count}/${users.length} completed\r`
      );
      const { email } = JSON.parse(user.tags);
      let response;
      try {
        response = await zeroBounce.validateEmail(email);
      } catch (apiError) {
        if (isValid(email)) {
          validList.push(user);
        } else {
          invalidList.push(user);
        }
        continue;
      }
      if (response.status === "valid") {
        validList.push(user);
      } else if (response?.error && isValid(email)) {
        // failedCount++;
        // when zerobounce not works check it by mail checker
        validList.push(user);
      } else {
        invalidList.push(user);
      }
    }
    return [validList, invalidList];
  } catch (error) {
    console.log(error);
    // throw new Error(error.message);
  }
};

module.exports = zeroBounceValidation;
