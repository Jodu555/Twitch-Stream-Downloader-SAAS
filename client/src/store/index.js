import { createStore } from 'vuex'

import auth from '@/store/auth.store';

export default createStore({
  state: {
  },
  getters: {
  },
  mutations: {
  },
  actions: {
    reset({ commit }) {
      commit('auth/reset')
    },
  },
  modules: {
    auth
  }
})
