<!-- src/App.vue -->
<template>
  <v-app>
    <v-app-bar elevation="1" color="primary" density="comfortable">
      <v-app-bar-title>출석 & 일정 기록</v-app-bar-title>
      <v-spacer />
      <v-btn
        :icon="markdownViewerOpen ? 'mdi-eye-off' : 'mdi-eye'"
        :color="markdownViewerOpen ? 'success' : 'default'"
        variant="text"
        size="small"
        class="mr-2"
        @click="toggleMarkdownViewer"
        :title="markdownViewerOpen ? '마크다운 뷰어 닫기' : '마크다운 뷰어 열기'"
      />
      <v-chip
        v-if="attendanceInfo && selectedDate == getTodayStr()"
        color="success"
        variant="flat"
        class="text-white font-weight-medium"
        prepend-icon="mdi-check-circle"
      >
        <template v-if="!attendanceInfo.checked && !memo.trim()">
          {{ attendanceInfo.date }} · 저장되지 않음
        </template>
        <template v-else-if="!attendanceInfo.checked && memo.trim()">
          {{ attendanceInfo.date }} · 수정중
        </template>
        <template v-else-if="attendanceInfo.checked && attendanceInfo.newlyChecked && memo.trim() === savedMemo.trim()">
          {{ attendanceInfo.date }} · 오늘 새로 저장됨 · {{ formatDateTime(attendanceInfo.checkedAt) }}
        </template>
        <template v-else-if="attendanceInfo.checked && !attendanceInfo.newlyChecked && memo.trim() !== savedMemo.trim()">
          {{ attendanceInfo.date }} · 수정중
        </template>
        <template v-else-if="attendanceInfo.checked && !attendanceInfo.newlyChecked && memo.trim() === savedMemo.trim()">
          {{ attendanceInfo.date }} · 수정됨 · 수정: {{ formatDateTime(attendanceInfo.updatedAt) }}
        </template>
        <template v-else>
          {{ attendanceInfo.date }} · 저장됨
        </template>
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
                  :draftDates="draftDates"
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
              <v-card-text class="flex-grow-1 d-flex flex-column pa-0">
                <v-alert
                  v-if="!selectedDate"
                  type="info"
                  variant="tonal"
                  border="start"
                  class="mt-3 mx-3"
                >
                  달력에서 날짜를 선택하면 메모를 작성할 수 있어요.
                </v-alert>

                <template v-else>
                  <v-tabs v-model="memoTab" density="compact" class="px-3 pt-3">
                    <v-tab value="edit">
                      <v-icon start>mdi-pencil</v-icon>
                      편집
                    </v-tab>
                    <v-tab value="preview">
                      <v-icon start>mdi-eye</v-icon>
                      미리보기
                    </v-tab>
                  </v-tabs>
                  
                  <v-window v-model="memoTab" class="flex-grow-1">
                    <v-window-item value="edit" class="h-100">
                      <v-textarea
                        v-model="memo"
                        placeholder="이 날짜의 메모를 입력하세요 (마크다운 지원)"
                        variant="outlined"
                        auto-grow
                        rows="11"
                        max-height="300"
                        class="mt-3 mx-3 memo-textarea"
                        hide-details
                      />
                    </v-window-item>
                    
                    <v-window-item value="preview" class="h-100">
                      <div 
                        class="markdown-preview mt-3 mx-3 pa-4"
                        v-html="renderedMarkdown"
                      />
                    </v-window-item>
                  </v-window>
                </template>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { marked } from 'marked';
import CalendarView from './components/CalendarView.vue';

import { getTodayStr, formatDateTime } from './utils/date';

type SnackbarState = {
  show: boolean;
  message: string;
  color: string;
};

const today = new Date();
const currentYear = ref<number>(today.getFullYear());
const currentMonth = ref<number>(today.getMonth() + 1); // 1~12

const attendanceInfo = ref<{ date: string; checked: boolean;  newlyChecked: boolean; checkedAt: string | null; updatedAt: string | null } | null>(null);
const attendedDates = ref<string[]>([]);
const attendanceMap = ref<Record<string, { checked: boolean; checkedAt: string; newlyChecked: boolean; updatedAt: string; id: number; title: string; memo: string }>>({})

const selectedDate = ref<string | null>(null);
const memo = ref<string>('');
const saving = ref<boolean>(false);
const savedMemo = ref<string>(''); // 현재 선택된 날짜의 저장된 메모 (비교용)
const snackbar = ref<SnackbarState>({
  show: false,
  message: '',
  color: 'success'
});

