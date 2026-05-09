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
import { Brain, Cpu, Save, RefreshCw } from 'lucide-react'
import { ApiService } from '@/services/api'

interface AIConfig {
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

export function SystemSettings() {
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null)
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingAI, setIsSavingAI] = useState(false)
  const [isSavingEmbedding, setIsSavingEmbedding] = useState(false)

  // 加载配置
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    setIsLoading(true)
    try {
      const [aiRes, embeddingRes] = await Promise.all([
        ApiService.system.getAIConfig(),
        ApiService.system.getEmbeddingConfig(),
      ])
      setAIConfig(aiRes.data)
      setEmbeddingConfig(embeddingRes.data)
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
        <p className="text-sm text-education-blue-600 mt-1">配置 AI 模型和 Embedding 模型参数</p>
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
    </div>
  )
}
