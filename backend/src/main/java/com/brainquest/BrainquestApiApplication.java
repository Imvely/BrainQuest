package com.brainquest;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * BrainQuest API 서버 메인 애플리케이션 클래스.
 * <p>ADHD 사용자를 위한 올인원 라이프 RPG 백엔드 서버.</p>
 */
@SpringBootApplication
public class BrainquestApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(BrainquestApiApplication.class, args);
    }
}
