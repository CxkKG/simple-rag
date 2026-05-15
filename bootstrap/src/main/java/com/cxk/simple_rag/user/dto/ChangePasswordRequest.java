package com.cxk.simple_rag.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 修改密码请求 DTO
 *
 * @author wangxin
 */
@Data
public class ChangePasswordRequest {

    private String oldPassword;

    private String code;

    @NotBlank(message = "新密码不能为空")
    private String newPassword;
}
