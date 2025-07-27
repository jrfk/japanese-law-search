"use client"

import * as React from "react"
import { useChatStore } from '@/store/chat-store'
import { LAW_CATEGORIES, ERAS } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export function SearchFilters() {
  const { filters, setFilters } = useChatStore();

  const handleCategoryChange = (value: string) => {
    setFilters({
      ...filters,
      category: value === 'all' ? undefined : value,
    });
  };

  const handleEraChange = (value: string) => {
    setFilters({
      ...filters,
      era: value === 'all' ? undefined : value,
    });
  };

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-3">
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="category-filter" className="text-xs">カテゴリ</Label>
            <Select 
              value={filters.category || 'all'} 
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(LAW_CATEGORIES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="era-filter" className="text-xs">時代</Label>
            <Select 
              value={filters.era || 'all'} 
              onValueChange={handleEraChange}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="すべて" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(ERAS).map(([key, name]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}