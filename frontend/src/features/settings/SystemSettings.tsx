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
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-education-blue-900">系统设置</h2>
        <p className="text-sm text-education-blue-600 mt-1">配置系统参数和全局选项</p>
      </div>

      {/* 通用配置卡片 */}
      <Card className="border-0 shadow-lg shadow-education-blue-200/50">
        <CardHeader className="bg-gradient-to-r from-education-blue-50 to-education-green-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
              <Settings className="h-5 w-5 text-education-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-education-blue-900">通用配置</CardTitle>
              <CardDescription className="text-education-blue-600">
                设置系统的基本参数
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="siteName" className="text-sm font-medium">
                  站点名称
                </Label>
                <Input
                  id="siteName"
                  defaultValue={config.find(c => c.key === 'siteName')?.value || 'Simple RAG'}
                  onBlur={(e) => handleSave('siteName', e.target.value)}
                  placeholder="请输入站点名称"
                  className="h-11"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="defaultEmbeddingModel" className="text-sm font-medium">
                  默认 Embedding 模型
                </Label>
                <Input
                  id="defaultEmbeddingModel"
                  defaultValue={config.find(c => c.key === 'defaultEmbeddingModel')?.value || 'text-embedding-ada-002'}
                  onBlur={(e) => handleSave('defaultEmbeddingModel', e.target.value)}
                  placeholder="text-embedding-ada-002"
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="defaultChunkSize" className="text-sm font-medium">
                  默认分块大小
                </Label>
                <Input
                  id="defaultChunkSize"
                  type="number"
                  defaultValue={config.find(c => c.key === 'defaultChunkSize')?.value || '500'}
                  onBlur={(e) => handleSave('defaultChunkSize', e.target.value)}
                  placeholder="500"
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI 配置卡片 */}
      <Card className="border-0 shadow-lg shadow-education-blue-200/50">
        <CardHeader className="bg-gradient-to-r from-education-blue-50 to-education-green-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
              <Settings className="h-5 w-5 text-education-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-education-blue-900">AI 配置</CardTitle>
              <CardDescription className="text-education-blue-600">
                设置 AI 模型相关的参数
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="openAiApiKey" className="text-sm font-medium">
                  OpenAI API Key
                </Label>
                <Input
                  id="openAiApiKey"
                  type="password"
                  defaultValue={config.find(c => c.key === 'openAiApiKey')?.value || ''}
                  onBlur={(e) => handleSave('openAiApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="h-11"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="defaultModel" className="text-sm font-medium">
                  默认模型
                </Label>
                <Input
                  id="defaultModel"
                  defaultValue={config.find(c => c.key === 'defaultModel')?.value || 'gpt-3.5-turbo'}
                  onBlur={(e) => handleSave('defaultModel', e.target.value)}
                  placeholder="gpt-3.5-turbo"
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
