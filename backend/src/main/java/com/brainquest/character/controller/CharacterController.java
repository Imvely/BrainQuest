package com.brainquest.character.controller;

import com.brainquest.character.dto.*;
import com.brainquest.character.service.CharacterService;
import com.brainquest.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * CHARACTER 모듈 컨트롤러.
 * <p>캐릭터 생성, 조회, 장비 장착, 인벤토리 API를 제공한다.</p>
 */
@RestController
@RequestMapping("/api/v1/character")
@RequiredArgsConstructor
public class CharacterController {

    private final CharacterService characterService;

    /**
     * 캐릭터 생성.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CharacterResponse>> createCharacter(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CreateCharacterRequest request) {
        CharacterResponse response = characterService.createCharacter(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "캐릭터 생성 완료"));
    }

    /**
     * 캐릭터 조회.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CharacterResponse>> getCharacter(
            @AuthenticationPrincipal Long userId) {
        CharacterResponse response = characterService.getCharacter(userId);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * 장비 장착.
     */
    @PutMapping("/equip")
    public ResponseEntity<ApiResponse<CharacterResponse>> equipItem(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody EquipRequest request) {
        CharacterResponse response = characterService.equipItem(userId, request);
        return ResponseEntity.ok(ApiResponse.of(response, "장비 장착 완료"));
    }

    /**
     * 인벤토리 조회.
     */
    @GetMapping("/items")
    public ResponseEntity<ApiResponse<List<UserItemResponse>>> getInventory(
            @AuthenticationPrincipal Long userId) {
        List<UserItemResponse> items = characterService.getInventory(userId);
        return ResponseEntity.ok(ApiResponse.of(items));
    }
}
