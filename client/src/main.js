import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

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
