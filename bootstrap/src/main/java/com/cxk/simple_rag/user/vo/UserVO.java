package com.cxk.simple_rag.user.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户信息 VO
 *
 * @author wangxin
 */
@Data
@Builder
public class UserVO {

    private String id;

    private String username;

    private String role;

    private String avatar;

    private LocalDateTime createTime;
}
