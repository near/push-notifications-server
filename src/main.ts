import 'dotenv/config';
import { WebSocket } from 'ws';
import { PubSub } from '@google-cloud/pubsub';


const PROJECT_ID = process.env.PROJECT_ID || 'test-project';
const TOPIC_NAME = process.env.TOPIC_NAME || 'test';
const BLOCK_HEIGHT = process.env.START_BLOCK_HEIGHT;
const QUERY_API_ENDPOINT = process.env.QUERY_API_ENDPOINT || 'near-queryapi.api.pagoda.co';


const pubsub = new PubSub({projectId: PROJECT_ID});
const topic = pubsub.topic(TOPIC_NAME);

const notificationsSubscriptionQuery = `
subscription Notifications {
  charleslavon_near_n0_notifications(where: 
    { blockHeight: { _gt: ${BLOCK_HEIGHT} } }) {
    id
    blockHeight
    initiatedBy
    itemType
    message
    path
    receiver
    valueType
  }
}
`;

const notificationsSubscription = {
  type: 'start',
  id: 'notifications',
  payload: {
    operationName: 'Notifications',
    query: notificationsSubscriptionQuery,
    variables: {},
  },
};

const ws = new WebSocket(`wss://${QUERY_API_ENDPOINT}/v1/graphql`, 'graphql-ws');

ws.onopen = () => {
  console.log(`Connection to WS has been established`);
  ws.send(
    JSON.stringify({
      type: 'connection_init',
      payload: {
        headers: {
          'Content-Type': 'application/json',
          'Hasura-Client-Name': 'hasura-console',
          'x-hasura-role': 'charleslavon_near',
        },
        lazy: true,
      },
    }),
  );

  setTimeout(() => ws.send(JSON.stringify(notificationsSubscription)), 50);
};

ws.onclose = () => {
  console.log(`WS Connection has been closed`);
};

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.payload?.errors) {
    console.log('Errors', data.payload.errors);
  } else if (data.id == 'notifications' && data.payload?.data?.charleslavon_near_n0_notifications) {
    const messages = data.payload?.data?.charleslavon_near_n0_notifications;
    console.log('Received data', messages);

    if (messages.length > 0) {
      messages.forEach( (message) => {
        console.log('Publishing message', message);
        topic.publishMessage({data: Buffer.from(JSON.stringify(message))});
        console.log('Message published');

      });
    }
  }
};

ws.onerror = (err) => {
  console.log('WebSocket error', err);
};
