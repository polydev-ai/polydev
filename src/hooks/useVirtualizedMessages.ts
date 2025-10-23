/**
 * useVirtualizedMessages Hook
 * Efficient rendering of large message lists using virtualization
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: string | number;
}

interface UseVirtualizedMessagesOptions {
  items: any[];
  containerRef: React.RefObject<HTMLElement>;
  estimateSize: number | ((index: number) => number);
  overscan?: number;
  gap?: number;
}

export function useVirtualizedMessages({
  items,
  containerRef,
  estimateSize,
  overscan = 10,
  gap = 0,
}: UseVirtualizedMessagesOptions) {
  const [virtualItems, setVirtualItems] = useState<VirtualItem[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const scrollOffsetRef = useRef(0);
  const itemSizesRef = useRef<Map<number, number>>(new Map());

  const getEstimatedSize = useCallback(
    (index: number) => {
      if (typeof estimateSize === 'number') return estimateSize;
      return estimateSize(index);
    },
    [estimateSize]
  );

  const getItemSize = useCallback(
    (index: number) => {
      return itemSizesRef.current.get(index) || getEstimatedSize(index);
    },
    [getEstimatedSize]
  );

  const getOffsetForIndex = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemSize(i) + gap;
      }
      return offset;
    },
    [gap, getItemSize]
  );

  const getIndexForOffset = useCallback(
    (offset: number) => {
      let currentOffset = 0;
      for (let i = 0; i < items.length; i++) {
        const size = getItemSize(i);
        if (currentOffset + size > offset) {
          return i;
        }
        currentOffset += size + gap;
      }
      return Math.max(0, items.length - 1);
    },
    [items.length, gap, getItemSize]
  );

  // Calculate visible range
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      scrollOffsetRef.current = container.scrollTop;
      updateVirtualItems();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  const updateVirtualItems = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollOffset = container.scrollTop;
    const visibleHeight = container.clientHeight;

    const startIndex = Math.max(0, getIndexForOffset(scrollOffset) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      getIndexForOffset(scrollOffset + visibleHeight) + overscan
    );

    const newVirtualItems: VirtualItem[] = [];
    let totalHeight = 0;

    for (let i = 0; i < items.length; i++) {
      const size = getItemSize(i);
      totalHeight += size + (i > 0 ? gap : 0);

      if (i >= startIndex && i <= endIndex) {
        newVirtualItems.push({
          index: i,
          start: getOffsetForIndex(i),
          size,
          key: items[i].id || i,
        });
      }
    }

    setTotalSize(totalHeight);
    setVirtualItems(newVirtualItems);
  }, [
    containerRef,
    items,
    overscan,
    getIndexForOffset,
    getItemSize,
    getOffsetForIndex,
    gap,
  ]);

  // Initial render and items change
  useEffect(() => {
    updateVirtualItems();
  }, [items, updateVirtualItems]);

  const updateItemSize = useCallback(
    (index: number, size: number) => {
      itemSizesRef.current.set(index, size);
      updateVirtualItems();
    },
    [updateVirtualItems]
  );

  return {
    virtualItems,
    totalSize,
    updateItemSize,
  };
}
