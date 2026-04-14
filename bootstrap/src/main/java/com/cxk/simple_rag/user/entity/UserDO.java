package com.cxk.simple_rag.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 系统用户实体类
 *
 * @author wangxin
 */
@Data
@TableName("t_user")
public class UserDO {

    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String username;

    private String password;

    private String role;

    private String avatar;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private Integer deleted;
}
