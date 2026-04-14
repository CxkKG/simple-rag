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

// 分块策略
export enum ChunkStrategy {
  FixedSize = 'fixed_size',
  StructureAware = 'structure_aware',
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
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 文档类型
export interface Document {
  id: string
  kbId: string
  docName: string
  enabled: number
  chunkCount: number
  fileUrl: string
  fileType: string
  fileSize: number
  processMode: string
  status: DocumentStatus
  sourceType: string
  createdAt: string
  updatedAt: string
}

// 用户类型
export interface User {
  id: string
  username: string
  role: UserRole
  avatar?: string
  createdAt: string
  updatedAt: string
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
