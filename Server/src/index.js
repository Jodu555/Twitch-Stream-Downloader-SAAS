const http = require('http');
const express = require('express');
const { Server } = require("socket.io");
const https = require('https');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv').config();
const { setIO, getIO } = require('./utils/utils');
const { ErrorHelper, AuthenticationHelper } = require('@jodu555/express-helpers');

const { Database } = require('@jodu555/mysqlapi');
const database = Database.createDatabase(process.env.DB_HOST, 'twitcher', process.env.DB_PASSWORD, 'twitch-stream-downloader');
database.connect();
require('./utils/database')();

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(helmet());
app.use(express.json());

const authHelper = new AuthenticationHelper(app, '/auth', database);
authHelper.addToken('SECR-DEV', { "UUID": "0d9a088d-6704-4880-b1f1-d9c806ca8554", "username": "Jodu", "email": "test@test.com" });
authHelper.options.register = true;
authHelper.install();

let server;
if (process.env.https) {
    const sslProperties = {
        key: fs.readFileSync(process.env.KEY_FILE),
        cert: fs.readFileSync(process.env.CERT_FILE),
    };
    server = https.createServer(sslProperties, app)
} else {
    server = http.createServer(app);
}

setIO(new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
}));



const io = getIO();

io.use((socket, next) => {
    const authToken = socket.handshake.auth.token;
    console.log(1, authToken);
    if (authToken && authHelper.getUser(authToken)) {
        console.log(2);
        if (authToken) {
            console.log(`Socket with`);
            console.log(`   ID: ${socket.id}`);
            console.log(`  proposed with ${authToken}`);
            socket.auth = { token: authToken, user: authHelper.getUser(authToken) };
            return next();
        } else {
            return next(new Error('Authentication error'));
        }
    } else {
        next(new Error('Authentication error'));
    }
})

io.on('connection', (socket) => {
    console.log('Socket Connection:', socket.id);

    console.log(socket.auth);

    socket.on('disconnect', () => {
        console.log('Socket DisConnection:', socket.id);
    })

});

const errorHelper = new ErrorHelper()
app.use(errorHelper.install());

// Your Middleware handlers here


const PORT = process.env.PORT || 3200;
server.listen(PORT, () => {
    console.log(`Express App Listening ${process.env.https ? 'with SSL ' : ''}on ${PORT}`);
});