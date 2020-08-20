<?php declare(strict_types=1);

require __DIR__ . '/vendor/autoload.php';

use Aws\SecretsManager\SecretsManagerClient;
use Aws\Exception\AwsException;
use Kaltura\Client\ApiException;
use Kaltura\Client\Configuration as KalturaConfiguration;
use Kaltura\Client\Client as KalturaClient;
use Kaltura\Client\Enum\EntryStatus;
use Kaltura\Client\Enum\SessionType;
use Kaltura\Client\Type\BaseEntryFilter;
use Kaltura\Client\Type\FilterPager;

return function ($event) {
  $numDeleted = $totalEntries = 0;

  $secretsManager = new Aws\SecretsManager\SecretsManagerClient([
      'version' => 'latest',
      'region' => 'us-west-2'
  ]);
  try {
    logger('Getting KMC secret');
    $secretResult = $secretsManager->getSecretValue([
        'SecretId' => 'kmc_admin'
    ]);
    $secret = json_decode($secretResult['SecretString'], true);

    // Connect to Kaltura.
    logger('Connecting to Kaltura');
    $config = new KalturaConfiguration();
    $config->setServiceUrl('https://www.kaltura.com');
    $client = new KalturaClient($config);
    $ks = $client->generateSession(
        $secret['KMC_ADMIN_SECRET'],
        $secret['KMC_USER_ID'],
        SessionType::ADMIN,
        $secret['KMC_PARTNER_ID']);
    $client->setKS($ks);

    // Search for Zoom recordings belonging to default user.
    logger('Looking for orphaned Zoom recordings belonging to ' . $secret['KMC_USER_ID']);
    $filter = new BaseEntryFilter();
    $filter->userIdEqual = $secret['KMC_USER_ID'];
    $filter->descriptionLike = 'Zoom Recording ID:';
    $filter->statusEqual = EntryStatus::READY;
    $pager = new FilterPager();
    $pager->pageSize = 500; // Max page size is 500.
    $result = $client->getBaseEntryService()->listAction($filter, $pager);

    logger('Found ' . $result->totalCount . ' entries');
    $totalEntries = $result->totalCount;
    foreach ($result->objects as $entry) {
      $description = implode("\n  ", explode("\n", $entry->description));
      logger("Deleting entryId {$entry->id} with description:\n  {$description}");

      // Returns null if there is no error.
      $result = $client->getMediaService()->delete($entry->id);
      if (is_null($result)) {
        ++$numDeleted;
        logger("Deleted entryId {$entry->id}");
      }
    }

  } catch(AwsException $e) {
      // Most likely the error is the secret isn't found.
      return $e->getMessage();
  } catch(Exception $e) {
      // Must be a Kaltura error.
      logger($e->getTraceAsString());
      return $e->getMessage();
  }

  return "Deleted {$numDeleted} out of {$totalEntries} entries";
};

/**
 * Helper function to output messages with a new line automatically.
 */
function logger($msg) {
    echo $msg . "\n";
}
