# Kaltura Zoom Cleanup

AWS Lambda function to delete all Zoom recordings associated to the default user

## Why is this needed?

For the ["Kaltura Video Integration with Zoom"](https://knowledge.kaltura.com/help/kaltura-video-integration-with-zoom) any Zoom recording that is created that does not map to KMC userid is owned by the default user that is specified in the setup.

Rather than leave those "orphaned" recordings on the KMC that can potentially include senstive information from meetings that have been recorded, we want to automatically purge all Zoom recordings owned by the default user.

## Implementation

This is a PHP script that will be run as a AWS Lamda function to run once a hour. It connects to the a given KMC using the Kaltura API.

It will look for videos owned by the specified default user that have a description that starts with "Zoom Recording". If found, it will delete that entry in the KMC and log that action for debugging later.

## Development setup

To work on this code, please do the following:

1. Download [composer](https://getcomposer.org/download/)
2. Run `php composer.phar install`
3. Install [Serverless](https://www.serverless.com/framework/docs/getting-started/)
4. Install [Yarn](https://yarnpkg.com/getting-started/install)
5. Run `yarn`

## Deployment instructions

1. In AWS add a [new IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) that will be running this app.
   - Grant the user this [aws-lambda-policy.json](https://gist.github.com/rlorenzo/df72cafa125fb5b9163803a3dbca6470)
2. Install and configure the Serverless Framework
   - npm install -g serverless
   - sls config credentials --provider aws --key PUBLIC_KEY --secret SECRET_KEY
     - Make sure PUBLIC_KEY and SECRET_KEY belongs to the user you created in Step 1.
     - If you have multiple AWS credentials setup, you can set the given profile by calling:
       `export AWS_PROFILE="<PROFILE NAME>"`
3. Store the following secrets in your [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) in the us-west-2 region named "kmc_admin"
   - KMC_PARTNER_ID (Found in your KMC > Settings > Integration > Partner ID)
   - KMC_USER_ID (User from whom to delete orphaned Zoom recordings)
   - KMC_ADMIN_SECRET (Found in your KMC > Settings > Integration > Administrator Secret)
4. Deploy to AWS
   `sls deploy`

## Resources

- https://developer.kaltura.com/api-docs/Overview
- https://bref.sh/
- https://www.serverless.com/blog/cron-jobs-on-aws/
