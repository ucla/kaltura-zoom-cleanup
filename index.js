require('dotenv').config();

const kaltura = require('kaltura-client');

const config = new kaltura.Configuration();
config.serviceUrl = 'https://www.kaltura.com';
const client = new kaltura.Client(config);
const secret = process.env.KMC_USER_SECRET;
const userId = process.env.KMC_USER_ID;
const type = kaltura.enums.SessionType.USER;
const partnerId = process.env.KMC_PARTNER_ID;

console.log('Starting session');

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
        console.log(`Processing ${searchResults.totalCount} results`);
        searchResults.objects.forEach((entry) => {
          // Indent description so it can log nicely.
          const description = entry.description.split('\n').join('\n  ');
          console.log(`Deleting entry ${entry.id} with description:\n  ${description}`);

          kaltura.services.media.deleteAction(entry.id)
            .execute(client)
            .catch((error) => {
              // Throws ENTRY_ID_NOT_FOUND if cannot delete entry.
              console.log(error.message);
            });
        });
      });
  })
  .execute(client);
