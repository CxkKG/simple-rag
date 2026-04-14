import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSystemStore } from '@/stores/system'
import { Settings } from 'lucide-react'

export function SystemSettings() {
  const { config, isLoading: isLoadingConfig, updateConfig } = useSystemStore()

  const handleSave = async (key: string, value: string) => {
    await updateConfig(key, value)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">系统设置</h2>
        <p className="text-muted-foreground">配置系统参数和全局选项</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>通用配置</CardTitle>
          <CardDescription>
            设置系统的基本参数
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="siteName">站点名称</Label>
              <Input
                id="siteName"
                defaultValue={config.find(c => c.key === 'siteName')?.value || 'Simple RAG'}
                onBlur={(e) => handleSave('siteName', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultEmbeddingModel">默认 Embedding 模型</Label>
              <Input
                id="defaultEmbeddingModel"
                defaultValue={config.find(c => c.key === 'defaultEmbeddingModel')?.value || 'text-embedding-ada-002'}
                onBlur={(e) => handleSave('defaultEmbeddingModel', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultChunkSize">默认分块大小</Label>
              <Input
                id="defaultChunkSize"
                type="number"
                defaultValue={config.find(c => c.key === 'defaultChunkSize')?.value || '500'}
                onBlur={(e) => handleSave('defaultChunkSize', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 配置</CardTitle>
          <CardDescription>
            设置 AI 模型相关的参数
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="openAiApiKey">OpenAI API Key</Label>
              <Input
                id="openAiApiKey"
                type="password"
                defaultValue={config.find(c => c.key === 'openAiApiKey')?.value || ''}
                onBlur={(e) => handleSave('openAiApiKey', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="defaultModel">默认模型</Label>
              <Input
                id="defaultModel"
                defaultValue={config.find(c => c.key === 'defaultModel')?.value || 'gpt-3.5-turbo'}
                onBlur={(e) => handleSave('defaultModel', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
