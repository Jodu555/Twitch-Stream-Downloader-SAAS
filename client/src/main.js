import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import { io } from "socket.io-client";

// const socket = io.connect('ws://localhost:3200', {
//     auth: 'SECR-DEV'
// });

const socket = io('http://localhost:3200', {
    auth: {
        token: 'SECR-DEV'
    }
})

socket.on('connect', () => {
    console.log('Conected');
})

const networkingPlugin = {
    install: (app, options) => {
        const aBase = location.hostname == 'localhost' ? 'http://localhost:3200' : 'http://0dba-2003-df-8742-fec9-2996-e4f7-5ceb-629a.ngrok.io'
        app.config.globalProperties.$networking = new Networking(aBase, '');
    }
}

const app = createApp(App);

app.use(networkingPlugin);
app.use(store);
app.use(router);

store.$networking = app.config.globalProperties.$networking;
app.mount('#app');
