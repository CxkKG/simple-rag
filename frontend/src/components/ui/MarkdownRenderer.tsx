import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // 处理标题
        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-education-blue-900 mt-6 mb-4" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-education-blue-900 mt-5 mb-3" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-education-blue-900 mt-4 mb-2" {...props} />,
        h4: ({ node, ...props }) => <h4 className="text-base font-semibold text-education-blue-900 mt-3 mb-2" {...props} />,
        
        // 处理段落
        p: ({ node, ...props }) => <p className="leading-relaxed text-education-blue-900 mb-3" {...props} />,
        
        // 处理列表
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 mb-3" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 mb-3" {...props} />,
        li: ({ node, ...props }) => <li className="leading-relaxed text-education-blue-900" {...props} />,
        
        // 处理链接
        a: ({ node, ...props }) => <a className="text-education-blue-600 hover:text-education-blue-800 underline" {...props} />,
        
        // 处理代码块
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4">
              <code className="font-mono text-sm">{children}</code>
            </pre>
          ) : (
            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
          )
        },
        
        // 处理强调
        strong: ({ node, ...props }) => <strong className="font-bold text-education-blue-900" {...props} />,
        em: ({ node, ...props }) => <em className="italic text-education-blue-900" {...props} />,
        
        // 处理引用
        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-education-blue-400 pl-4 italic text-education-blue-700 my-4" {...props} />,
        
        // 处理水平线
        hr: ({ node, ...props }) => <hr className="my-6 border-education-blue-200" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
