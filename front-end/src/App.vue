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
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
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

// localStorage 키 생성 헬퍼
const getDraftKey = (dateStr: string): string => `attendance-app-draft-${dateStr}`;

// 임시 메모 저장 (오늘 날짜만)
const saveDraftMemo = (dateStr: string, memoText: string): void => {
  // 오늘 날짜가 아니면 저장하지 않음
  if (dateStr !== getTodayStr()) {
    return;
  }
  
  if (dateStr) {
    if (memoText.trim()) {
      localStorage.setItem(getDraftKey(dateStr), memoText);
    } else {
      // 빈 메모는 임시 저장하지 않음
      localStorage.removeItem(getDraftKey(dateStr));
    }
  }
};

// 임시 메모 불러오기 (오늘 날짜만)
const loadDraftMemo = (dateStr: string): string | null => {
  // 오늘 날짜가 아니면 불러오지 않음
  if (!dateStr || dateStr !== getTodayStr()) {
    return null;
  }
  return localStorage.getItem(getDraftKey(dateStr));
};

// 임시 메모 삭제
const clearDraftMemo = (dateStr: string): void => {
  if (dateStr) {
    localStorage.removeItem(getDraftKey(dateStr));
  }
};

// 모든 임시 메모 삭제 (앱 종료 시)
const clearAllDraftMemos = (): void => {
  const keysToRemove: string[] = [];
  // localStorage의 모든 키를 순회하면서 draft 키 찾기
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('attendance-app-draft-')) {
      keysToRemove.push(key);
    }
  }
  // 찾은 모든 키 삭제
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

// 오늘이 아닌 날짜의 임시 메모 삭제
const clearNonTodayDraftMemos = (): void => {
  const todayStr = getTodayStr();
  const keysToRemove: string[] = [];
  // localStorage의 모든 키를 순회하면서 draft 키 찾기
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('attendance-app-draft-')) {
      // 날짜 추출 (attendance-app-draft-YYYY-MM-DD 형식)
      const dateStr = key.replace('attendance-app-draft-', '');
      // 오늘이 아닌 날짜의 임시 메모 삭제
      if (dateStr !== todayStr) {
        keysToRemove.push(key);
      }
    }
  }
  // 찾은 키 삭제
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

const loadMonthAttendance = async (): Promise<void> => {
  const dates = await window.api.getMonthAttendance(currentYear.value, currentMonth.value);
  attendedDates.value = dates;
};

const onSelectDate = async (dateStr: string): Promise<void> => {
  // 현재 선택된 날짜가 오늘이면 임시 메모 저장 (다른 날짜로 이동하기 전에)
  if (selectedDate.value && selectedDate.value === getTodayStr()) {
    saveDraftMemo(selectedDate.value, memo.value);
  }
  
  // 다른 날짜로 이동할 때는 해당 날짜의 임시 메모 삭제 (오늘이 아닌 날짜)
  if (selectedDate.value && selectedDate.value !== getTodayStr()) {
    clearDraftMemo(selectedDate.value);
  }

  selectedDate.value = dateStr;
  
  // 먼저 저장된 메모를 불러오기
  const events = await window.api.getEventsByDate(dateStr);
  const savedMemo = events.length > 0 && events[0].memo ? events[0].memo : '';
  
  // 오늘 날짜이고 임시 메모가 있으면 우선 표시, 없으면 저장된 메모 표시
  const draftMemo = loadDraftMemo(dateStr);
  memo.value = draftMemo !== null ? draftMemo : savedMemo;
};

const showSnackbar = async (message: string, color: SnackbarState['color'] = 'success'): Promise<void> => {
  // 기존 snackbar가 열려있으면 먼저 닫기
  if (snackbar.value.show) {
    snackbar.value.show = false;
    // 다음 틱에서 새로운 snackbar 표시 (닫히는 애니메이션 후 다시 열림)
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
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
      // 저장 성공 시 임시 메모 삭제
      clearDraftMemo(selectedDate.value);
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

// Ctrl+S 키보드 단축키 핸들러
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault(); // 브라우저 기본 저장 동작 방지
    saveMemo();
  }
};

// 앱 시작 시
onMounted(async () => {
  // 오늘이 아닌 날짜의 임시 메모 정리
  clearNonTodayDraftMemos();
  
  const result = await window.api.checkTodayAttendance();
  attendanceInfo.value = {
    date: result.date,
    checked: result.checked,
    newlyChecked: result.newlyChecked
  };

  await loadAllAttendance();
  await loadMonthAttendance();

  // Ctrl+S 키보드 단축키 등록
  document.addEventListener('keydown', handleKeyDown);
  // 앱 종료 시 모든 임시 메모 삭제
  window.addEventListener('beforeunload', handleBeforeUnload);
});

// 컴포넌트 언마운트 시 이벤트 리스너 제거 및 모든 임시 메모 삭제
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  // 타이머 정리
  if (draftSaveTimeout) {
    clearTimeout(draftSaveTimeout);
  }
  // 앱 종료 시 모든 임시 메모 삭제
  clearAllDraftMemos();
});

// beforeunload 이벤트로도 처리 (브라우저 창 닫기 등)
const handleBeforeUnload = (): void => {
  clearAllDraftMemos();
};

// 메모 변경 시 자동으로 임시 저장 (디바운싱 적용, 오늘 날짜만)
let draftSaveTimeout: ReturnType<typeof setTimeout> | null = null;
watch(memo, (newMemo) => {
  // 오늘 날짜일 때만 임시 저장
  if (selectedDate.value && selectedDate.value === getTodayStr()) {
    // 이전 타이머 취소
    if (draftSaveTimeout) {
      clearTimeout(draftSaveTimeout);
    }
    // 500ms 후에 임시 저장 (사용자가 타이핑을 멈춘 후)
    draftSaveTimeout = setTimeout(() => {
      saveDraftMemo(selectedDate.value!, newMemo);
    }, 500);
  }
});

watch([currentYear, currentMonth], () => {
  loadMonthAttendance();
});
</script>

