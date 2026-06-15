import { createRouter, createWebHashHistory } from 'vue-router'
import RouteExplorerView from '../views/RouteExplorerView.vue'
import AirlineGrowthView from '../views/AirlineGrowthView.vue'
import { updatePageMeta } from '../utils/seo'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'airline-growth',
      component: AirlineGrowthView,
    },
    {
      path: '/routes',
      name: 'route-explorer',
      component: RouteExplorerView,
    },
    {
      path: '/airline-battle',
      redirect: '/',
    },
  ],
})

router.afterEach((to) => {
  updatePageMeta(to.name as string | null)
})

export default router
