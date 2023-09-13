import 'dotenv/config';
import { WebSocket } from 'ws';
import { PubSub } from '@google-cloud/pubsub';


const PROJECT_ID = process.env.PROJECT_ID || 'test-project';
const TOPIC_NAME = process.env.TOPIC_NAME || 'test';
let BLOCK_HEIGHT = Number(process.env.START_BLOCK_HEIGHT);
const QUERY_API_ENDPOINT = process.env.QUERY_API_ENDPOINT || 'near-queryapi.api.pagoda.co';


const pubsub = new PubSub({projectId: PROJECT_ID});
const topic = pubsub.topic(TOPIC_NAME);

const notificationsSubscriptionQuery = `
subscription Notifications {
  charleslavon_near_n0_notifications_stream(cursor: { initial_value: { blockHeight: ${BLOCK_HEIGHT} }, ordering: ASC }, batch_size: 1) {
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

const timeout = 10; // seconds

function connect(address, protocols, options) {
    const ws = new WebSocket(address, protocols, options);
    const timerTimeout = setTimeout(() => ws.terminate(), timeout * 1000); // force close unless cleared on 'open'
    ws.onopen = () => {
      console.log(`Connection to WS has been established`);
      ws._socket.setKeepAlive(true, 100);
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
      clearTimeout(timerTimeout);
      setInterval(() => ws.ping(JSON.stringify({ event: "ping" })), 10000);
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.payload?.errors) {
        console.log('Errors', data.payload.errors);
      } else if (data.id == 'notifications' && data.payload?.data?.charleslavon_near_n0_notifications_stream) {
        const messages = data.payload?.data?.charleslavon_near_n0_notifications_stream;
        console.log('Received data', messages);
    
        if (messages.length > 0) {
          messages.forEach( (message) => {
            console.log('Publishing message', message);
            topic.publishMessage({data: Buffer.from(JSON.stringify(message))}).then(() =>{
              console.log('Message published, id: ' + message.id);
              BLOCK_HEIGHT = BLOCK_HEIGHT > message.blockHeight ?  BLOCK_HEIGHT : message.blockHeight - 60 * 1;
            });
    
          });
        }
      }
    };
    ws.on('pong', () => console.debug("PONG. Starting block height: " + BLOCK_HEIGHT));

    ws.onclose = (e) => {
      console.log(`WS Connection has been closed`, e);
      clearTimeout(timerTimeout);
      console.error('Websocket connection closed. Reconnecting in %f seconds ...', timeout);
      setTimeout(() => connect(address, protocols, options), timeout * 1000);

    };

    ws.onerror = (err) => {
      console.log('WebSocket error', err);
    };
    return ws;
}

connect(`wss://${QUERY_API_ENDPOINT}/v1/graphql`, 'graphql-ws', null);

