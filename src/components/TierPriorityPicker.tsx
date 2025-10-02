'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, ChevronDown, ChevronRight, Sparkles, Zap, Leaf } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'

type TierType = 'premium' | 'normal' | 'eco'

interface TierInfo {
  id: TierType
  label: string
  description: string
  icon: React.ReactNode
}

const TIER_INFO: Record<TierType, TierInfo> = {
  premium: {
    id: 'premium',
    label: 'Premium',
    description: 'High-quality models with best performance',
    icon: <Sparkles className="w-5 h-5 text-purple-500" />
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    description: 'Balanced quality and cost models',
    icon: <Zap className="w-5 h-5 text-blue-500" />
  },
  eco: {
    id: 'eco',
    label: 'Eco',
    description: 'Cost-effective models for simple tasks',
    icon: <Leaf className="w-5 h-5 text-green-500" />
  }
}

export default function TierPriorityPicker() {
  const { preferences, updatePreferences } = usePreferences()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Get tier_priority from mcp_settings, default to ['normal', 'eco', 'premium']
  const currentPriority = ((preferences?.mcp_settings as any)?.tier_priority as TierType[]) ||
    ['normal', 'eco', 'premium']

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(currentPriority)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    try {
      setIsSaving(true)
      await updatePreferences({
        mcp_settings: {
          ...(preferences?.mcp_settings as any),
          tier_priority: items
        } as any
      })
    } catch (error) {
      console.error('Failed to update tier priority:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Tier Fallback Priority</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              When quota is exhausted, fallback to next tier (drag to reorder)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {currentPriority.slice(0, 2).map((tierId, idx) => (
            <span key={tierId} className="flex items-center gap-1">
              {idx > 0 && <span>→</span>}
              {TIER_INFO[tierId].icon}
            </span>
          ))}
          {currentPriority.length > 2 && <span className="text-gray-400">+{currentPriority.length - 2}</span>}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600 mb-4">
              When your quota for a tier is exhausted, Polydev will automatically fallback to the next tier in this order.
              This ensures uninterrupted service while optimizing costs.
            </p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tier-priority-list">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
                  >
                    {currentPriority.map((tierId, index) => (
                      <Draggable key={tierId} draggableId={tierId} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`
                              flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg
                              ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : 'hover:border-gray-300'}
                              transition-all cursor-move
                            `}
                          >
                            <GripVertical className="w-5 h-5 text-gray-400" />
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                              {index + 1}
                            </div>
                            {TIER_INFO[tierId].icon}
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{TIER_INFO[tierId].label}</h4>
                              <p className="text-sm text-gray-500">{TIER_INFO[tierId].description}</p>
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
              <div className="mt-4 text-sm text-blue-600 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Saving priority...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
