import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { API_CONFIG, Message, KnowledgeBase, SimpleRagDocument, User, SystemConfig, ChatSession } from '../types'

const TOKEN_KEY = 'ra_token'

const service: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 — 添加 token
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers['satoken'] = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 — 处理 401
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    if (res.code !== 0 && res.code !== undefined) {
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('ra_admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

const request = <T>(config: AxiosRequestConfig): Promise<T> => {
  return service.request(config)
}

export class ApiService {
  // 认证 API
  static auth = {
    login: (data: { username: string; password: string }) =>
      request<{ data: User & { token: string } }>({
        method: 'post',
        url: '/user/login',
        data,
      }),

    register: (data: { username: string; password: string }) =>
      request<{ data: User & { token: string } }>({
        method: 'post',
        url: '/user/register',
        data,
      }),

    logout: () =>
      request<{ data: null }>({
        method: 'post',
        url: '/user/logout',
      }),

    currentUser: () =>
      request<{ data: User }>({
        method: 'get',
        url: '/user/current',
      }),
  }

  // 知识库 API
  static knowledgeBase = {
    create: (data: { name: string; embeddingModel: string; createdBy?: string }) =>
      request<{ data: KnowledgeBase }>({
        method: 'post',
        url: '/knowledge/base',
        data,
      }),

    getById: (id: string) =>
      request<{ data: KnowledgeBase }>({
        method: 'get',
        url: `/knowledge/base/${id}`,
      }),

    list: (pageNum: number = 1, pageSize: number = 10) =>
      request<{ data: KnowledgeBase[]; total: number }>({
        method: 'get',
        url: '/knowledge/base/page',
        params: { pageNum, pageSize },
      }),

    update: (id: string, data: { name: string }) =>
      request<{ data: KnowledgeBase }>({
        method: 'put',
        url: `/knowledge/base/${id}`,
        data,
      }),

    delete: (id: string) =>
      request<{ data: null }>({
        method: 'delete',
        url: `/knowledge/base/${id}`,
      }),
  }

  // 文档 API
  static document = {
    upload: (data: FormData) =>
      request<{ data: SimpleRagDocument }>({
        method: 'post',
        url: '/knowledge/document/upload',
        data,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),

    list: (kbId: string, pageNum: number = 1, pageSize: number = 10) =>
      request<{ data: SimpleRagDocument[]; total: number }>({
        method: 'get',
        url: '/knowledge/document/page',
        params: { kbId, pageNum, pageSize },
      }),

    chunk: (docId: string) =>
      request<{ data: null }>({
        method: 'post',
        url: '/knowledge/document/chunk',
        data: { docId },
      }),

    getById: (id: string) =>
      request<{ data: SimpleRagDocument }>({
        method: 'get',
        url: `/knowledge/document/${id}`,
      }),

    delete: (id: string) =>
      request<{ data: null }>({
        method: 'delete',
        url: `/knowledge/document/${id}`,
      }),

    rebuildVectors: (id: string) =>
      request<{ data: null }>({
        method: 'post',
        url: `/knowledge/document/${id}/rebuild`,
      }),

    update: (id: string, data: { docName?: string; summary?: string; keywords?: string }) =>
      request<{ data: null }>({
        method: 'put',
        url: `/knowledge/document/${id}`,
        data,
      }),

    query: (data: {
      docName?: string;
      kbId?: string;
      startTime?: string;
      endTime?: string;
      status?: string;
      fileType?: string;
      pageNum?: number;
      pageSize?: number;
    }) =>
      request<{ data: SimpleRagDocument[]; total: number; pageNum: number; pageSize: number; pages: number }>({
        method: 'post',
        url: '/knowledge/document/query',
        data,
      }),

    deleteBatch: (docIds: string[]) =>
      request<{ data: null }>({
        method: 'delete',
        url: '/knowledge/document/batch',
        data: docIds,
      }),
  }

  // RAG API
  static rag = {
    createConversation: (kbId: string) =>
      request<{ conversationId: string }>({
        method: 'post',
        url: '/rag/conversation',
        params: { kbId },
      }),

    chat: (conversationId: string, question: string, topK: number = 3) =>
      request<{ answer: string }>({
        method: 'post',
        url: '/rag/chat',
        params: { conversationId, question, topK },
      }),

    getConversationHistory: (conversationId: string) =>
      request<{ data: Message[] }>({
        method: 'get',
        url: `/rag/conversation/${conversationId}`,
      }),

    deleteConversation: (conversationId: string) =>
      request<void>({
        method: 'delete',
        url: `/rag/conversation/${conversationId}`,
      }),

    query: (kbId: string, question: string, topK: number = 3) =>
      request<{ answer: string; conversationId: string }>({
        method: 'post',
        url: '/rag/query',
        params: { kbId, question, topK },
      }),
  }

  // 用户 API
  static user = {
    list: (pageNum: number = 1, pageSize: number = 10) =>
      request<{ data: User[]; total: number }>({
        method: 'get',
        url: '/user/page',
        params: { pageNum, pageSize },
      }),

    getById: (id: string) =>
      request<{ data: User }>({
        method: 'get',
        url: `/user/${id}`,
      }),

    create: (data: { username: string; password: string; role?: string }) =>
      request<{ data: User }>({
        method: 'post',
        url: '/user',
        data,
      }),

    update: (id: string, data: { username?: string; password?: string; role?: string }) =>
      request<{ data: User }>({
        method: 'put',
        url: `/user/${id}`,
        data,
      }),

    delete: (id: string) =>
      request<{ data: null }>({
        method: 'delete',
        url: `/user/${id}`,
      }),
  }

  // 系统配置 API
  static system = {
    getConfig: (key: string) =>
      request<{ data: SystemConfig }>({
        method: 'get',
        url: `/system/config/${key}`,
      }),

    updateConfig: (key: string, value: string) =>
      request<{ data: SystemConfig }>({
        method: 'put',
        url: `/system/config/${key}`,
        data: { value },
      }),
  }

  // 仪表板 API
  static dashboard = {
    getStats: () =>
      request<{ data: { knowledgeBaseCount: number; documentCount: number; userCount: number } }>({
        method: 'get',
        url: '/dashboard/stats',
      }),
  }

  // 聊天 API
  static chat = {
    createSession: (data: { kbId: string; userId: string }) =>
      request<{ conversationId: string }>({
        method: 'post',
        url: '/rag/conversation',
        params: { kbId: data.kbId, userId: data.userId },
      }),

    chat: (conversationId: string, question: string, topK: number = 3) =>
      request<{ answer: string }>({
        method: 'post',
        url: '/rag/chat',
        params: { conversationId, question, topK },
      }),

    getMessages: (conversationId: string) =>
      request<Message[]>({
        method: 'get',
        url: `/rag/conversation/${conversationId}`,
      }),

    delete: (conversationId: string) =>
      request<void>({
        method: 'delete',
        url: `/rag/conversation/${conversationId}`,
      }),

    renameSession: (conversationId: string, title: string) =>
      request<void>({
        method: 'put',
        url: `/rag/conversation/${conversationId}`,
        data: { title },
      }),

    listConversations: (userId: string) =>
      request<{ data: ChatSession[]; total: number }>({
        method: 'get',
        url: '/rag/conversation/list',
        params: { userId },
      }),

    streamChat: (kbId: string, question: string, conversationId?: string, topK: number = 3) => {
      const params = new URLSearchParams({ kbId, question, topK: topK.toString() })
      if (conversationId) {
        params.append('conversationId', conversationId)
      }
      // 添加 token 到 SSE 请求
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        params.append('satoken', token)
      }
      return `/rag/stream-chat?${params.toString()}`
    },
  }
}

export default service
