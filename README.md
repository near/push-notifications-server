# Push notifications server

## Quick start

Run to build:
`npm run build`

Run to start:
`npm run dev`

## Using Pub/Sub emulator

Install Pub/Sub:

`gcloud components install pubsub-emulator`
`gcloud components update`

Start the emulator:

`gcloud beta emulators pubsub start --project=test-project`

Setup the topic by sending a PUT request:

`curl --location --request PUT 'http://localhost:8085/v1/projects/test-project/topics/test'`

Export the environment variables by running the following command in the terminal where the push notifications server will be started:

`$(gcloud beta emulators pubsub env-init)`

Start the server:

`npm run dev`

## Docker

Build an image:

`docker build -t push-notifications-server .`

Start the image locally:

`docker run -e PUBSUB_EMULATOR_HOST='localhost:8085' -e START_BLOCK_HEIGHT='99093343' push-notifications-server node "build/src/main.js"`

