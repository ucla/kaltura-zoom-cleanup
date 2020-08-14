# Kaltura Zoom Cleanup

AWS Lambda function to delete all Zoom recordings associated to the default user

## Why is this needed?

For the ["Kaltura Video Integration with Zoom"](https://knowledge.kaltura.com/help/kaltura-video-integration-with-zoom) any Zoom recording that is created that does not map to KMC userid is owned by the default user that is specified in the setup.

Rather than leave those "orphaned" recordings on the KMC that can potentially include senstive information from meetings that have been recorded, we want to automatically purge all Zoom recordings owned by the default user.

## Implementation

This is a NodeJS script that will be run as a AWS Lamda function to run once a day. It connects to the a given KMC using the Kaltura API.

It will look for videos owned by the specified default user that have a description that starts with "Zoom Recording". If found, it will delete that entry in the KMC and log that action for debugging later.

## Development setup

To work on this code, please do the following, assuming you have Visual Studio Code, NodeJS, npm, and yarn installed:

1. Run [yarn](https://yarnpkg.com/getting-started/install)
2. Install [AWS Toolkit for Visual Studio Code](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/setting-up.html)
3. Install and setup [git-secrets](https://github.com/awslabs/git-secrets)

## Deployment instructions

To be written once implemented.
