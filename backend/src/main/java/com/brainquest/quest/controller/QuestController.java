package com.brainquest.quest.controller;

import com.brainquest.common.dto.ApiResponse;
import com.brainquest.quest.dto.*;
import com.brainquest.quest.entity.QuestCategory;
import com.brainquest.quest.service.QuestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quest")
@RequiredArgsConstructor
public class QuestController {

    private final QuestService questService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<GenerateQuestResponse>> generateQuest(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody GenerateQuestRequest request) {
        GenerateQuestResponse response = questService.generateQuest(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "퀘스트 생성 완료"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<QuestResponse>> saveQuest(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody SaveQuestRequest request) {
        QuestResponse response = questService.saveQuest(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "퀘스트 저장 완료"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<QuestResponse>>> getActiveQuests(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) QuestCategory category) {
        List<QuestResponse> response = questService.getActiveQuests(userId, category);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QuestDetailResponse>> getQuestDetail(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        QuestDetailResponse response = questService.getQuestDetail(userId, id);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @PutMapping("/{questId}/checkpoints/{cpId}/complete")
    public ResponseEntity<ApiResponse<CheckpointCompleteResponse>> completeCheckpoint(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long questId,
            @PathVariable Long cpId) {
        CheckpointCompleteResponse response = questService.completeCheckpoint(userId, questId, cpId);
        return ResponseEntity.ok(ApiResponse.of(response, "체크포인트 완료"));
    }
}
