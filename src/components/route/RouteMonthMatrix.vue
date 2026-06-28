<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RouteMatrixData, RouteMatrixCell } from '../../stores/routeInsightStore'

const props = defineProps<{
  data: RouteMatrixData
}>()

const fmt = new Intl.NumberFormat('zh-TW')
const formatNum = (n: number) => fmt.format(Math.round(n))

interface TooltipState {
  visible: boolean
  x: number
  y: number
  flip: boolean
  month: string
  airlineName: string
  airlineCode: string
  color: string
  cell: RouteMatrixCell | null
}

const tooltip = ref<TooltipState>({
  visible: false,
  x: 0,
  y: 0,
  flip: false,
  month: '',
  airlineName: '',
  airlineCode: '',
  color: '',
  cell: null,
})

function showTooltip(
  event: MouseEvent,
  month: string,
  airlineName: string,
  airlineCode: string,
  color: string,
  cell: RouteMatrixCell,
) {
  const target = event.currentTarget as HTMLElement
  const wrap = target.closest('.rmx-scroll') as HTMLElement | null
  if (!wrap) return
  const wrapRect = wrap.getBoundingClientRect()
  const cellRect = target.getBoundingClientRect()
  const relX = cellRect.left - wrapRect.left + cellRect.width / 2
  const relY = cellRect.top - wrapRect.top

  tooltip.value = {
    visible: true,
    x: relX,
    y: relY,
    flip: relX > wrapRect.width * 0.6,
    month,
    airlineName,
    airlineCode,
    color,
    cell,
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}

function shortMonth(m: string) {
  return m.replace(/(\d+)年(\d+)月/, '$2')
}

function yearLabel(m: string) {
  return m.replace(/(\d+)年(\d+)月/, '$1年')
}

const yearGroups = computed(() => {
  const groups: { year: string; months: string[] }[] = []

  for (const month of props.data.months) {
    const year = yearLabel(month)
    const last = groups[groups.length - 1]
    if (last?.year === year) {
      last.months.push(month)
    } else {
      groups.push({ year, months: [month] })
    }
  }

  return groups
})
</script>

<template>
  <div class="rmx-wrap">
    <div class="rmx-scroll">
      <table class="rmx-table">
        <thead>
          <tr>
            <th class="rmx-th-airline" rowspan="2">航司</th>
            <th
              v-for="group in yearGroups"
              :key="group.year"
              class="rmx-th-year"
              :colspan="group.months.length"
            >
              {{ group.year }}
            </th>
          </tr>
          <tr>
            <th
              v-for="month in data.months"
              :key="month"
              class="rmx-th-month"
            >
              {{ shortMonth(month) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="airline in data.airlines" :key="airline.airlineName">
            <td class="rmx-td-airline">
              <span class="rmx-airline-dot" :style="{ background: airline.color }"></span>
              <span class="rmx-airline-code">{{ airline.airlineCode }}</span>
            </td>
            <td
              v-for="cell in airline.cells"
              :key="cell.month"
              class="rmx-td-cell"
              @mouseenter="showTooltip($event, cell.month, airline.airlineName, airline.airlineCode, airline.color, cell)"
              @mouseleave="hideTooltip"
            >
              <span
                v-if="cell.hasService"
                class="rmx-dot"
                :style="{ background: airline.color }"
              ></span>
              <span v-else class="rmx-dash">–</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Tooltip -->
      <div
        v-if="tooltip.visible && tooltip.cell"
        class="rmx-tooltip"
        :style="{
          left: tooltip.flip ? 'auto' : tooltip.x + 8 + 'px',
          right: tooltip.flip ? `calc(100% - ${tooltip.x - 8}px)` : 'auto',
          top: tooltip.y - 8 + 'px',
          transform: 'translateY(-100%)',
        }"
      >
        <div class="rmx-tt-head">
          <span class="rmx-tt-dot" :style="{ background: tooltip.color }"></span>
          <strong>{{ tooltip.airlineCode }}</strong>
          <span>{{ tooltip.month }}</span>
        </div>
        <template v-if="tooltip.cell.hasService">
          <div class="rmx-tt-row">
            <span>載客率</span>
            <strong>{{ tooltip.cell.loadFactor?.toFixed(1) ?? '—' }}%</strong>
          </div>
          <div class="rmx-tt-row">
            <span>旅客</span>
            <strong>{{ tooltip.cell.passengerCount != null ? formatNum(tooltip.cell.passengerCount) : '—' }}</strong>
          </div>
          <div class="rmx-tt-row">
            <span>班次</span>
            <strong>{{ tooltip.cell.flightCount != null ? formatNum(tooltip.cell.flightCount) : '—' }}</strong>
          </div>
        </template>
        <div v-else class="rmx-tt-no-service">本月無班次</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../../styles/variables' as *;
@use '../../styles/mixins' as *;

.rmx {
  &-wrap {
    border: 1px solid var(--ink-100);
    border-radius: $radius-sm;
    overflow: hidden;
    background: #fff;
  }

  &-scroll {
    overflow-x: auto;
    position: relative;
    -webkit-overflow-scrolling: touch;
  }

  &-table {
    border-collapse: collapse;
    min-width: 100%;
    font-size: 0.8rem;

    thead tr {
      background: var(--ink-50, #f9fafb);
      border-bottom: 1px solid var(--ink-100);
    }

    tbody tr {
      border-bottom: 1px solid var(--ink-100);
      &:last-child { border-bottom: none; }
      &:hover { background: var(--ink-50, #f9fafb); }
    }
  }

  &-th-airline {
    padding: 6px 12px;
    text-align: left;
    font-weight: 700;
    color: var(--ink-400);
    white-space: nowrap;
    position: sticky;
    left: 0;
    background: var(--ink-50, #f9fafb);
    z-index: 4;
    min-width: 58px;
    border-right: 1px solid var(--ink-100);
  }

  &-th-year {
    padding: 5px 4px 3px;
    text-align: center;
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--ink-300);
    border-left: 1px solid var(--ink-100);
  }

  &-th-month {
    padding: 3px 4px 6px;
    text-align: center;
    font-weight: 600;
    color: var(--ink-400);
    white-space: nowrap;
    min-width: 34px;
    font-size: 0.72rem;
  }

  &-td-airline {
    padding: 8px 10px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    position: sticky;
    left: 0;
    background: #fff;
    z-index: 3;
    border-right: 1px solid var(--ink-100);

    .rmx-table tbody tr:hover & {
      background: var(--ink-50, #f9fafb);
    }
  }

  &-airline-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &-airline-code {
    font-weight: 700;
    font-size: 0.8rem;
    color: var(--ink-600);
  }

  &-td-cell {
    padding: 5px 4px;
    text-align: center;
    vertical-align: middle;
    cursor: default;
  }

  &-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    vertical-align: middle;
  }

  &-dash {
    display: inline-block;
    width: 10px;
    color: var(--ink-200);
    font-size: 0.9rem;
    vertical-align: middle;
  }

  // Tooltip
  &-tooltip {
    position: absolute;
    background: #fff;
    border: 1px solid var(--ink-100);
    border-radius: $radius-sm;
    padding: 8px 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    font-size: 0.8rem;
    min-width: 140px;
    pointer-events: none;
    z-index: $z-matrix-tooltip;
  }

  &-tt-head {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.78rem;
    margin-bottom: 6px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--ink-100);
  }

  &-tt-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }

  &-tt-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 2px 0;
    color: var(--ink-500);

    strong { color: var(--ink-700); }
  }

  &-tt-no-service {
    color: var(--ink-300);
    font-style: italic;
  }

  @include respond-to(sm) {
    &-table {
      font-size: 0.76rem;
    }

    &-th-airline {
      min-width: 54px;
      padding: 6px 9px;
    }

    &-th-year {
      font-size: 0.64rem;
      padding-top: 4px;
    }

    &-th-month {
      min-width: 32px;
      font-size: 0.68rem;
    }

    &-td-airline {
      padding: 8px 9px;
    }

    &-tooltip {
      display: none;
    }
  }
}
</style>
