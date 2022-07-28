import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import { io } from "socket.io-client";

// const socket = io.connect('ws://localhost:3200', {
//     auth: 'SECR-DEV'
// });

const serverURL = location.hostname == 'localhost' ? 'http://localhost:3200' : 'http://0dba-2003-df-8742-fec9-2996-e4f7-5ceb-629a.ngrok.io';

const socketPlugin = {
    install: (app, options) => {
        app.config.globalProperties.$socket = io(serverURL, {
            auth: {
                token: 'SECR-DEV'
            }
        });
    }
}

const networkingPlugin = {
    install: (app, options) => {
        app.config.globalProperties.$networking = new Networking(serverURL, '');
    }
}

const socket = app.config.globalProperties.$socket;

socket.on('connect', () => {
    console.log('Connected');
})

socket.on('stats', (data) => {
    console.log('Got Stats-Update: ', data);
})

socket.on("connect_error", (err) => {
    console.log('Socket Connect Error: ', err.message); // prints the message associated with the error
});

const app = createApp(App);

app.use(networkingPlugin);
app.use(socketPlugin);
app.use(store);
app.use(router);

store.$networking = app.config.globalProperties.$networking;
store.$socket = app.config.globalProperties.$socket;
app.mount('#app');
