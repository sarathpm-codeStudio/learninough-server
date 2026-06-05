export type ChartPeriod = 'week' | 'month' | 'year';

export const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export interface ChartPeriodSlot {
    label: string;
    group: string;
    /** Day of month (01–31) for week-period enrollment charts */
    dayOfMonth?: string;
}

export interface ChartPeriodBounds {
    today: Date;
    fromDate: Date;
    rangeEnd: Date;
}

export function startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function startOfLocalWeekMonday(d: Date): Date {
    const day = d.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysFromMonday);
}

export function toLocalDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function toLocalMonthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function weekdayLabel(d: Date): string {
    const index = d.getDay() === 0 ? 6 : d.getDay() - 1;
    return WEEKDAY_LABELS[index]!;
}

export function isSameLocalMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function calendarMonthWeekNumber(dayOfMonth: number): number {
    if (dayOfMonth <= 7) return 1;
    if (dayOfMonth <= 14) return 2;
    if (dayOfMonth <= 21) return 3;
    return 4;
}

export function getChartPeriodBounds(period: ChartPeriod, ref = new Date()): ChartPeriodBounds {
    const today = startOfLocalDay(ref);
    let fromDate: Date;

    if (period === 'week') {
        fromDate = startOfLocalWeekMonday(today);
    } else if (period === 'month') {
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
        fromDate = new Date(today.getFullYear(), 0, 1);
    }

    return { today, fromDate, rangeEnd: endOfLocalDay(today) };
}

export function buildChartPeriodSlots(period: ChartPeriod, bounds: ChartPeriodBounds): ChartPeriodSlot[] {
    const { today, fromDate } = bounds;

    if (period === 'week') {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + i);
            return {
                label: weekdayLabel(d),
                group: toLocalDateKey(d),
                dayOfMonth: String(d.getDate()).padStart(2, '0'),
            };
        });
    }

    if (period === 'month') {
        return Array.from({ length: 4 }, (_, i) => ({
            label: `Wk ${i + 1}`,
            group: `week_${i + 1}`,
        }));
    }

    return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today.getFullYear(), i, 1);
        return {
            label: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
            group: toLocalMonthKey(d),
        };
    });
}

export function groupTimestampForChartPeriod(
    dateStr: string,
    period: ChartPeriod,
    bounds: ChartPeriodBounds
): { label: string; group: string } | null {
    const { today, fromDate } = bounds;
    const local = startOfLocalDay(new Date(dateStr));

    if (period === 'week') {
        const weekEnd = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + 6);
        if (local < fromDate || local > weekEnd) return null;
        return { label: weekdayLabel(local), group: toLocalDateKey(local) };
    }

    if (period === 'month') {
        if (!isSameLocalMonth(local, today)) return null;
        const weekNum = calendarMonthWeekNumber(local.getDate());
        return { label: `Wk ${weekNum}`, group: `week_${weekNum}` };
    }

    if (local.getFullYear() !== today.getFullYear()) return null;
    return {
        label: local.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        group: toLocalMonthKey(local),
    };
}
