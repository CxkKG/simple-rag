create table public.t_user
(
    id          varchar(20)  not null
        primary key,
    username    varchar(64)  not null
        constraint uk_user_username
            unique,
    password    varchar(128) not null,
    role        varchar(32)  not null,
    avatar      varchar(128),
    create_time timestamp default CURRENT_TIMESTAMP,
    update_time timestamp default CURRENT_TIMESTAMP,
    deleted     smallint  default 0,
    email       varchar(255)
);

comment on table public.t_user is '系统用户表';

comment on column public.t_user.id is '主键ID';

comment on column public.t_user.username is '用户名，唯一';

comment on column public.t_user.password is '密码';

comment on column public.t_user.role is '角色：admin/user';

comment on column public.t_user.avatar is '用户头像';

comment on column public.t_user.create_time is '创建时间';

comment on column public.t_user.update_time is '更新时间';

comment on column public.t_user.deleted is '是否删除 0：正常 1：删除';

alter table public.t_user
    owner to postgres;

create table public.t_conversation
(
    id              varchar(20)  not null
        primary key,
    conversation_id varchar(50)  not null,
    user_id         varchar(20)  not null,
    title           varchar(128) not null,
    last_time       timestamp,
    create_time     timestamp default CURRENT_TIMESTAMP,
    update_time     timestamp default CURRENT_TIMESTAMP,
    deleted         smallint  default 0,
    kb_id           varchar,
    constraint uk_conversation_user
        unique (conversation_id, user_id)
);

comment on table public.t_conversation is '会话列表';

comment on column public.t_conversation.id is '主键ID';

comment on column public.t_conversation.conversation_id is '会话ID';

comment on column public.t_conversation.user_id is '用户ID';

comment on column public.t_conversation.title is '会话名称';

comment on column public.t_conversation.last_time is '最近消息时间';

comment on column public.t_conversation.create_time is '创建时间';

comment on column public.t_conversation.update_time is '更新时间';

comment on column public.t_conversation.deleted is '是否删除 0：正常 1：删除';

alter table public.t_conversation
    owner to postgres;

create index idx_user_time
    on public.t_conversation (user_id, last_time);

create table public.t_message
(
    id              varchar(20) not null
        primary key,
    conversation_id varchar(50) not null,
    user_id         varchar(20),
    role            varchar(16) not null,
    content         text        not null,
    create_time     timestamp default CURRENT_TIMESTAMP,
    update_time     timestamp default CURRENT_TIMESTAMP,
    deleted         smallint  default 0,
    context_sources text
);

comment on table public.t_message is '会话消息记录表';

comment on column public.t_message.id is '主键ID';

comment on column public.t_message.conversation_id is '会话ID';

comment on column public.t_message.user_id is '用户ID';

comment on column public.t_message.role is '角色：user/assistant';

comment on column public.t_message.content is '消息内容';

comment on column public.t_message.create_time is '创建时间';

comment on column public.t_message.update_time is '更新时间';

comment on column public.t_message.deleted is '是否删除 0：正常 1：删除';

alter table public.t_message
    owner to postgres;

create index idx_conversation_user_time
    on public.t_message (conversation_id, user_id, create_time);

create index idx_conversation_summary
    on public.t_message (conversation_id, user_id, create_time);

create table public.t_knowledge_base
(
    id              varchar(50)                         not null
        primary key,
    name            varchar(128)                        not null,
    embedding_model varchar(64)                         not null,
    collection_name varchar(64)                         not null
        constraint uk_collection_name
            unique,
    created_by      varchar(20)                         not null,
    updated_by      varchar(20),
    create_time     timestamp default CURRENT_TIMESTAMP not null,
    update_time     timestamp default CURRENT_TIMESTAMP not null,
    deleted         smallint  default 0                 not null
);

comment on table public.t_knowledge_base is '知识库表';

comment on column public.t_knowledge_base.id is '主键 ID';

comment on column public.t_knowledge_base.name is '知识库名称';

comment on column public.t_knowledge_base.embedding_model is '嵌入模型标识';

comment on column public.t_knowledge_base.collection_name is 'Collection名称';

