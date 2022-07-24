import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'

import store from '@/store/index'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresLogin: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (to.matched.some(record => record.meta.requiresLogin) && store.state.auth.loggedIn == false) {
    await store.dispatch('auth/authenticate');
    if (store.state.auth.loggedIn == false) {
      next("/login")
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
