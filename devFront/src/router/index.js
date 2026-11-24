import { createRouter, createWebHashHistory } from 'vue-router';

const baseRoutes = [
  {
    path: '/ssoLogin',
    name: 'ssoLogin',
    component: () => import('@/views/Login/LoginPageSSO.vue'),
    meta: { title: 'title.login' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/LoginPage.vue'),
    meta: { title: 'title.login' },
  },
  {
    path: '/',
    redirect: import.meta.env.VITE_ROUTE_DEFAULT,
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes: baseRoutes,
});

export default router;
