'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, ChevronDown, ChevronRight, Terminal, Key, Crown } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'

type SourceType = 'cli' | 'api' | 'admin'

interface SourceInfo {
  id: SourceType
  label: string
  description: string
  icon: React.ReactNode
}

const SOURCE_INFO: Record<SourceType, SourceInfo> = {
  cli: {
    id: 'cli',
    label: 'CLI Tools',
    description: 'Claude Code, Cline, and other CLI integrations',
    icon: <Terminal className="w-5 h-5 text-slate-900" />
  },
  api: {
    id: 'api',
    label: 'Your API Keys',
    description: 'API keys you have configured',
    icon: <Key className="w-5 h-5 text-slate-900" />
  },
  admin: {
    id: 'admin',
    label: 'Admin Provided (Perspectives)',
    description: 'Models provided by Polydev using your perspective quota',
    icon: <Crown className="w-5 h-5 text-slate-900" />
  }
}

export default function ModelSourcePriorityPicker() {
  const { preferences, updatePreferences } = usePreferences()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Filter out invalid source types (e.g., old 'credits' values) and ensure valid defaults
  const rawPriority = (preferences?.source_priority as any[]) || ['cli', 'api', 'admin']
  const currentPriority = rawPriority.filter((sourceId): sourceId is SourceType =>
    sourceId === 'cli' || sourceId === 'api' || sourceId === 'admin'
  )

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(currentPriority)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    try {
      setIsSaving(true)
      await updatePreferences({ source_priority: items })
    } catch (error) {
      console.error('Failed to update priority:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900">Model Source Priority</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Set the order for routing model requests (drag to reorder)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {currentPriority.slice(0, 2).map((sourceId, idx) => (
            <span key={sourceId} className="flex items-center gap-1">
              {idx > 0 && <span>→</span>}
              {SOURCE_INFO[sourceId].icon}
            </span>
          ))}
          {currentPriority.length > 2 && <span className="text-slate-400">+{currentPriority.length - 2}</span>}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-slate-100">
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-600 mb-4">
              When a model is available from multiple sources, Polydev will use the first available source in this order.
            </p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="priority-list">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-slate-50 rounded-lg p-2' : ''}`}
                  >
                    {currentPriority.map((sourceId, index) => (
                      <Draggable key={sourceId} draggableId={sourceId} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`
                              flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg
                              ${snapshot.isDragging ? 'shadow-lg ring-2 ring-slate-900' : 'hover:border-slate-300'}
                              transition-all cursor-move
                            `}
                          >
                            <GripVertical className="w-5 h-5 text-slate-400" />
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                              {index + 1}
                            </div>
                            {SOURCE_INFO[sourceId].icon}
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900">{SOURCE_INFO[sourceId].label}</h4>
                              <p className="text-sm text-slate-500">{SOURCE_INFO[sourceId].description}</p>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {isSaving && (
              <div className="mt-4 text-sm text-slate-900 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                Saving priority...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
