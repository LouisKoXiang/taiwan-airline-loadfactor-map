import { createRouter, createWebHistory } from 'vue-router'
import RouteExplorerView from '../views/RouteExplorerView.vue'
import AirlineGrowthView from '../views/AirlineGrowthView.vue'
import { updatePageMeta } from '../utils/seo'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'airline-growth',
      component: AirlineGrowthView,
    },
    {
      path: '/airlines/china-airlines',
      name: 'airline-china-airlines',
      component: AirlineGrowthView,
      meta: { airlineName: '中華航空' },
    },
    {
      path: '/airlines/eva-air',
      name: 'airline-eva-air',
      component: AirlineGrowthView,
      meta: { airlineName: '長榮航空' },
    },
    {
      path: '/airlines/starlux',
      name: 'airline-starlux',
      component: AirlineGrowthView,
      meta: { airlineName: '星宇航空' },
    },
    {
      path: '/airlines/tigerair-taiwan',
      name: 'airline-tigerair-taiwan',
      component: AirlineGrowthView,
      meta: { airlineName: '台灣虎航' },
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
