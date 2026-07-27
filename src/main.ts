import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { updateSeo } from './utils/seo'

import './assets/styles/tokens.css'
import './assets/styles/base.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

router.afterEach((to) => {
  updateSeo({ title: to.meta.title, description: to.meta.description })
})

app.mount('#app')
