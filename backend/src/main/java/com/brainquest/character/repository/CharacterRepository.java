package com.brainquest.character.repository;

import com.brainquest.character.entity.Character;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CharacterRepository extends JpaRepository<Character, Long> {

    Optional<Character> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}