comment on column public.t_knowledge_base.created_by is '创建人';

comment on column public.t_knowledge_base.updated_by is '修改人';

comment on column public.t_knowledge_base.create_time is '创建时间';

comment on column public.t_knowledge_base.update_time is '更新时间';

comment on column public.t_knowledge_base.deleted is '是否删除 0：正常 1：删除';

alter table public.t_knowledge_base
    owner to postgres;

create index idx_kb_name
    on public.t_knowledge_base (name);

create table public.t_knowledge_document
(
    id               varchar(20)                                      not null
        primary key,
    kb_id            varchar(20)                                      not null,
    doc_name         varchar(256)                                     not null,
    enabled          smallint    default 1                            not null,
    chunk_count      integer     default 0,
    file_url         varchar(1024)                                    not null,
    file_type        varchar(16)                                      not null,
    file_size        bigint,
    process_mode     varchar(16) default 'chunk'::character varying,
    status           varchar(16) default 'pending'::character varying not null,
    source_type      varchar(16),
    source_location  varchar(1024),
    schedule_enabled smallint,
    schedule_cron    varchar(64),
    chunk_strategy   varchar(32),
    chunk_config     jsonb,
    pipeline_id      varchar(20),
    created_by       varchar(20)                                      not null,
    updated_by       varchar(20),
    create_time      timestamp   default CURRENT_TIMESTAMP            not null,
    update_time      timestamp   default CURRENT_TIMESTAMP            not null,
    deleted          smallint    default 0                            not null,
    summary          text,
    keywords         text
);

comment on table public.t_knowledge_document is '知识库文档表';

comment on column public.t_knowledge_document.id is 'ID';

comment on column public.t_knowledge_document.kb_id is '知识库ID';

comment on column public.t_knowledge_document.doc_name is '文档名称';

comment on column public.t_knowledge_document.enabled is '是否启用 1：启用 0：禁用';

comment on column public.t_knowledge_document.chunk_count is '分块数量';

comment on column public.t_knowledge_document.file_url is '文件存储路径';

comment on column public.t_knowledge_document.file_type is '文件类型';

comment on column public.t_knowledge_document.file_size is '文件大小（字节）';

comment on column public.t_knowledge_document.process_mode is '处理模式：chunk/pipeline';

comment on column public.t_knowledge_document.status is '状态：pending/running/success/failed';

comment on column public.t_knowledge_document.source_type is '来源类型：file/url';

comment on column public.t_knowledge_document.source_location is '来源地址';

comment on column public.t_knowledge_document.schedule_enabled is '是否启用定时刷新';

comment on column public.t_knowledge_document.schedule_cron is '定时表达式';

comment on column public.t_knowledge_document.chunk_strategy is '分块策略';

comment on column public.t_knowledge_document.chunk_config is '分块配置JSON';

comment on column public.t_knowledge_document.pipeline_id is 'Pipeline ID';

comment on column public.t_knowledge_document.created_by is '创建人';

comment on column public.t_knowledge_document.updated_by is '修改人';

comment on column public.t_knowledge_document.create_time is '创建时间';

comment on column public.t_knowledge_document.update_time is '更新时间';

comment on column public.t_knowledge_document.deleted is '是否删除 0：正常 1：删除';

alter table public.t_knowledge_document
    owner to postgres;

create index idx_kb_id
    on public.t_knowledge_document (kb_id);

create table public.t_knowledge_chunk
(
    id           varchar(20)                         not null
        primary key,
    kb_id        varchar(20)                         not null,
    doc_id       varchar(20)                         not null,
    chunk_index  integer                             not null,
    content      text                                not null,
    content_hash varchar(64),
    char_count   integer,
    token_count  integer,
    enabled      smallint  default 1                 not null,
    created_by   varchar(20)                         not null,
    updated_by   varchar(20),
    create_time  timestamp default CURRENT_TIMESTAMP not null,
    update_time  timestamp default CURRENT_TIMESTAMP not null,
    deleted      smallint  default 0                 not null
);

comment on table public.t_knowledge_chunk is '知识库文档分块表';

