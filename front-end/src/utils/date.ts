/**
 * 오늘 날짜를 yyyy-mm-dd 문자열로 반환
 */
export function getTodayStr(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * ISO 날짜 문자열을 읽기 쉬운 형식으로 변환 (예: "2025-01-15 14:30")
 */
export function formatDateTime(isoString: string | null | undefined): string {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const sec = String(date.getSeconds()).padStart(2, '0');
        return `${hh}:${min}:${sec}`;
    } catch {
        return '';
    }
}