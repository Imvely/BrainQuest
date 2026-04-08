package com.brainquest.sky.controller;

import com.brainquest.common.dto.ApiResponse;
import com.brainquest.sky.dto.*;
import com.brainquest.sky.service.EmotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sky")
@RequiredArgsConstructor
public class SkyController {

    private final EmotionService emotionService;

    @PostMapping("/emotions")
    public ResponseEntity<ApiResponse<EmotionResponse>> recordEmotion(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody RecordEmotionRequest request) {
        EmotionResponse response = emotionService.recordEmotion(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "감정 기록 완료"));
    }

    @GetMapping("/calendar/{yearMonth}")
    public ResponseEntity<ApiResponse<MonthlyCalendarResponse>> getMonthlyCalendar(
            @AuthenticationPrincipal Long userId,
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth yearMonth) {
        MonthlyCalendarResponse response = emotionService.getMonthlyCalendar(userId, yearMonth);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/summary/weekly")
    public ResponseEntity<ApiResponse<WeeklySummaryResponse>> getWeeklySummary(
            @AuthenticationPrincipal Long userId) {
        WeeklySummaryResponse response = emotionService.getWeeklySummary(userId);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/emotions")
    public ResponseEntity<ApiResponse<List<EmotionResponse>>> getEmotionsByDate(
            @AuthenticationPrincipal Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<EmotionResponse> responses = emotionService.getEmotionsByDate(userId, date);
        return ResponseEntity.ok(ApiResponse.of(responses));
    }
}