// 마크다운 뷰어 토글 상태
const markdownViewerOpen = ref<boolean>(false);
const MARKDOWN_VIEWER_TOGGLE_KEY = 'attendance-app-markdown-viewer-toggle';

// 메모 탭 상태 (편집/미리보기)
const memoTab = ref<string>('edit');

// 마크다운 렌더링
const renderedMarkdown = computed<string>(() => {
  if (!memo.value.trim()) {
    return '<p class="text-grey">내용이 없습니다.</p>';
  }
  try {
    // marked.parse는 동기 함수이지만 타입 정의가 Promise를 반환할 수 있도록 되어 있을 수 있음
    const result = marked.parse(memo.value);
    // Promise인 경우 처리
    if (result instanceof Promise) {
      return '<p class="text-grey">로딩 중...</p>';
    }
    return result as string;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return '<p class="text-error">마크다운 파싱 오류가 발생했습니다.</p>';
  }
});

// 임시데이터가 있는 날짜 목록 (CalendarView에서 색상 표시용)
const draftDates = computed<string[]>(() => {
  const todayStr = getTodayStr();
  const dates: string[] = [];
  
  // 오늘 날짜의 임시데이터 상태 확인
  // localStorage에서 임시 메모 확인
  const draftMemo = loadDraftMemo(todayStr);
  const hasDraftInStorage = draftMemo !== null && draftMemo.trim() !== '';
  
  // 현재 선택된 날짜가 오늘일 때
  if (selectedDate.value === todayStr) {
    // 저장 안됨 + 메모 있음
    if (!attendanceInfo.value?.checked && memo.value.trim()) {
      dates.push(todayStr);
    }
    // 저장됨 + 수정 중 (메모가 저장된 메모와 다름)
    else if (attendanceInfo.value?.checked && memo.value.trim() !== savedMemo.value.trim()) {
      dates.push(todayStr);
    }
  } 
  // 오늘 날짜가 선택되지 않았지만 localStorage에 임시데이터가 있는 경우
  else if (hasDraftInStorage) {
    dates.push(todayStr);
  }
  
  return dates;
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
  const currentSavedMemo = events && events.length > 0 && events[0]?.memo ? events[0].memo : '';
  savedMemo.value = currentSavedMemo;
  
  // 오늘 날짜이고 임시 메모가 있으면 우선 표시, 없으면 저장된 메모 표시
  const draftMemo = loadDraftMemo(dateStr);
  memo.value = draftMemo !== null ? draftMemo : currentSavedMemo;
  
  // 오늘 날짜일 때 attendanceInfo 업데이트
  if (dateStr === getTodayStr()) {
    await updateAttendanceInfo();
  }
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
        // checkedAt은 새로 저장된 경우에만 업데이트
        if (result.checkedAt) {
          attendanceInfo.value.checkedAt = result.checkedAt;
        }
        // updatedAt은 수정 시에만 업데이트됨 (첫 저장 시에는 null)
        attendanceInfo.value.updatedAt = result.updatedAt || null;
      }
      // 저장된 메모 업데이트
      savedMemo.value = memo.value;
      // 저장 성공 시 임시 메모 삭제
      clearDraftMemo(selectedDate.value);
      // attendanceInfo 다시 업데이트
      await updateAttendanceInfo();
      // 출석 데이터 다시 로드 (색상 업데이트를 위해)
      await loadAllAttendance();
      await loadMonthAttendance();
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

// attendanceInfo 업데이트 함수 (오늘 날짜일 때만)
const updateAttendanceInfo = async (): Promise<void> => {
  const todayStr = getTodayStr();
  
  // 오늘 날짜가 선택되어 있을 때만 업데이트
  if (selectedDate.value !== todayStr) {
    return;
  }

  // 오늘 날짜의 출석 정보 가져오기
  const result = await window.api.checkTodayAttendance();
  
  // 저장된 메모 가져오기
  const events = await window.api.getEventsByDate(todayStr);
  const currentSavedMemo = events && events.length > 0 && events[0]?.memo ? events[0].memo : '';
  savedMemo.value = currentSavedMemo;
  
  // attendanceInfo 업데이트
  attendanceInfo.value = {
    date: result.date,
    checked: result.checked,
    newlyChecked: result.newlyChecked,
    checkedAt: result.checkedAt,
    updatedAt: result.updatedAt
  };
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
    newlyChecked: result.newlyChecked,
    checkedAt: result.checkedAt,
    updatedAt: result.updatedAt
  };

  await loadAllAttendance();
  await loadMonthAttendance();
  
  // 오늘 날짜 선택 및 attendanceInfo 초기화
  const todayStr = getTodayStr();
  selectedDate.value = todayStr;
  const events = await window.api.getEventsByDate(todayStr);
  const currentSavedMemo = events && events.length > 0 && events[0]?.memo ? events[0].memo : '';
  savedMemo.value = currentSavedMemo;
  const draftMemo = loadDraftMemo(todayStr);
  memo.value = draftMemo !== null ? draftMemo : currentSavedMemo;
  await updateAttendanceInfo();

  // 마크다운 뷰어 토글 상태 불러오기 및 윈도우 자동 열기
  loadMarkdownViewerToggleState();
  if (markdownViewerOpen.value) {
    await window.api.openMarkdownViewer();
  }

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

// 메모 변경 시 자동으로 임시 저장 및 attendanceInfo 업데이트 (디바운싱 적용, 오늘 날짜만)
let draftSaveTimeout: ReturnType<typeof setTimeout> | null = null;
watch(memo, (newMemo) => {
  // 오늘 날짜일 때만 임시 저장 및 attendanceInfo 업데이트
  if (selectedDate.value && selectedDate.value === getTodayStr()) {
    // 이전 타이머 취소
    if (draftSaveTimeout) {
      clearTimeout(draftSaveTimeout);
    }
    // 500ms 후에 임시 저장 (사용자가 타이핑을 멈춘 후)
    draftSaveTimeout = setTimeout(() => {
      saveDraftMemo(selectedDate.value!, newMemo);
      // attendanceInfo 업데이트 (메모 변경 감지)
      updateAttendanceInfo();
    }, 500);
  }
});

watch([currentYear, currentMonth], () => {
  loadMonthAttendance();
});

// 마크다운 뷰어 토글 함수
const toggleMarkdownViewer = async (): Promise<void> => {
  if (markdownViewerOpen.value) {
    // 닫기
    await window.api.closeMarkdownViewer();
    markdownViewerOpen.value = false;
    localStorage.setItem(MARKDOWN_VIEWER_TOGGLE_KEY, 'false');
  } else {
    // 열기
    await window.api.openMarkdownViewer();
    markdownViewerOpen.value = true;
    localStorage.setItem(MARKDOWN_VIEWER_TOGGLE_KEY, 'true');
  }
};

// 마크다운 뷰어 토글 상태 불러오기
const loadMarkdownViewerToggleState = (): void => {
  const savedState = localStorage.getItem(MARKDOWN_VIEWER_TOGGLE_KEY);
  if (savedState === 'true') {
    markdownViewerOpen.value = true;
  }
};
</script>

<style scoped>
.memo-textarea :deep(.v-field__input) {
  max-height: 300px;
  overflow-y: auto !important;
}

.markdown-preview {
  min-height: 200px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background-color: rgb(var(--v-theme-surface));
}

.markdown-preview :deep(h1) {
  color: rgb(var(--v-theme-primary));
  border-bottom: 3px solid rgb(var(--v-theme-primary));
  padding-bottom: 10px;
  margin-bottom: 20px;
  font-size: 1.75rem;
}

.markdown-preview :deep(h2) {
  color: rgb(var(--v-theme-on-surface));
  margin-top: 24px;
  margin-bottom: 12px;
  border-bottom: 2px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-bottom: 8px;
  font-size: 1.5rem;
}

.markdown-preview :deep(h3) {
  color: rgb(var(--v-theme-on-surface));
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 1.25rem;
}

.markdown-preview :deep(p) {
  margin-bottom: 12px;
  line-height: 1.6;
}

.markdown-preview :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview :deep(code) {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-preview :deep(pre) {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  padding: 15px;
  border-radius: 5px;
  overflow-x: auto;
  margin: 15px 0;
}

.markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  margin-left: 20px;
  margin-bottom: 12px;
}

.markdown-preview :deep(li) {
  margin-bottom: 8px;
}

.markdown-preview :deep(blockquote) {
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 15px;
  margin: 15px 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-style: italic;
}

.markdown-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 8px;
  text-align: left;
}

.markdown-preview :deep(th) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  font-weight: bold;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 15px 0;
}
</style>

