import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ContextSource } from '@/types'

interface MarkdownRendererProps {
  content: string
  sources?: ContextSource[]
  onCitationClick?: (source: ContextSource, index: number) => void
}

const CITATION_REGEX = /\[(\d+)\]/g

function CitationBadge({
  index,
  source,
  onClick,
}: {
  index: number
  source: ContextSource
  onClick?: (source: ContextSource, index: number) => void
}) {
  const isWeb = source.type === 'WEB_SEARCH'
  const hasTarget = isWeb ? !!source.url : !!source.docId
  const handle = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!hasTarget) return
    if (onClick) {
      onClick(source, index)
      return
    }
    if (isWeb && source.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer')
    }
  }
  const title = isWeb
    ? source.title || source.url || `引用 ${index}`
    : source.docName || `引用 ${index}`
  const interactive = hasTarget
    ? 'cursor-pointer bg-education-blue-100 text-education-blue-700 hover:bg-education-blue-200 hover:text-education-blue-900'
    : 'cursor-default bg-education-blue-50 text-education-blue-400'
  return (
    <button
      type="button"
      onClick={handle}
      disabled={!hasTarget}
      title={title}
      className={`mx-0.5 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold align-super transition-colors ${interactive}`}
    >
      [{index}]
    </button>
  )
}

function splitTextWithCitations(
  text: string,
  sources: ContextSource[],
  onCitationClick?: (source: ContextSource, index: number) => void,
  keyPrefix = 'c',
): React.ReactNode {
  if (!text || !CITATION_REGEX.test(text)) {
    CITATION_REGEX.lastIndex = 0
    return text
  }
  CITATION_REGEX.lastIndex = 0
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CITATION_REGEX.exec(text)) !== null) {
    const num = parseInt(match[1], 10)
    const idx = num - 1
    if (idx < 0 || idx >= sources.length) continue
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <CitationBadge
        key={`${keyPrefix}-${match.index}-${num}`}
        index={num}
        source={sources[idx]}
        onClick={onCitationClick}
      />,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts.length > 0 ? <>{parts}</> : text
}

function processChildrenForCitations(
  children: React.ReactNode,
  sources: ContextSource[],
  onCitationClick?: (source: ContextSource, index: number) => void,
): React.ReactNode {
  return React.Children.map(children, (child, i) => {
    if (typeof child === 'string') {
      return splitTextWithCitations(child, sources, onCitationClick, `c${i}`)
    }
    if (React.isValidElement(child)) {
      const element = child as React.ReactElement<any>
      if (element.type === 'code' || element.type === 'pre') {
        return child
      }
      const nestedChildren = element.props?.children
      if (nestedChildren == null) return child
      return React.cloneElement(
        element,
        element.props,
        processChildrenForCitations(nestedChildren, sources, onCitationClick),
      )
    }
    return child
  })
}

export function MarkdownRenderer({ content, sources, onCitationClick }: MarkdownRendererProps) {
  const decorate = (children: React.ReactNode) => {
    if (!sources || sources.length === 0) return children
    return processChildrenForCitations(children, sources, onCitationClick)
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node, children, ...props }) => (
          <h1 className="text-2xl font-bold text-education-blue-900 mt-6 mb-4" {...props}>
            {decorate(children)}
          </h1>
        ),
        h2: ({ node, children, ...props }) => (
          <h2 className="text-xl font-semibold text-education-blue-900 mt-5 mb-3" {...props}>
            {decorate(children)}
          </h2>
        ),
        h3: ({ node, children, ...props }) => (
          <h3 className="text-lg font-semibold text-education-blue-900 mt-4 mb-2" {...props}>
            {decorate(children)}
          </h3>
        ),
        h4: ({ node, children, ...props }) => (
          <h4 className="text-base font-semibold text-education-blue-900 mt-3 mb-2" {...props}>
            {decorate(children)}
          </h4>
        ),

        p: ({ node, children, ...props }) => (
          <p className="leading-relaxed text-education-blue-900 mb-3" {...props}>
            {decorate(children)}
          </p>
        ),

        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 mb-3" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1 mb-3" {...props} />,
        li: ({ node, children, ...props }) => (
          <li className="leading-relaxed text-education-blue-900" {...props}>
            {decorate(children)}
          </li>
        ),

        a: ({ node, ...props }) => (
          <a className="text-education-blue-600 hover:text-education-blue-800 underline" {...props} />
        ),

        code: ({ node, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')
          return match ? (
            <pre className="bg-slate-800 text-slate-100 p-4 rounded-lg overflow-x-auto mb-4">
              <code className="font-mono text-sm">{children}</code>
            </pre>
          ) : (
            <code
              className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          )
        },

        strong: ({ node, children, ...props }) => (
          <strong className="font-bold text-education-blue-900" {...props}>
            {decorate(children)}
          </strong>
        ),
        em: ({ node, children, ...props }) => (
          <em className="italic text-education-blue-900" {...props}>
            {decorate(children)}
          </em>
        ),

        blockquote: ({ node, children, ...props }) => (
          <blockquote
            className="border-l-4 border-education-blue-400 pl-4 italic text-education-blue-700 my-4"
            {...props}
          >
            {decorate(children)}
          </blockquote>
        ),

        hr: ({ node, ...props }) => <hr className="my-6 border-education-blue-200" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
