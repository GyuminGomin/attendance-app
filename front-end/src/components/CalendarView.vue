<!-- src/components/CalendarView.vue -->
<template>
  <v-sheet class="calendar" rounded="xl" elevation="0" color="transparent">
    <div class="calendar-header">
      <v-btn
        icon="mdi-chevron-left"
        variant="tonal"
        color="primary"
        density="comfortable"
        aria-label="이전 달"
        @click="prevMonth"
      />

      <div class="calendar-header__label">
        {{ year }}년 {{ month }}월
      </div>

      <v-btn
        icon="mdi-chevron-right"
        variant="tonal"
        color="primary"
        density="comfortable"
        aria-label="다음 달"
        @click="nextMonth"
      />
    </div>

    <div class="calendar-grid">
      <div class="calendar-weekday" v-for="w in weekdays" :key="w">
        {{ w }}
      </div>

      <div
        v-for="blank in startWeekday"
        :key="'blank-' + blank"
        class="calendar-blank"
      ></div>

      <v-btn
        v-for="day in daysInMonth"
        :key="day"
        class="calendar-day"
        :class="{
          'calendar-day--today': isToday(day),
          'calendar-day--attended': isAttended(day),
          'calendar-day--memo': !isChecked(day) && hasMemo(day),
          'calendar-day--selected': isSelected(day),
        }"
        :variant="isSelected(day) ? 'tonal' : isToday(day) ? 'tonal' : 'text'"
        :color="isChecked(day) ? 'success' : isSelected(day) ? 'primary' : isToday(day) ? 'primary' : undefined"
        block
        rounded="lg"
        elevation="0"
        @click="onClickDay(day)"
      >
        <span class="calendar-day__label">
          {{ day }}
          <v-icon
            v-if="isChecked(day)"
            icon="mdi-check-circle"
            size="16"
            class="ml-1"
          />
          <v-icon
            v-else="hasMemo(day)"
            icon="mdi-note-text-outline"
            size="16"
            class="ml-1"
          />
        </span>
      </v-btn>
    </div>
  </v-sheet>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';

interface Props {
  year: number;
  month: number;
  attendedDates: string[]; // "YYYY-MM-DD" 배열
  attendanceMap: Record<string, { checked: boolean; memo?: string }>;
  selectedDate: string | null;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'changeMonth', payload: { year: number; month: number }): void;
  (e: 'selectDate', dateStr: string): void;
}>();

const { year, month, attendedDates } = toRefs(props);

const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;

const daysInMonth = computed<number>(() => new Date(year.value, month.value, 0).getDate());

const startWeekday = computed<number>(() => {
  const firstDay = new Date(year.value, month.value - 1, 1);
  return firstDay.getDay();
});

function getState(day: number) {
  const dateStr = formatDate(day);
  return props.attendanceMap[dateStr]; // 없으면 undefined
}

function isChecked(day: number) {
  return !!getState(day)?.checked
}

function hasMemo(day: number) {
  return !!getState(day)?.memo?.trim()
}

function isSelected(day: number) {
  return props.selectedDate === formatDate(day);
}

function formatDate(day: number) {
  const yyyy = year.value;
  const mm = String(month.value).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isToday(day: number) {
  const today = new Date();
  return (
    today.getFullYear() === year.value &&
    today.getMonth() + 1 === month.value &&
    today.getDate() === day
  );
}

function isAttended(day: number) {
  const dateStr = formatDate(day);
  return attendedDates.value.includes(dateStr);
}

function prevMonth() {
  let y = year.value;
  let m = month.value - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  emit('changeMonth', { year: y, month: m });
}

function nextMonth() {
  let y = year.value;
  let m = month.value + 1;
  if (m === 13) {
    m = 1;
    y += 1;
  }
  emit('changeMonth', { year: y, month: m });
}

function onClickDay(day: number) {
  const dateStr = formatDate(day);
  emit('selectDate', dateStr);
}
</script>
<style scoped lang="scss">
@use '../scss/components/calendar.scss';
</style>