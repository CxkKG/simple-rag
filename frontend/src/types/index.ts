// API 配置
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/simple-rag',
  timeout: 30000,
}

// 知识库配置
export const KNOWLEDGE_CONFIG = {
  supportedFileTypes: ['.pdf', '.doc', '.docx', '.md', '.txt', '.csv', '.xlsx'],
  defaultChunkSize: 500,
  defaultOverlapSize: 50,
}

// 用户角色
export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

// 文档状态
export enum DocumentStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
}

// 请求结果类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  total?: number
}

// 分页请求参数
export interface PaginationParams {
  pageNum: number
  pageSize: number
}

// 分页响应
export interface PaginationResponse<T> {
  list: T[]
  total: number
  pageNum: number
  pageSize: number
  totalPages: number
}

// 知识库类型
export interface KnowledgeBase {
  id: string
  name: string
  embeddingModel: string
  collectionName: string
  documentCount?: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 文档类型
export interface SimpleRagDocument {
  id: string
  kbId: string
  kbName?: string
  docName: string
  enabled?: number
  chunkCount?: number
  fileUrl?: string
  content?: string
  fileType: string
  fileSize?: number
  processMode?: string
  status: DocumentStatus
  sourceType?: string
  summary?: string
  keywords?: string
  createdAt: string
  updatedAt?: string
}

export interface DocumentContentPage {
  content: string
  total: number
  pageNum: number
  pageSize: number
  pages: number
  fileType?: string
  docName?: string
  previewOnly?: boolean
  oversized?: boolean
  errorMessage?: string
}

// 用户类型
export interface User {
  id: string
  username: string
  role: UserRole
  avatar?: string
  createdAt: string
  updatedAt?: string
}

// 系统配置类型
export interface SystemConfig {
  key: string
  value: string
  description: string
  category: string
}

// 消息类型（用于聊天会话）
export interface Message {
  id?: string
  conversationId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

// 聊天会话类型
export interface ChatSession {
  id: string
  conversationId: string
  userId: string
  kbId: string
  title: string
  lastTime: string
  createTime: string
  updateTime: string
}

// 学习记录
export interface LearningRecord {
  id: string
  userId: string
  kbId: string
  conversationId?: string
  messageId?: string
  question: string
  answer?: string
  knowledgeTags?: string
  createTime: string
  updateTime?: string
}

// 知识点频次统计
export interface KnowledgePointStat {
  tag: string
  kbId?: string
  count: number
  lastTime?: string
}

// 复习提醒
export interface ReviewReminder {
  id: string
  userId: string
  kbId?: string
  topic: string
  remark?: string
  rawText?: string
  remindTime: string
  // 0-待提醒，1-已提醒，2-已完成，3-已取消
  status: number
  notifiedAt?: string
  sourceRecordId?: string
  createTime: string
  updateTime?: string
}

// 时间表达式解析结果
export interface ParsedReminder {
  remindTime: string
  topic?: string
  remark?: string
  source?: string
}
