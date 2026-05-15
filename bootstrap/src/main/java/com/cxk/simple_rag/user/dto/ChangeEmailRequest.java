package com.cxk.simple_rag.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 更换邮箱请求 DTO
 *
 * @author wangxin
 */
@Data
public class ChangeEmailRequest {

    @NotBlank(message = "新邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String newEmail;

    @NotBlank(message = "验证码不能为空")
    private String code;
}
