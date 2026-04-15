import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { API_CONFIG, Message, KnowledgeBase, Document, User, SystemConfig, ChatSession } from '../types'

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    // 统一的响应处理
    if (res.code !== 0 && res.code !== undefined) {
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// 基础请求方法
const request = <T>(config: AxiosRequestConfig): Promise<T> => {
  return service.request(config)
}

// API 服务类
export class ApiService {
  // 知识库 API
  static knowledgeBase = {
    // 创建知识库
    create: (data: { name: string; embeddingModel: string; createdBy?: string }) =>
      request<{ data: KnowledgeBase }>({
        method: 'post',
        url: '/knowledge/base',
        data,
      }),

    // 获取知识库详情
    getById: (id: string) =>
      request<{ data: KnowledgeBase }>({
        method: 'get',
        url: `/knowledge/base/${id}`,
      }),

    // 分页查询知识库
    list: (pageNum: number = 1, pageSize: number = 10) =>
      request<{ data: KnowledgeBase[]; total: number }>({
        method: 'get',
        url: '/knowledge/base/page',
        params: { pageNum, pageSize },
      }),

    // 更新知识库
    update: (id: string, data: { name: string }) =>
      request<{ data: KnowledgeBase }>({
        method: 'put',
        url: `/knowledge/base/${id}`,
        data,
      }),

    // 删除知识库
    delete: (id: string) =>
      request<{ data: null }>({
        method: 'delete',
        url: `/knowledge/base/${id}`,
      }),
  }

  // 文档 API
  static document = {
    // 上传文档
    upload: (data: FormData) =>
      request<{ data: Document }>({
        method: 'post',
        url: '/knowledge/document/upload',
        data,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),

    // 分页查询文档
    list: (kbId: string, pageNum: number = 1, pageSize: number = 10) =>
      request<{ data: Document[]; total: number }>({
        method: 'get',
        url: '/knowledge/document/page',
        params: { kbId, pageNum, pageSize },
      }),

    // 手动分块
    chunk: (docId: string) =>
      request<{ data: null }>({
        method: 'post',
        url: '/knowledge/document/chunk',
        data: { docId },
      }),

    // 获取文档详情
    getById: (id: string) =>
      request<{ data: Document }>({
        method: 'get',
        url: `/knowledge/document/${id}`,
      }),

    // 删除文档
    delete: (id: string) =>
      request<{ data: null }>({
        method: 'delete',
        url: `/knowledge/document/${id}`,
      }),

    // 重建向量
    rebuildVectors: (id: string) =>
      request<{ data: null }>({
        method: 'post',
        url: `/knowledge/document/${id}/rebuild`,
      }),
  }

  // RAG API
  static rag = {
    // 创建会话
    createConversation: (kbId: string) =>
      request<{ conversationId: string }>({
        method: 'post',
        url: '/rag/conversation',
        params: { kbId },
      }),

    // 问答
    chat: (conversationId: string, question: string, topK: number = 3) =>
      request<{ answer: string }>({
        method: 'post',
        url: '/rag/chat',
        params: { conversationId, question, topK },
      }),

    // 获取会话历史
    getConversationHistory: (conversationId: string) =>
      request<Message[]>({
        method: 'get',
        url: `/rag/conversation/${conversationId}`,
      }),

    // 删除会话
    deleteConversation: (conversationId: string) =>
      request<void>({
        method: 'delete',
        url: `/rag/conversation/${conversationId}`,
      }),

    // 快捷问答
    query: (kbId: string, question: string, topK: number = 3) =>
      request<{ answer: string; conversationId: string }>({
        method: 'post',
        url: '/rag/query',
        params: { kbId, question, topK },
      }),
  }

  // 用户 API
  static user = {
    // 分页查询用户
    list: (pageNum: number = 1, pageSize: number = 10) =>
      request<{ data: User[]; total: number }>({
        method: 'get',
        url: '/user/page',
        params: { pageNum, pageSize },
      }),

    // 获取用户详情
    getById: (id: string) =>
      request<{ data: User }>({
        method: 'get',
        url: `/user/${id}`,
      }),

    // 创建用户
    create: (data: { username: string; password: string; role?: string }) =>
      request<{ data: User }>({
        method: 'post',
        url: '/user',
        data,
      }),

    // 更新用户
    update: (id: string, data: { username?: string; password?: string; role?: string }) =>
      request<{ data: User }>({
        method: 'put',
        url: `/user/${id}`,
        data,
      }),

    // 删除用户
    delete: (id: string) =>
      request<{ data: null }>({
        method: 'delete',
        url: `/user/${id}`,
      }),
  }

  // 系统配置 API
  static system = {
    // 获取配置
    getConfig: (key: string) =>
      request<{ data: SystemConfig }>({
        method: 'get',
        url: `/system/config/${key}`,
      }),

    // 更新配置
    updateConfig: (key: string, value: string) =>
      request<{ data: SystemConfig }>({
        method: 'put',
        url: `/system/config/${key}`,
        data: { value },
      }),
  }

  // 聊天 API
  static chat = {
    // 创建会话
    createSession: (data: { kbId: string; userId: string }) =>
      request<{ conversationId: string }>({
        method: 'post',
        url: '/rag/conversation',
        params: { kbId: data.kbId, userId: data.userId },
      }),

    // 问答
    chat: (conversationId: string, question: string, topK: number = 3) =>
      request<{ answer: string }>({
        method: 'post',
        url: '/rag/chat',
        params: { conversationId, question, topK },
      }),

    // 获取会话历史
    getMessages: (conversationId: string) =>
      request<Message[]>({
        method: 'get',
        url: `/api/conversations/${conversationId}/messages`,
      }),

    // 删除会话
    delete: (conversationId: string) =>
      request<void>({
        method: 'delete',
        url: `/api/conversations/${conversationId}`,
      }),

    // 获取会话列表
    listConversations: (userId: string) =>
      request<{ data: ChatSession[]; total: number }>({
        method: 'get',
        url: '/api/conversations',
        params: { userId },
      }),
  }
}

export default service
