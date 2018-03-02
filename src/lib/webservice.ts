import * as express from 'express';
import * as socketIO from 'socket.io';

const path = require('path');
const app = express();
const server = require('http').createServer(app);
const io = socketIO(server);
const port = process.env.PORT || 3000;

export class WebService {
  connected: any[] = [];
  start() {

    const that = this;
    io.on('connection', (socket: any) => {
      console.log('客户端已连接 !');

      that.connected.push(socket);
      socket.on('disconnect', function (client: any) {
        // when client disconnects
        console.log('客户端断开连接 !');
        const index = that.connected.indexOf(client);
        that.connected.splice(index, 1); // remove client from the list of connected clients
      });
    });

    // express logic
    app.get('/', function (req, res) {
      res.sendFile(path.resolve(__dirname, '..', '..') + '/public/index.html'); // serve index.html
    });
    app.use('/', express.static(path.resolve(__dirname, '..', '..') + '/public')); // serve js and css static files in public

    server.listen(port, function () {
      console.log('服务已开启！');
      console.log('请使用浏览器打开: http://127.0.0.1:' + port);
    });
  }

}

