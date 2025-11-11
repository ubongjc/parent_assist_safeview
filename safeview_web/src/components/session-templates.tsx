'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SESSION_TEMPLATES, getCategories, getCategoryName, type SessionTemplate } from '@/lib/templates'

interface SessionTemplatesProps {
  onSelectTemplate: (template: SessionTemplate, contactId: string) => void
  contactId: string
  contactName: string
}

export function SessionTemplates({ onSelectTemplate, contactId, contactName }: SessionTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const categories = getCategories()

  const templates = selectedCategory
    ? SESSION_TEMPLATES.filter((t) => t.category === selectedCategory)
    : SESSION_TEMPLATES

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold mb-2">
          Start a session with {contactName}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Choose a template or start a custom session
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          onClick={() => setSelectedCategory(null)}
          size="sm"
        >
          All Templates
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(category)}
            size="sm"
          >
            {getCategoryName(category)}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
            onClick={() => onSelectTemplate(template, contactId)}
          >
            <CardHeader>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${template.color} mb-4 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300`}>
                {template.icon}
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ⏱️ {template.duration} min
                </span>
                <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  Start →
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Compact template selector for quick actions
export function QuickTemplateSelect({
  onSelect,
  className,
}: {
  onSelect: (template: SessionTemplate) => void
  className?: string
}) {
  const popularTemplates = SESSION_TEMPLATES.slice(0, 6)

  return (
    <div className={className}>
      <h4 className="text-sm font-semibold mb-3">Quick Start</h4>
      <div className="grid grid-cols-2 gap-2">
        {popularTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <span className="text-2xl">{template.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{template.name}</div>
              <div className="text-xs text-gray-500">{template.duration} min</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
