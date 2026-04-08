package com.brainquest.map.controller;

import com.brainquest.common.dto.ApiResponse;
import com.brainquest.map.dto.*;
import com.brainquest.map.service.TimeBlockService;
import com.brainquest.map.service.TimePredictionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/map")
@RequiredArgsConstructor
public class MapController {

    private final TimeBlockService timeBlockService;
    private final TimePredictionService timePredictionService;

    @GetMapping("/timeline/{date}")
    public ResponseEntity<ApiResponse<TimelineResponse>> getTimeline(
            @AuthenticationPrincipal Long userId,
            @PathVariable LocalDate date) {
        TimelineResponse response = timeBlockService.getTimeline(userId, date);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/blocks")
    public ResponseEntity<ApiResponse<BlockResponse>> createBlock(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CreateBlockRequest request) {
        BlockResponse response = timeBlockService.createBlock(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "타임블록 생성 완료"));
    }

    @PutMapping("/blocks/{id}")
    public ResponseEntity<ApiResponse<BlockResponse>> updateBlock(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody UpdateBlockRequest request) {
        BlockResponse response = timeBlockService.updateBlock(userId, id, request);
        return ResponseEntity.ok(ApiResponse.of(response, "타임블록 수정 완료"));
    }

    @DeleteMapping("/blocks/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBlock(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        timeBlockService.deleteBlock(userId, id);
        return ResponseEntity.ok(ApiResponse.ok("\ud0c0\uc784\ube14\ub85d \uc0ad\uc81c \uc644\ub8cc"));
    }

    @GetMapping("/remaining-time")
    public ResponseEntity<ApiResponse<RemainingTimeResponse>> getRemainingTime(
            @AuthenticationPrincipal Long userId) {
        RemainingTimeResponse response = timeBlockService.getRemainingTime(userId);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/predictions")
    public ResponseEntity<ApiResponse<PredictionResponse>> recordPrediction(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody RecordPredictionRequest request) {
        PredictionResponse response = timePredictionService.recordPrediction(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "시간 예측 기록 완료"));
    }

    @PutMapping("/predictions/{id}/actual")
    public ResponseEntity<ApiResponse<PredictionResultResponse>> recordActual(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody RecordActualRequest request) {
        PredictionResultResponse response = timePredictionService.recordActual(userId, id, request.actualMin());
        return ResponseEntity.ok(ApiResponse.of(response, "실제 시간 기록 완료"));
    }
}
