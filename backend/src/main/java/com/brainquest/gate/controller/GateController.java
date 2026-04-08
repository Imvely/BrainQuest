package com.brainquest.gate.controller;

import com.brainquest.common.dto.ApiResponse;
import com.brainquest.gate.dto.*;
import com.brainquest.gate.entity.CheckinType;
import com.brainquest.gate.service.CheckinService;
import com.brainquest.gate.service.MedicationService;
import com.brainquest.gate.service.ScreeningService;
import com.brainquest.gate.repository.StreakRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * GATE 모듈 컨트롤러.
 * <p>스크리닝, 체크인, 약물 관리, 스트릭 조회 API를 제공한다.</p>
 */
@RestController
@RequestMapping("/api/v1/gate")
@RequiredArgsConstructor
public class GateController {

    private final ScreeningService screeningService;
    private final CheckinService checkinService;
    private final MedicationService medicationService;
    private final StreakRepository streakRepository;

    /**
     * ASRS 스크리닝 제출.
     */
    @PostMapping("/screening")
    public ResponseEntity<ApiResponse<ScreeningResponse>> submitScreening(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ScreeningRequest request) {
        ScreeningResponse response = screeningService.submitScreening(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "스크리닝 완료"));
    }

    /**
     * 아침/저녁 체크인 제출.
     */
    @PostMapping("/checkin")
    public ResponseEntity<ApiResponse<CheckinResponse>> submitCheckin(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CheckinRequest request) {
        CheckinResponse response = (request.type() == CheckinType.MORNING)
                ? checkinService.submitMorningCheckin(userId, request)
                : checkinService.submitEveningCheckin(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, request.type().name() + " 체크인 완료"));
    }

    /**
     * 체크인 기록 조회.
     */
    @GetMapping("/checkin/history")
    public ResponseEntity<ApiResponse<List<CheckinResponse>>> getCheckinHistory(
            @AuthenticationPrincipal Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<CheckinResponse> history = checkinService.getCheckinHistory(userId, from, to);
        return ResponseEntity.ok(ApiResponse.of(history));
    }

    /**
     * 약물 등록.
     */
    @PostMapping("/medications")
    public ResponseEntity<ApiResponse<MedicationResponse>> registerMedication(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody MedicationRequest request) {
        MedicationResponse response = medicationService.registerMedication(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "약물 등록 완료"));
    }

    /**
     * 약물 복용 기록.
     */
    @PostMapping("/med-logs")
    public ResponseEntity<ApiResponse<MedLogResponse>> logMedication(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody MedLogRequest request) {
        MedLogResponse response = medicationService.logMedication(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "복용 기록 완료"));
    }

    /**
     * 스트릭 조회.
     */
    @GetMapping("/streaks")
    public ResponseEntity<ApiResponse<List<StreakResponse>>> getStreaks(
            @AuthenticationPrincipal Long userId) {
        List<StreakResponse> streaks = streakRepository.findAllByUserId(userId).stream()
                .map(StreakResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.of(streaks));
    }
}
