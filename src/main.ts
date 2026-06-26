import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles.css'
import 'flag-icons/css/flag-icons.min.css'

createApp(App).use(createPinia()).use(router).mount('#app')
