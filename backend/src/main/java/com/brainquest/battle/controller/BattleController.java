package com.brainquest.battle.controller;

import com.brainquest.battle.dto.*;
import com.brainquest.battle.service.BattleService;
import com.brainquest.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/battle")
@RequiredArgsConstructor
public class BattleController {

    private final BattleService battleService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<StartBattleResponse>> startBattle(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody StartBattleRequest request) {
        StartBattleResponse response = battleService.startBattle(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "전투 시작"));
    }

    @PostMapping("/{id}/exit")
    public ResponseEntity<ApiResponse<ExitResponse>> recordExit(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        ExitResponse response = battleService.recordExit(userId, id);
        return ResponseEntity.ok(ApiResponse.of(response, "이탈 기록 완료"));
    }

    @PostMapping("/{id}/return")
    public ResponseEntity<ApiResponse<ReturnResponse>> recordReturn(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        ReturnResponse response = battleService.recordReturn(userId, id);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<ApiResponse<EndBattleResponse>> endBattle(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody EndBattleRequest request) {
        EndBattleResponse response = battleService.endBattle(userId, id, request);
        return ResponseEntity.ok(ApiResponse.of(response, "전투 종료"));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<BattleHistoryResponse>>> getBattleHistory(
            @AuthenticationPrincipal Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<BattleHistoryResponse> history = battleService.getBattleHistory(userId, from, to);
        return ResponseEntity.ok(ApiResponse.of(history));
    }
}
