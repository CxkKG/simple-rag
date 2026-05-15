package com.cxk.simple_rag.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;

/**
 * 验证码管理服务
 *
 * @author wangxin
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerifyCodeService {

    private final StringRedisTemplate stringRedisTemplate;
    private final EmailService emailService;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int CODE_LENGTH = 6;
    private static final int CODE_TTL_MINUTES = 5;
    private static final int SEND_INTERVAL_SECONDS = 60;

    /**
     * 发送验证码
     *
     * @param email 邮箱地址
     * @param type  场景类型（register / reset_password / change_password）
     */
    public void sendCode(String email, String type) {
        String limitKey = "email:limit:" + email;
        if (Boolean.TRUE.equals(stringRedisTemplate.hasKey(limitKey))) {
            throw new IllegalArgumentException("发送过于频繁，请 60 秒后重试");
        }

        String code = generateCode();
        String codeKey = "email:verify:" + type + ":" + email;

        stringRedisTemplate.opsForValue().set(codeKey, code, CODE_TTL_MINUTES, TimeUnit.MINUTES);
        stringRedisTemplate.opsForValue().set(limitKey, "1", SEND_INTERVAL_SECONDS, TimeUnit.SECONDS);

        emailService.sendVerifyCode(email, code, type);
        log.info("Verify code sent: email={}, type={}", email, type);
    }

    /**
     * 验证验证码
     *
     * @param email 邮箱地址
     * @param code  用户输入的验证码
     * @param type  场景类型
     * @return 是否验证通过
     */
    public boolean verifyCode(String email, String code, String type) {
        String codeKey = "email:verify:" + type + ":" + email;
        String storedCode = stringRedisTemplate.opsForValue().get(codeKey);

        if (storedCode == null) {
            return false;
        }

        if (storedCode.equals(code)) {
            stringRedisTemplate.delete(codeKey);
            return true;
        }

        return false;
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(RANDOM.nextInt(10));
        }
        return sb.toString();
    }
}
