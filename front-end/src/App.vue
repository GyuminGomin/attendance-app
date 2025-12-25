<!-- src/App.vue -->
<template>
  <v-app>
    <v-app-bar elevation="1" color="primary" density="comfortable">
      <v-app-bar-title>출석 & 일정 기록</v-app-bar-title>
      <v-spacer />
      <v-chip
        v-if="attendanceInfo && selectedDate == getTodayStr()"
        color="success"
        variant="flat"
        class="text-white font-weight-medium"
        prepend-icon="mdi-check-circle"
      >
        {{ attendanceInfo.date }} ·
        {{ !attendanceInfo.checked ? '저장되지 않음' : attendanceInfo.newlyChecked ? '오늘 새로 저장됨' : '수정됨' }}
      </v-chip>
    </v-app-bar>

    <v-main>
      <v-container fluid class="py-8 px-4">
        <v-row
          align="stretch"
          justify="center"
          style="row-gap: 24px; column-gap: 24px;"
        >
          <v-col cols="12" lg="7">
            <v-card elevation="2" class="h-100">
              <v-card-title class="text-h6 font-weight-bold d-flex align-center">
                이번 달 출석
                <v-spacer />
                <v-chip size="small" color="secondary" variant="tonal">
                  {{ currentYear }}.{{ String(currentMonth).padStart(2, '0') }}
                </v-chip>
              </v-card-title>
              <v-divider />
              <v-card-text class="pt-4">
                <CalendarView
                  :year="currentYear"
                  :month="currentMonth"
                  :attendedDates="attendedDates"
                  :attendanceMap="attendanceMap"
                  :selectedDate="selectedDate"
                  @changeMonth="onChangeMonth"
                  @selectDate="onSelectDate"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="5">
            <v-card elevation="2" class="h-100 d-flex flex-column">
              <v-card-title class="text-h6 font-weight-bold">
                {{ selectedDate ? `${selectedDate} 일정` : '날짜를 선택해주세요' }}
              </v-card-title>
              <v-divider />
              <v-card-text class="flex-grow-1 d-flex flex-column">
                <v-alert
                  v-if="!selectedDate"
                  type="info"
                  variant="tonal"
                  border="start"
                  class="mt-3"
                >
                  달력에서 날짜를 선택하면 메모를 작성할 수 있어요.
                </v-alert>

                <v-textarea
                  v-else
                  v-model="memo"
                  placeholder="이 날짜의 메모를 입력하세요"
                  variant="outlined"
                  auto-grow
                  rows="8"
                  class="mt-3 flex-grow-1"
                />
              </v-card-text>
              <v-card-actions class="justify-end">
                <v-btn
                  color="primary"
                  :disabled="!selectedDate || saving"
                  :loading="saving"
                  prepend-icon="mdi-content-save"
                  @click="saveMemo"
                >
                  저장
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="2500"
      location="bottom"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import CalendarView from './components/CalendarView.vue';

import { getTodayStr } from './utils/date';

type SnackbarState = {
  show: boolean;
  message: string;
  color: string;
};

const today = new Date();
const currentYear = ref<number>(today.getFullYear());
const currentMonth = ref<number>(today.getMonth() + 1); // 1~12

const attendanceInfo = ref<{ date: string; checked: boolean;  newlyChecked: boolean } | null>(null);
const attendedDates = ref<string[]>([]);
const attendanceMap = ref<Record<string, { checked: boolean; checkedAt: string; newlyChecked: boolean; updatedAt: string; id: number; title: string; memo: string }>>({})

const selectedDate = ref<string | null>(null);
const memo = ref<string>('');
const saving = ref<boolean>(false);
const snackbar = ref<SnackbarState>({
  show: false,
  message: '',
  color: 'success'
});

const loadMonthAttendance = async (): Promise<void> => {
  const dates = await window.api.getMonthAttendance(currentYear.value, currentMonth.value);
  attendedDates.value = dates;
};

const onSelectDate = async (dateStr: string): Promise<void> => {
  selectedDate.value = dateStr;
  const events = await window.api.getEventsByDate(dateStr);

  if (events.length > 0 && events[0].memo) {
    memo.value = events[0].memo;
  } else {
    memo.value = '';
  }
};

const showSnackbar = (message: string, color: SnackbarState['color'] = 'success'): void => {
  snackbar.value = { show: true, message, color };
};

// 현재는 한번 저장되면 수정할 수 없게 되어 있음 (하지만 오늘이라면 수정가능하게)
/*
 * 오늘 날짜만 수정가능
 * 다른 날짜는 보기만 가능
 */
const saveMemo = async (): Promise<void> => {
  if (!selectedDate.value || saving.value) return;

  if (selectedDate.value != getTodayStr()) {
    showSnackbar('오늘 날짜만 수정 및 저장할 수 있습니다.', 'warning');
  } else {
    saving.value = true;
    try {
      const events = memo.value.trim()
        ? [{ id: 1, title: '메모', memo: memo.value }]
        : [];
      const result = await window.api.saveEventsByDate(selectedDate.value, events);
      if (attendanceInfo.value) {
        attendanceInfo.value.checked = result.checked;
        attendanceInfo.value.newlyChecked = result.newlyChecked;
      }
      showSnackbar('저장되었습니다!');
    } catch (error) {
      console.error(error);
      showSnackbar('저장에 실패했어요. 다시 시도해주세요.', 'error');
    } finally {
      saving.value = false;
    }
  }

  
};

const onChangeMonth = (payload: { year: number; month: number }): void => {
  currentYear.value = payload.year;
  currentMonth.value = payload.month;
};

const loadAllAttendance = async () => {
  attendanceMap.value = await window.api.getAllAttendance();
}

// 앱 시작 시
onMounted(async () => {
  const result = await window.api.checkTodayAttendance();
  attendanceInfo.value = {
    date: result.date,
    checked: result.checked,
    newlyChecked: result.newlyChecked
  };

  await loadAllAttendance();
  await loadMonthAttendance();
});

watch([currentYear, currentMonth], () => {
  loadMonthAttendance();
});
</script>

