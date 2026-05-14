import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Cpu, Save, RefreshCw, Globe, ArrowUpDown } from 'lucide-react'
import { ApiService } from '@/services/api'

interface AIConfig {
  provider: string
  providers: {
    bailian: { apiKey: string; model: string; baseUrl: string }
    siliconflow: { apiKey: string; model: string; baseUrl: string }
    ollama: { baseUrl: string; model: string }
  }
}

interface EmbeddingConfig {
  provider: string
  siliconflowApiKey: string
  siliconflowModel: string
  siliconflowBaseUrl: string
  bailianApiKey: string
  bailianModel: string
  bailianBaseUrl: string
  ollamaBaseUrl: string
  ollamaModel: string
}

interface WebSearchConfig {
  enabled: boolean
  scoreThreshold: number
  topK: number
}

interface RerankerConfig {
  enabled: boolean
  apiKey: string
  model: string
  baseUrl: string
  topN: number
  scoreThreshold: number
}

export function SystemSettings() {
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null)
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null)
  const [webSearchConfig, setWebSearchConfig] = useState<WebSearchConfig | null>(null)
  const [rerankerConfig, setRerankerConfig] = useState<RerankerConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingAI, setIsSavingAI] = useState(false)
  const [isSavingEmbedding, setIsSavingEmbedding] = useState(false)
  const [isSavingWebSearch, setIsSavingWebSearch] = useState(false)
  const [isSavingReranker, setIsSavingReranker] = useState(false)

  // 加载配置
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    setIsLoading(true)
    try {
      const [aiRes, embeddingRes, webSearchRes, rerankerRes] = await Promise.all([
        ApiService.system.getAIConfig(),
        ApiService.system.getEmbeddingConfig(),
        ApiService.system.getWebSearchConfig(),
        ApiService.system.getRerankerConfig(),
      ])
      setAIConfig(aiRes.data)
      setEmbeddingConfig(embeddingRes.data)
      setWebSearchConfig(webSearchRes.data)
      setRerankerConfig(rerankerRes.data)
    } catch (error) {
      console.error('Failed to load configs:', error)
      alert('加载配置失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 保存 AI 配置
  const handleSaveAI = async () => {
    if (!aiConfig) return

    setIsSavingAI(true)
    try {
      await ApiService.system.updateAIConfig(aiConfig)
      alert('AI 配置保存成功（注意：仅保存到内存，重启后失效）')
    } catch (error) {
      console.error('Failed to save AI config:', error)
      alert('保存 AI 配置失败')
    } finally {
      setIsSavingAI(false)
    }
  }

  // 保存 Embedding 配置
  const handleSaveEmbedding = async () => {
    if (!embeddingConfig) return

    setIsSavingEmbedding(true)
    try {
      await ApiService.system.updateEmbeddingConfig(embeddingConfig)
      alert('Embedding 配置保存成功（注意：仅保存到内存，重启后失效）')
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('保存配置失败')
    } finally {
      setIsSavingEmbedding(false)
    }
  }

  // 保存联网搜索配置
  const handleSaveWebSearch = async () => {
    if (!webSearchConfig) return

    setIsSavingWebSearch(true)
    try {
      await ApiService.system.updateWebSearchConfig(webSearchConfig)
      alert('联网搜索配置保存成功（注意：仅保存到内存，重启后失效）')
    } catch (error) {
      console.error('Failed to save web search config:', error)
      alert('保存联网搜索配置失败')
    } finally {
      setIsSavingWebSearch(false)
    }
  }

  // 保存 Reranker 配置
  const handleSaveReranker = async () => {
    if (!rerankerConfig) return

    setIsSavingReranker(true)
    try {
      await ApiService.system.updateRerankerConfig(rerankerConfig)
      alert('Reranker 配置保存成功（注意：仅保存到内存，重启后失效）')
    } catch (error) {
      console.error('Failed to save reranker config:', error)
      alert('保存 Reranker 配置失败')
    } finally {
      setIsSavingReranker(false)
    }
  }

  const updateEmbeddingField = (field: keyof EmbeddingConfig, value: string) => {
    if (!embeddingConfig) return
    setEmbeddingConfig({
      ...embeddingConfig,
      [field]: value,
    })
  }

  const updateAIField = (
    provider: 'bailian' | 'siliconflow' | 'ollama',
    field: string,
    value: string
  ) => {
    if (!aiConfig) return
    setAIConfig({
      ...aiConfig,
      providers: {
        ...aiConfig.providers,
        [provider]: {
          ...(aiConfig.providers[provider] as any),
          [field]: value,
        },
      },
    })
  }

  // 脱敏显示 API Key（前后五位）
  const maskApiKey = (apiKey: string) => {
    if (!apiKey || apiKey.length <= 10) return apiKey
    return `${apiKey.slice(0, 5)}${'*'.repeat(apiKey.length - 10)}${apiKey.slice(-5)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-education-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-education-blue-900">系统设置</h2>
        <p className="text-sm text-education-blue-600 mt-1">配置 AI 模型、Embedding 模型、联网搜索和重排序参数</p>
      </div>

      {/* AI 模型配置 */}
      <Card className="border-0 shadow-lg shadow-education-blue-200/50">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-purple-900">AI 模型配置</CardTitle>
                <CardDescription className="text-purple-600">
                  配置 LLM 模型的 API 密钥和参数
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSaveAI} disabled={isSavingAI}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingAI ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* AI 提供商选择 */}
          <div className="space-y-2">
            <Label>AI 提供商</Label>
            <select
              value={aiConfig?.provider || 'bailian'}
              onChange={(e) => {
                if (!aiConfig) return
                setAIConfig({
                  ...aiConfig,
                  provider: e.target.value,
                })
              }}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="bailian">阿里云百炼 (Bailian)</option>
              <option value="siliconflow">SiliconFlow</option>
              <option value="ollama">Ollama (本地)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              当前使用：{aiConfig?.provider === 'bailian' ? '阿里云百炼' : aiConfig?.provider === 'siliconflow' ? 'SiliconFlow' : 'Ollama'}
            </p>
          </div>
          {/* Bailian */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-education-blue-800 border-b pb-2">
              阿里云百炼 (Bailian)
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={maskApiKey(aiConfig?.providers.bailian.apiKey || '')}
                  onChange={(e) => updateAIField('bailian', 'apiKey', e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={aiConfig?.providers.bailian.model || ''}
                  onChange={(e) => updateAIField('bailian', 'model', e.target.value)}
                  placeholder="qwen-plus"
                />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={aiConfig?.providers.bailian.baseUrl || ''}
                  onChange={(e) => updateAIField('bailian', 'baseUrl', e.target.value)}
                  placeholder="https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
                />
              </div>
            </div>
          </div>

          {/* SiliconFlow */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-education-blue-800 border-b pb-2">
              SiliconFlow
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={maskApiKey(aiConfig?.providers.siliconflow.apiKey || '')}
                  onChange={(e) => updateAIField('siliconflow', 'apiKey', e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={aiConfig?.providers.siliconflow.model || ''}
                  onChange={(e) => updateAIField('siliconflow', 'model', e.target.value)}
                  placeholder="deepseek-ai/DeepSeek-V2.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={aiConfig?.providers.siliconflow.baseUrl || ''}
                  onChange={(e) => updateAIField('siliconflow', 'baseUrl', e.target.value)}
                  placeholder="https://api.siliconflow.cn/v1"
                />
              </div>
            </div>
          </div>

          {/* Ollama */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-education-blue-800 border-b pb-2">
              Ollama (本地)
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={aiConfig?.providers.ollama.baseUrl || ''}
                  onChange={(e) => updateAIField('ollama', 'baseUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={aiConfig?.providers.ollama.model || ''}
                  onChange={(e) => updateAIField('ollama', 'model', e.target.value)}
                  placeholder="deepseek-r1:1.5b"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedding 模型配置 */}
      <Card className="border-0 shadow-lg shadow-education-blue-200/50">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Cpu className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-blue-900">Embedding 模型配置</CardTitle>
                <CardDescription className="text-blue-600">
                  配置向量嵌入模型的 API 密钥和参数
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSaveEmbedding} disabled={isSavingEmbedding}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingEmbedding ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 基础配置 */}
          <div className="space-y-2">
            <Label>Embedding 提供商</Label>
            <select
              value={embeddingConfig?.provider || 'siliconflow'}
              onChange={(e) => updateEmbeddingField('provider', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="siliconflow">SiliconFlow</option>
              <option value="bailian">阿里云百炼</option>
              <option value="ollama">Ollama (本地)</option>
            </select>
          </div>

          {/* SiliconFlow */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-education-blue-800 border-b pb-2">
              SiliconFlow 配置
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={maskApiKey(embeddingConfig?.siliconflowApiKey || '')}
                  onChange={(e) => updateEmbeddingField('siliconflowApiKey', e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={embeddingConfig?.siliconflowModel || ''}
                  onChange={(e) => updateEmbeddingField('siliconflowModel', e.target.value)}
                  placeholder="BAAI/bge-large-zh-v1.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={embeddingConfig?.siliconflowBaseUrl || ''}
                  onChange={(e) => updateEmbeddingField('siliconflowBaseUrl', e.target.value)}
                  placeholder="https://api.siliconflow.cn/v1/embeddings"
                />
              </div>
            </div>
          </div>

          {/* Bailian */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-education-blue-800 border-b pb-2">
              阿里云百炼配置
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={maskApiKey(embeddingConfig?.bailianApiKey || '')}
                  onChange={(e) => updateEmbeddingField('bailianApiKey', e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={embeddingConfig?.bailianModel || ''}
                  onChange={(e) => updateEmbeddingField('bailianModel', e.target.value)}
                  placeholder="text-embedding-v4"
                />
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={embeddingConfig?.bailianBaseUrl || ''}
                  onChange={(e) => updateEmbeddingField('bailianBaseUrl', e.target.value)}
                  placeholder="https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding"
                />
              </div>
            </div>
          </div>

          {/* Ollama */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-education-blue-800 border-b pb-2">
              Ollama 配置
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={embeddingConfig?.ollamaBaseUrl || ''}
                  onChange={(e) => updateEmbeddingField('ollamaBaseUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={embeddingConfig?.ollamaModel || ''}
                  onChange={(e) => updateEmbeddingField('ollamaModel', e.target.value)}
                  placeholder="bge-large-zh"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 联网搜索配置 */}
      <Card className="border-0 shadow-lg shadow-education-blue-200/50">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Globe className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-emerald-900">联网搜索配置</CardTitle>
                <CardDescription className="text-emerald-600">
                  配置联网搜索兜底策略和相关性阈值
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSaveWebSearch} disabled={isSavingWebSearch}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingWebSearch ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>启用联网搜索</Label>
              <button
                type="button"
                role="switch"
                aria-checked={webSearchConfig?.enabled ?? true}
                onClick={() => {
                  if (!webSearchConfig) return
                  setWebSearchConfig({ ...webSearchConfig, enabled: !webSearchConfig.enabled })
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  webSearchConfig?.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    webSearchConfig?.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <p className="text-xs text-muted-foreground">
                开启后，知识库检索未命中时可自动联网搜索
              </p>
            </div>
            <div className="space-y-2">
              <Label>分数阈值 (scoreThreshold)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={webSearchConfig?.scoreThreshold ?? 0.02}
                onChange={(e) => {
                  if (!webSearchConfig) return
                  setWebSearchConfig({ ...webSearchConfig, scoreThreshold: parseFloat(e.target.value) || 0 })
                }}
                placeholder="0.02"
              />
              <p className="text-xs text-muted-foreground">
                向量检索 top1 分数低于此值视为未命中，触发联网兜底（范围 0~1）
              </p>
            </div>
            <div className="space-y-2">
              <Label>返回结果最大条数 (topK)</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={webSearchConfig?.topK ?? 5}
                onChange={(e) => {
                  if (!webSearchConfig) return
                  setWebSearchConfig({ ...webSearchConfig, topK: parseInt(e.target.value) || 1 })
                }}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                联网搜索返回的最大结果条数
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reranker 重排序配置 */}
      <Card className="border-0 shadow-lg shadow-education-blue-200/50">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <ArrowUpDown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-amber-900">Reranker 重排序配置</CardTitle>
                <CardDescription className="text-amber-600">
                  配置检索结果重排序模型，提升文档相关性排序精度
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSaveReranker} disabled={isSavingReranker}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingReranker ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 启用开关 */}
          <div className="space-y-2">
            <Label>启用重排序</Label>
            <button
              type="button"
              role="switch"
              aria-checked={rerankerConfig?.enabled ?? false}
              onClick={() => {
                if (!rerankerConfig) return
                setRerankerConfig({ ...rerankerConfig, enabled: !rerankerConfig.enabled })
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                rerankerConfig?.enabled ? 'bg-amber-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  rerankerConfig?.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <p className="text-xs text-muted-foreground">
              开启后，向量检索结果会经过重排序模型二次排序，提高相关性
            </p>
          </div>

          {/* API 配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-education-blue-800 border-b pb-2">
              API 配置
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={maskApiKey(rerankerConfig?.apiKey || '')}
                  onChange={(e) => {
                    if (!rerankerConfig) return
                    setRerankerConfig({ ...rerankerConfig, apiKey: e.target.value })
                  }}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={rerankerConfig?.model || ''}
                  onChange={(e) => {
                    if (!rerankerConfig) return
                    setRerankerConfig({ ...rerankerConfig, model: e.target.value })
                  }}
                  placeholder="BAAI/bge-reranker-v2-m3"
                />
              </div>
              <div className="space-y-2">
                <Label>API 地址</Label>
                <Input
                  value={rerankerConfig?.baseUrl || ''}
                  onChange={(e) => {
                    if (!rerankerConfig) return
                    setRerankerConfig({ ...rerankerConfig, baseUrl: e.target.value })
                  }}
                  placeholder="https://api.siliconflow.cn/v1/rerank"
                />
              </div>
            </div>
          </div>

          {/* 参数配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-education-blue-800 border-b pb-2">
              参数配置
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>返回结果数 (topN)</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={rerankerConfig?.topN ?? 4}
                  onChange={(e) => {
                    if (!rerankerConfig) return
                    setRerankerConfig({ ...rerankerConfig, topN: parseInt(e.target.value) || 1 })
                  }}
                  placeholder="4"
                />
                <p className="text-xs text-muted-foreground">
                  重排序后保留的 top-N 结果数量，0 表示保留全部仅排序
                </p>
              </div>
              <div className="space-y-2">
                <Label>相关性分数阈值 (scoreThreshold)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={rerankerConfig?.scoreThreshold ?? 0.3}
                  onChange={(e) => {
                    if (!rerankerConfig) return
                    setRerankerConfig({ ...rerankerConfig, scoreThreshold: parseFloat(e.target.value) || 0 })
                  }}
                  placeholder="0.3"
                />
                <p className="text-xs text-muted-foreground">
                  重排序后 top1 分数低于此值视为未命中，触发联网兜底（范围 0~1）
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
