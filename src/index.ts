import * as express from 'express';
import * as socketIO from 'socket.io';
import { TriangularArbitrage } from './lib/triangular-arbitrage';

const path = require('path');
const opn = require('opn');
const app = express();
const server = require('http').createServer(app);
const io = socketIO(server);
const port = process.env.PORT || 3000;

const connected: any[] = [];

io.on('connection', (socket: any) => {
  console.log('客户端已连接 !');

  connected.push(socket);
  const triangularArbitrage = new TriangularArbitrage({ socket });
  triangularArbitrage.start();
  socket.on('disconnect', function(client: any) {
    // when client disconnects
    console.log('客户端断开连接 !');
    const index = connected.indexOf(client);
    connected.splice(index, 1); // remove client from the list of connected clients
  });
});

// express logic
app.get('/', function(req, res) {
  res.sendFile(path.resolve(__dirname, '..', '..') + '/public/index.html'); // serve index.html
});
app.use('/', express.static(path.resolve(__dirname, '..', '..') + '/public')); // serve js and css static files in public

server.listen(port, function() {
  console.log('服务开启');
  opn('http://127.0.0.1:' + port);
}); // start the server
