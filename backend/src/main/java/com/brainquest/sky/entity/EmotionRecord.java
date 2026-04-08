package com.brainquest.sky.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "emotion_records")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class EmotionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "weather_type", nullable = false, length = 15)
    private WeatherType weatherType;

    @Column(nullable = false)
    private int intensity;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "jsonb")
    private List<String> tags;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(name = "voice_url", length = 500)
    private String voiceUrl;

    @Column(name = "voice_transcript", columnDefinition = "TEXT")
    private String voiceTranscript;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public EmotionRecord(Long userId, WeatherType weatherType, int intensity,
                         List<String> tags, String memo, String voiceUrl,
                         String voiceTranscript, LocalDateTime recordedAt) {
        this.userId = userId;
        this.weatherType = weatherType;
        this.intensity = intensity;
        this.tags = tags;
        this.memo = memo;
        this.voiceUrl = voiceUrl;
        this.voiceTranscript = voiceTranscript;
        this.recordedAt = recordedAt;
    }
}
