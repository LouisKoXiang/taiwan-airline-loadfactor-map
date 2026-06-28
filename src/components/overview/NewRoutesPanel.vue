<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { NewRouteStat } from '../../stores/marketOverviewStore'
import { AIRLINE_META, FOUR_AIRLINES } from '../../types/airline'

const props = defineProps<{
  routes: NewRouteStat[]
  currentYear: number
  previousYear: number
}>()

const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))

const airlineCards = computed(() =>
  FOUR_AIRLINES.map((airline) => {
    const routes = props.routes.filter((r) => r.airline === airline)
    return {
      airline,
      code: AIRLINE_META[airline].code,
      color: AIRLINE_META[airline].accent,
      routes,
      passengerCount: routes.reduce((s, r) => s + r.passengerCount, 0),
    }
  }),
)
</script>

<template>
  <div class="new-routes-card">
    <div class="new-routes-head">
      <div>
        <h3>航司別新增航點</h3>
        <p>{{ currentYear }} 年目前累積有飛、{{ previousYear }} 年同期未出現的航線。</p>
      </div>
      <strong class="new-routes-total">{{ routes.length }}</strong>
    </div>

    <p v-if="routes.length === 0" class="new-routes-empty">
      目前沒有相較去年同期新增的航點。
    </p>

    <div v-else class="new-routes-airline-grid">
      <article
        v-for="card in airlineCards"
        :key="card.airline"
        class="new-route-airline-card"
        :style="{ '--route-accent': card.color }"
      >
        <div class="new-route-airline-head">
          <div>
            <span class="new-route-code">{{ card.code }}</span>
            <strong>{{ card.airline }}</strong>
          </div>
          <span class="new-route-count">{{ card.routes.length }}</span>
        </div>

        <p v-if="card.routes.length === 0" class="new-route-card-empty">無新增航點</p>

        <div v-else class="new-route-pills">
          <RouterLink
            v-for="route in card.routes"
            :key="`${route.originAirportCode}-${route.destinationAirportCode}`"
            :to="`/routes/${route.originAirportCode}-${route.destinationAirportCode}`"
            class="new-route-pill"
          >
            <strong>{{ route.originAirportCode }} → {{ route.destinationAirportCode }}</strong>
            <span>{{ route.destinationCityName }}</span>
            <small>{{ formatNum(route.passengerCount) }} 人</small>
          </RouterLink>
        </div>

        <div class="new-route-airline-foot">
          累積 {{ formatNum(card.passengerCount) }} 人
        </div>
      </article>
    </div>
  </div>
</template>
