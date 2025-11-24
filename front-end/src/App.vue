<!-- src/App.vue -->
<template>
  <div class="app">
    <header class="app-header">
      <h1>출석 & 일정 기록</h1>
      <p v-if="attendanceInfo">
        {{ attendanceInfo.date }} 출석:
        <strong>{{ attendanceInfo.newlyChecked ? '오늘 새로 체크됨 ✅' : '이미 체크됨 ✅' }}</strong>
      </p>
    </header>

    <main class="app-main">
      <CalendarView
        :year="currentYear"
        :month="currentMonth"
        :attendedDates="attendedDates"
        @changeMonth="onChangeMonth"
        @selectDate="onSelectDate"
      />

      <section class="event-panel" v-if="selectedDate">
        <h2>{{ selectedDate }} 일정</h2>
        <textarea
          v-model="memo"
          placeholder="이 날짜의 메모를 적어보세요"
          rows="8"
        ></textarea>

        <button @click="saveMemo">저장</button>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import CalendarView from './components/CalendarView.vue';

const today = new Date();
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth() + 1); // 1~12

const attendanceInfo = ref<null | { date: string; newlyChecked: boolean }>(null);
const attendedDates = ref<string[]>([]);

const selectedDate = ref<string | null>(null);
const memo = ref('');

async function loadMonthAttendance() {
  const dates = await window.api.getMonthAttendance(currentYear.value, currentMonth.value);
  attendedDates.value = dates;
}

async function onSelectDate(dateStr: string) {
  selectedDate.value = dateStr;
  const events = await window.api.getEventsByDate(dateStr);

  // 여기서는 간단하게 "하루에 메모 하나" 모델로 감
  if (events.length > 0 && events[0].memo) {
    memo.value = events[0].memo;
  } else {
    memo.value = '';
  }
}

async function saveMemo() {
  if (!selectedDate.value) return;

  const events = memo.value.trim()
    ? [{ id: 1, title: '메모', memo: memo.value }]
    : [];
  await window.api.saveEventsByDate(selectedDate.value, events);
  alert('저장되었습니다!');
}

function onChangeMonth(payload: { year: number; month: number }) {
  currentYear.value = payload.year;
  currentMonth.value = payload.month;
}

onMounted(async () => {
  // 1. 오늘 출석 체크
  const result = await window.api.checkTodayAttendance();
  attendanceInfo.value = {
    date: result.date,
    newlyChecked: result.newlyChecked
  };

  // 2. 현재 월 출석 정보 로드
  await loadMonthAttendance();
});

// 월이 바뀔 때마다 출석 정보 다시 로드
watch([currentYear, currentMonth], () => {
  loadMonthAttendance();
});
</script>

<style scoped>
.app {
  padding: 16px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.app-header {
  margin-bottom: 16px;
}
.app-main {
  display: flex;
  gap: 16px;
}
.event-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.event-panel textarea {
  flex: 1;
  margin-bottom: 8px;
}
</style>
