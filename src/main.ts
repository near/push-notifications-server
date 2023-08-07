import { WebSocket } from 'ws';

const GRAPHQL_ENDPOINT = 'near-queryapi.api.pagoda.co';
const BLOCK_HEIGHT = 98059353;
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

const ws = new WebSocket(`wss://${GRAPHQL_ENDPOINT}/v1/graphql`, 'graphql-ws');

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
  if (data.id == 'notifications') {
    console.log('received data', data);
    if (data.payload?.errors) {
      console.log('Errors', data.payload.errors);
    } else if (data.payload?.data?.charleslavon_near_n0_notifications) {
      console.log(data.payload?.data?.charleslavon_near_n0_notifications);
    }
  }
};

ws.onerror = (err) => {
  console.log('WebSocket error', err);
};
