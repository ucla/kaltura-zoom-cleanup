const kaltura = require('kaltura-client');
const awssecrets = require('@jwerre/secrets').configSync({
  region: 'us-west-2',
});

module.exports.cleanup = async () => {
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

  // Kaltura client outputs the connection details including password to the
  // console.log! Disable logger by renaming it.
  logger = console.log;
  console.log = function() {}

  logger('Cleaning up orphaned Zoom recordings');

  kaltura.services.session
    .start(secret, userId, type, partnerId)
    .completion((success, ks) => {
      if (!success) throw new Error(ks.message);
      client.setKs(ks);
      const filter = new kaltura.objects.BaseEntryFilter();
      filter.userIdEqual = userId;
      filter.descriptionLike = 'Zoom Recording ID:';
      filter.statusEqual = kaltura.enums.EntryStatus.READY;
      const pager = new kaltura.objects.FilterPager();
      pager.pageSize = 500; // Max page size is 500.

      kaltura.services.baseEntry.listAction(filter, pager)
        .execute(client)
        .then((searchResults) => {
          logger(`Processing ${searchResults.totalCount} results`);
          searchResults.objects.forEach((entry) => {
            // Indent description so it can log nicely.
            const description = entry.description.split('\n').join('\n  ');
            logger(`Deleting entry ${entry.id} with description:\n  ${description}`);

            kaltura.services.media.deleteAction(entry.id)
              .execute(client)
              .catch((error) => {
                // Throws ENTRY_ID_NOT_FOUND if cannot delete entry.
                logger(error.message);
              });
          });
        });
    })
    .execute(client);

    logger('DONE!');
};
