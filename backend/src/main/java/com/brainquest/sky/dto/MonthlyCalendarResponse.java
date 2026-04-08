package com.brainquest.sky.dto;

import java.time.YearMonth;
import java.util.List;

public record MonthlyCalendarResponse(
        YearMonth yearMonth,
        List<DayEmotionSummary> days
) {}
