<!-- src/components/CalendarView.vue -->
<template>
  <div class="calendar">
    <div class="calendar-header">
      <button @click="prevMonth">&lt;</button>
      <div>{{ year }}년 {{ month }}월</div>
      <button @click="nextMonth">&gt;</button>
    </div>

    <div class="calendar-grid">
      <div class="weekday" v-for="w in weekdays" :key="w">{{ w }}</div>

      <div
        v-for="blank in startWeekday"
        :key="'blank-' + blank"
        class="day blank"
      ></div>

      <div
        v-for="day in daysInMonth"
        :key="day"
        class="day"
        :class="{
          today: isToday(day),
          attended: isAttended(day)
        }"
        @click="onClickDay(day)"
      >
        {{ day }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  year: number;
  month: number;
  attendedDates: string[]; // "YYYY-MM-DD" 배열
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'changeMonth', payload: { year: number; month: number }): void;
  (e: 'selectDate', dateStr: string): void;
}>();

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

const daysInMonth = computed(() => {
  return new Date(props.year, props.month, 0).getDate();
});

const startWeekday = computed(() => {
  // 해당 월 1일의 요일 (0: 일 ~ 6: 토)
  const d = new Date(props.year, props.month - 1, 1);
  return d.getDay();
});

function formatDate(day: number) {
  const yyyy = props.year;
  const mm = String(props.month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isToday(day: number) {
  const today = new Date();
  return (
    today.getFullYear() === props.year &&
    today.getMonth() + 1 === props.month &&
    today.getDate() === day
  );
}

function isAttended(day: number) {
  const dateStr = formatDate(day);
  return props.attendedDates.includes(dateStr);
}

function prevMonth() {
  let y = props.year;
  let m = props.month - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  emit('changeMonth', { year: y, month: m });
}

function nextMonth() {
  let y = props.year;
  let m = props.month + 1;
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

<style scoped>
.calendar {
  width: 360px;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.weekday {
  text-align: center;
  font-weight: bold;
}
.day {
  text-align: center;
  padding: 6px 0;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}
.day.today {
  outline: 2px solid #888;
}
.day.attended {
  background-color: #b3e6b3;
}
.day.blank {
  visibility: hidden;
}
</style>
