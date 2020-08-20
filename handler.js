const kaltura = require('kaltura-client');
const awssecrets = require('@jwerre/secrets').configSync({
  region: 'us-west-2',
});

// Kaltura client outputs the connection details including password to the
// console.log! Disable logger by renaming it.
const logger = console.log;
console.log = function log() {};

module.exports.cleanup = async (event, context, callback) => {
  /*
    Tell lambda to stop when I issue the callback.
    This is super important or the lambda funciton will always go until it hits the timeout limit you set.
    See https://stackoverflow.com/a/42183439/6001
    */
  context.callbackWaitsForEmptyEventLoop = false;

  // How many async processes we should wait for.
  let callBackCount = 0;
  let callBackTotal = 0;
  let callBackReady = false;

  function returnResponse(incrementCallBackCount = true) {
    logger(`returnResponse called: callBackCount = ${callBackCount}, callBackTotal = ${callBackTotal}, callBackReady = ${callBackReady}`);
    if (incrementCallBackCount) {
      callBackCount += 1;
    }

    if (callBackReady && (callBackCount >= callBackTotal)) {
      logger('calling callback');

      // Lambda will stop after this as long as context.callbackWaitsForEmptyEventLoop was set to false
      callback(null, `Finished processing ${callBackCount} out of ${callBackTotal} entries`);
      // For some reason AWS Lambda does not exit when callback is made, so return to break out of wait loop.
      return true;
    }
    return false;
  }

  async function deleteEntry(client, entryId) {
    return kaltura.services.media.deleteAction(entryId)
      .execute(client)
      .then((result) => {
        // THIS NEVER GETS CALLED!!!!!
        logger(`Deleted entry: ${result}`);
        returnResponse();
      })
      .catch((error) => {
        // Throws ENTRY_ID_NOT_FOUND if cannot delete entry.
        logger(`Error: ${error.message}`);
      });
  }

  if (!awssecrets.kmc_admin) {
    logger('No KMC Admin secrets found');
    process.exit(1);
  }

  const config = new kaltura.Configuration();
  config.serviceUrl = 'https://www.kaltura.com';
  const client = new kaltura.Client(config);
  const secret = awssecrets.kmc_admin.KMC_USER_SECRET;
  const userId = awssecrets.kmc_admin.KMC_USER_ID;
  const type = kaltura.enums.SessionType.USER;
  const partnerId = awssecrets.kmc_admin.KMC_PARTNER_ID;

  logger('Cleaning up orphaned Zoom recordings');

  return kaltura.services.session
    .start(secret, userId, type, partnerId)
    .execute(client)
    .then((ks) => {
      if (!ks) throw new Error(ks.message);
      logger('Kaltura services session opened');
      client.setKs(ks);
      const filter = new kaltura.objects.BaseEntryFilter();
      filter.userIdEqual = userId;
      filter.descriptionLike = 'Zoom Recording ID:';
      filter.statusEqual = kaltura.enums.EntryStatus.READY;
      const pager = new kaltura.objects.FilterPager();
      pager.pageSize = 500; // Max page size is 500.

      return kaltura.services.baseEntry.listAction(filter, pager)
        .execute(client)
        .then((searchResults) => {
          logger(`Processing ${searchResults.totalCount} results`);

          searchResults.objects.forEach((entry) => {
            callBackTotal += 1;
            // Indent description so it can log nicely.
            const description = entry.description.split('\n').join('\n  ');
            logger(`Deleting entry ${entry.id} with description:\n  ${description}`);
            deleteEntry(client, entry.id);
          });

          // Added all entries to be deleted so callBackTotal is final.
          callBackReady = true;

          let finishedProcessing = false;
          do {
            finishedProcessing = returnResponse(false);
          } while (!finishedProcessing);
        });
    });
};
