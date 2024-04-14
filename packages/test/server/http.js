const net = require('net');

// Simulate headers with same name
const server = net.createServer(socket => {
    socket.write(`HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
set-cookie: foo-get1=bar
set-cookie: foo-get2=bar
set-gigi: gigi1
set-gigi: gigi2
date: Sun, 03 Apr 2022 11:05:46 GMT
content-length: 0
connection: close
access-control-allow-methods: *
access-control-expose-headers: *
\n\nhello world`)
    socket.end((err)=>{console.log(err)})
});

server.listen(8091);