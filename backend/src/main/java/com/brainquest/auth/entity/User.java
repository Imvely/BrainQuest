package com.brainquest.auth.entity;

import com.brainquest.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 사용자 엔티티.
 * <p>소셜 로그인(카카오/애플/구글)으로 가입한 사용자 정보를 관리한다.</p>
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Column(unique = true)
    private String email;

    @Column(length = 50, nullable = false)
    private String nickname;

    /** 소셜 로그인 제공자: KAKAO, APPLE, GOOGLE */
    @Column(length = 20, nullable = false)
    private String provider;

    /** 소셜 로그인 제공자의 고유 사용자 ID */
    @Column(length = 255, nullable = false)
    private String providerId;

    /** ADHD 진단 상태: UNKNOWN, UNDIAGNOSED, SUSPECTED, DIAGNOSED */
    @Column(length = 20, nullable = false)
    private String adhdStatus = "UNKNOWN";

    /** ADHD 진단일 */
    private LocalDate diagnosisDate;

    @Column(length = 50, nullable = false)
    private String timezone = "Asia/Seoul";

    /** 기상 시간 */
    @Column(nullable = false)
    private LocalTime wakeTime = LocalTime.of(7, 0);

    /** 취침 시간 */
    @Column(nullable = false)
    private LocalTime sleepTime = LocalTime.of(23, 0);

    @Builder
    public User(String email, String nickname, String provider, String providerId,
                String adhdStatus, LocalDate diagnosisDate, String timezone,
                LocalTime wakeTime, LocalTime sleepTime) {
        this.email = email;
        this.nickname = nickname;
        this.provider = provider;
        this.providerId = providerId;
        this.adhdStatus = adhdStatus != null ? adhdStatus : "UNKNOWN";
        this.diagnosisDate = diagnosisDate;
        this.timezone = timezone != null ? timezone : "Asia/Seoul";
        this.wakeTime = wakeTime != null ? wakeTime : LocalTime.of(7, 0);
        this.sleepTime = sleepTime != null ? sleepTime : LocalTime.of(23, 0);
    }

    /**
     * 소셜 로그인 시 프로필 정보를 업데이트한다.
     */
    public void updateProfile(String email, String nickname) {
        if (email != null) this.email = email;
        if (nickname != null) this.nickname = nickname;
    }
}