comment on column public.t_knowledge_chunk.id is 'ID';

comment on column public.t_knowledge_chunk.kb_id is '知识库ID';

comment on column public.t_knowledge_chunk.doc_id is '文档ID';

comment on column public.t_knowledge_chunk.chunk_index is '分块序号';

comment on column public.t_knowledge_chunk.content is '分块内容';

comment on column public.t_knowledge_chunk.content_hash is '内容哈希';

comment on column public.t_knowledge_chunk.char_count is '字符数';

comment on column public.t_knowledge_chunk.token_count is 'Token数';

comment on column public.t_knowledge_chunk.enabled is '是否启用';

comment on column public.t_knowledge_chunk.created_by is '创建人';

comment on column public.t_knowledge_chunk.updated_by is '修改人';

comment on column public.t_knowledge_chunk.create_time is '创建时间';

comment on column public.t_knowledge_chunk.update_time is '更新时间';

comment on column public.t_knowledge_chunk.deleted is '是否删除 0：正常 1：删除';

alter table public.t_knowledge_chunk
    owner to postgres;

create index idx_doc_id
    on public.t_knowledge_chunk (doc_id);

create table public.t_knowledge_document_chunk_log
(
    id               varchar(20) not null
        primary key,
    doc_id           varchar(20) not null,
    status           varchar(16) not null,
    process_mode     varchar(16),
    chunk_strategy   varchar(16),
    pipeline_id      varchar(20),
    extract_duration bigint,
    chunk_duration   bigint,
    embed_duration   bigint,
    persist_duration bigint,
    total_duration   bigint,
    chunk_count      integer,
    error_message    text,
    start_time       timestamp,
    end_time         timestamp,
    create_time      timestamp default CURRENT_TIMESTAMP,
    update_time      timestamp default CURRENT_TIMESTAMP
);

comment on table public.t_knowledge_document_chunk_log is '知识库文档分块日志表';

comment on column public.t_knowledge_document_chunk_log.id is 'ID';

comment on column public.t_knowledge_document_chunk_log.doc_id is '文档ID';

comment on column public.t_knowledge_document_chunk_log.status is '状态';

comment on column public.t_knowledge_document_chunk_log.process_mode is '处理模式';

comment on column public.t_knowledge_document_chunk_log.chunk_strategy is '分块策略';

comment on column public.t_knowledge_document_chunk_log.pipeline_id is 'Pipeline ID';

comment on column public.t_knowledge_document_chunk_log.extract_duration is '提取耗时（毫秒）';

comment on column public.t_knowledge_document_chunk_log.chunk_duration is '分块耗时（毫秒）';

comment on column public.t_knowledge_document_chunk_log.embed_duration is '向量化耗时（毫秒）';

comment on column public.t_knowledge_document_chunk_log.persist_duration is 'DB持久化耗时（毫秒）';

comment on column public.t_knowledge_document_chunk_log.total_duration is '总耗时（毫秒）';

comment on column public.t_knowledge_document_chunk_log.chunk_count is '分块数量';

comment on column public.t_knowledge_document_chunk_log.error_message is '错误信息';

comment on column public.t_knowledge_document_chunk_log.start_time is '开始时间';

comment on column public.t_knowledge_document_chunk_log.end_time is '结束时间';

comment on column public.t_knowledge_document_chunk_log.create_time is '创建时间';

comment on column public.t_knowledge_document_chunk_log.update_time is '更新时间';

alter table public.t_knowledge_document_chunk_log
    owner to postgres;

create index idx_doc_id_log
    on public.t_knowledge_document_chunk_log (doc_id);

create table public.t_knowledge_vector
(
    id        varchar(20) not null
        primary key,
    content   text,
    metadata  jsonb,
    embedding vector(1536)
);

comment on table public.t_knowledge_vector is '知识库向量存储表';

comment on column public.t_knowledge_vector.id is '分块ID';

comment on column public.t_knowledge_vector.content is '分块文本内容';

comment on column public.t_knowledge_vector.metadata is '元数据';

comment on column public.t_knowledge_vector.embedding is '向量';

