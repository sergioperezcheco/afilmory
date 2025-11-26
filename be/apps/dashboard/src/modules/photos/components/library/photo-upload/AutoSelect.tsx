import { Button, Input } from '@afilmory/ui'
import { clsxm } from '@afilmory/utils'
import type { KeyboardEvent } from 'react'
import { useMemo, useState } from 'react'

type AutoSelectOption = {
  label: string
  value: string
}

type AutoSelectProps = {
  options: AutoSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function AutoSelect({ options, value, onChange, placeholder, disabled }: AutoSelectProps) {
  const [query, setQuery] = useState('')
  const normalizedValueSet = useMemo(() => new Set(value.map((item) => item.toLowerCase())), [value])
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = useMemo(() => {
    const available = options.filter((option) => !normalizedValueSet.has(option.value.toLowerCase()))
    if (!normalizedQuery) {
      return available.slice(0, 8)
    }
    return available.filter((option) => option.label.toLowerCase().includes(normalizedQuery)).slice(0, 8)
  }, [normalizedQuery, normalizedValueSet, options])

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || normalizedValueSet.has(trimmed.toLowerCase())) {
      return
    }
    onChange([...value, trimmed])
    setQuery('')
  }

  const handleRemove = (tag: string) => {
    onChange(value.filter((item) => item !== tag))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddTag(query)
    }
    if (event.key === 'Backspace' && !query && value.length > 0) {
      event.preventDefault()
      const last = value.at(-1)
      if (!last) {
        return
      }
      handleRemove(last)
    }
  }

  const showCreateOption = Boolean(normalizedQuery && !normalizedValueSet.has(normalizedQuery))

  return (
    <div className="space-y-3">
      <div
        className={clsxm(
          'bg-background px-3 rounded border-[0.5px] py-2 transition-opacity duration-200',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleRemove(tag)}
              className="bg-accent/10 text-accent hover:bg-accent/20 flex items-center gap-1 rounded px-2 py-0.5 text-[11px]"
            >
              {tag}
              <span className="text-sm opacity-80">×</span>
            </button>
          ))}
          <div className="min-w-40 flex-1">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="border-none px-1 py-0 text-xs focus:ring-0"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {(filteredOptions.length > 0 || showCreateOption) && !disabled ? (
        <div className="bg-background-tertiary/70 rounded px-3 py-2">
          <p className="text-text-tertiary mb-1 text-[11px]">选择或创建标签</p>
          <div className="flex flex-wrap gap-1">
            {filteredOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="xs"
                variant="ghost"
                className="border-border/40 text-text-secondary hover:text-text rounded-full border px-2 py-0.5 text-[11px]"
                onClick={() => handleAddTag(option.label)}
              >
                {option.label}
              </Button>
            ))}
            {showCreateOption ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="border-dashed border-border/50 text-accent rounded-full border px-2 py-0.5 text-[11px]"
                onClick={() => handleAddTag(query)}
              >
                创建“{query.trim()}”
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