alter table public.t_knowledge_vector
    owner to postgres;

create index idx_kv_metadata
    on public.t_knowledge_vector using gin (metadata);

create index idx_kv_embedding
    on public.t_knowledge_vector using hnsw (embedding public.vector_cosine_ops);

create table public.t_learning_record
(
    id              varchar(20) not null
        primary key,
    user_id         varchar(20) not null,
    kb_id           varchar(20) not null,
    conversation_id varchar(64),
    message_id      varchar(20),
    question        text        not null,
    answer          text,
    knowledge_tags  text,
    create_time     timestamp default CURRENT_TIMESTAMP,
    update_time     timestamp default CURRENT_TIMESTAMP,
    deleted         smallint  default 0
);

comment on table public.t_learning_record is '学习记录表';

comment on column public.t_learning_record.id is 'ID';

comment on column public.t_learning_record.user_id is '用户ID';

comment on column public.t_learning_record.kb_id is '课程(知识库)ID';

comment on column public.t_learning_record.conversation_id is '会话ID';

comment on column public.t_learning_record.message_id is '消息ID';

comment on column public.t_learning_record.question is '用户问题';

comment on column public.t_learning_record.answer is 'AI 回答';

comment on column public.t_learning_record.knowledge_tags is '知识点标签(逗号分隔)';

comment on column public.t_learning_record.create_time is '创建时间';

comment on column public.t_learning_record.update_time is '更新时间';

comment on column public.t_learning_record.deleted is '是否删除 0：正常 1：删除';

alter table public.t_learning_record
    owner to postgres;

create index idx_lr_user_kb_time
    on public.t_learning_record (user_id asc, kb_id asc, create_time desc);

create index idx_lr_user_time
    on public.t_learning_record (user_id asc, create_time desc);

create table public.t_review_reminder
(
    id               varchar(20)  not null
        primary key,
    user_id          varchar(20)  not null,
    kb_id            varchar(20),
    topic            varchar(255) not null,
    remark           text,
    raw_text         text,
    remind_time      timestamp    not null,
    status           smallint  default 0,
    notified_at      timestamp,
    source_record_id varchar(20),
    create_time      timestamp default CURRENT_TIMESTAMP,
    update_time      timestamp default CURRENT_TIMESTAMP,
    deleted          smallint  default 0
);

comment on table public.t_review_reminder is '复习提醒表';

comment on column public.t_review_reminder.id is 'ID';

comment on column public.t_review_reminder.user_id is '用户ID';

comment on column public.t_review_reminder.kb_id is '关联课程(知识库)ID';

comment on column public.t_review_reminder.topic is '复习主题/知识点';

comment on column public.t_review_reminder.remark is '备注';

comment on column public.t_review_reminder.raw_text is '用户原始输入';

comment on column public.t_review_reminder.remind_time is '提醒时间';

comment on column public.t_review_reminder.status is '状态 0：待提醒 1：已提醒 2：已完成 3：已取消';

comment on column public.t_review_reminder.notified_at is '实际通知时间';

comment on column public.t_review_reminder.source_record_id is '来源学习记录ID';

comment on column public.t_review_reminder.create_time is '创建时间';

comment on column public.t_review_reminder.update_time is '更新时间';

comment on column public.t_review_reminder.deleted is '是否删除 0：正常 1：删除';

alter table public.t_review_reminder
    owner to postgres;

create index idx_rr_user_status_time
    on public.t_review_reminder (user_id, status, remind_time);

create index idx_rr_status_time
    on public.t_review_reminder (status, remind_time);

create table public.t_system_config
(
    config_key   varchar(64) not null
        primary key,
    config_value text,
    update_time  timestamp default CURRENT_TIMESTAMP
);

comment on table public.t_system_config is '系统配置 KV 表';

comment on column public.t_system_config.config_key is '配置 key（如 embedding.provider / ai.providers.bailian.api-key）';

comment on column public.t_system_config.config_value is '配置值（字符串形式）';

comment on column public.t_system_config.update_time is '更新时间';

alter table public.t_system_config
    owner to postgres;

